import { PhotoRecord } from './db';
import { Photo, DuplicateGroup } from '../types';
import { SystemAPI } from './systemApi';

/**
 * Phase 44.1: Enhanced Library Indexing Engine.
 * Resolves "Duplicate Key" issues by implementing a deterministic UUID derivation strategy
 * and centralized asset state management.
 */
export class PhotoLibraryManager {
  private static instance: PhotoLibraryManager;
  private memoryIndex: Map<string, PhotoRecord> = new Map();
  private duplicateGroups: DuplicateGroup[] = [];
  private blobRegistry: Map<string, string> = new Map(); // path -> blobUrl
  
  private constructor() {}
  
  public static getInstance(): PhotoLibraryManager {
    if (!PhotoLibraryManager.instance) {
      PhotoLibraryManager.instance = new PhotoLibraryManager();
    }
    return PhotoLibraryManager.instance;
  }

  /**
   * Generates a stable, collision-resistant ID for an asset.
   * Uses path + size + mtime as a seed for a fast deterministic hash.
   */
  public generateAssetKey(path: string, size: number, mtime: number): string {
    const seed = `${path}_${size}_${mtime}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `asset_${Math.abs(hash).toString(16)}_${mtime}`;
  }

  /**
   * Synchronizes a list of scanned assets into the local memory index.
   * Detects and prevents duplicate keys by performing a "pre-flight" check.
   */
  public syncAssets(scannedFiles: Partial<PhotoRecord>[]): PhotoRecord[] {
    const reconciled: PhotoRecord[] = [];
    
    scannedFiles.forEach(file => {
      if (!file.path) return;
      
      const key = this.generateAssetKey(
        file.path, 
        file.size || 0, 
        file.lastModified || Date.now()
      );
      
      // Prevent collisions: If the key already exists, append a salt if it's a different file path
      let uniqueKey = key;
      let salt = 0;
      while (this.memoryIndex.has(uniqueKey) && this.memoryIndex.get(uniqueKey)?.path !== file.path) {
        uniqueKey = `${key}_${++salt}`;
      }

      const photo: PhotoRecord = {
        originalId: file.originalId || uniqueKey,
        path: file.path,
        size: file.size || 0,
        lastModified: file.lastModified || Date.now(),
        status: file.status || 'pending',
        type: file.type || 'image/jpeg',
        ...file
      };
      
      this.memoryIndex.set(uniqueKey, photo);
      reconciled.push(photo);
    });
    
    return reconciled;
  }

  /**
   * Refined 4-Criteria Deduplication Engine (날짜, 시간, 용량, 이미지/영상 유사성).
   * Groups both photos and videos based on:
   * 1. Date (Taken & Modified date)
   * 2. Time (Timestamp windows and burst sessions)
   * 3. Size (Exact byte capacity matching)
   * 4. Similarity (Visual pHash Hamming distance & Video specs)
   */
  public findDuplicates(photos: PhotoRecord[], threshold: number = 5): DuplicateGroup[] {
    const validMedia = photos.filter(p => p.size > 0 && !p.isDeleted && p.isDeleted !== 1);
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<any>();

    // Criterion 3 & 1: Exact Matches by Size + Date/Time window (or MD5)
    const exactMap = new Map<string, PhotoRecord[]>();
    validMedia.forEach(photo => {
      const timeBucket = Math.floor((photo.dateTaken || photo.lastModified || 0) / 2000);
      const key = photo.md5 
        ? `md5_${photo.md5}` 
        : `size_${photo.size}_time_${timeBucket}`;
      const group = exactMap.get(key) || [];
      group.push(photo);
      exactMap.set(key, group);
    });

    exactMap.forEach((groupPhotos, key) => {
      if (groupPhotos.length > 1) {
        groupPhotos.forEach(p => processedIds.add(p.id || p.originalId));
        groups.push({
          id: `exact_${key}`,
          type: 'exact',
          photos: groupPhotos as any,
          redundantSize: groupPhotos.slice(1).reduce((sum, p) => sum + p.size, 0),
          confidence: 1.0
        });
      }
    });

    // Fast Hamming Distance helper optimized for performance
    const calculateHamming = (h1: string, h2: string): number => {
      if (h1 === h2) return 0;
      if (!h1 || !h2) return 64;
      if (h1.length === 16 && h2.length === 16) {
        try {
          let xor = BigInt('0x' + h1) ^ BigInt('0x' + h2);
          let distance = 0;
          while (xor > 0n) {
            if (xor & 1n) distance++;
            xor >>= 1n;
          }
          return distance;
        } catch {}
      }
      let distance = 0;
      const len = Math.min(h1.length, h2.length);
      for (let i = 0; i < len; i++) {
        if (h1.charCodeAt(i) !== h2.charCodeAt(i)) distance++;
      }
      distance += Math.abs(h1.length - h2.length) * 4;
      return distance;
    };

    // Sort valid media by time for fast sliding temporal window
    const sortedMedia = [...validMedia].sort((a, b) => {
      const ta = a.dateTaken || a.lastModified || 0;
      const tb = b.dateTaken || b.lastModified || 0;
      return ta - tb;
    });

    // Build pHash index chunks (16-bit chunks) for fast candidate lookup
    const pHashIndex = new Map<string, PhotoRecord[]>();
    sortedMedia.forEach(p => {
      if (p.pHash && p.pHash.length >= 8) {
        if (p.pHash.length === 16) {
          const c0 = `c0_${p.pHash.substring(0, 4)}`;
          const c1 = `c1_${p.pHash.substring(4, 8)}`;
          const c2 = `c2_${p.pHash.substring(8, 12)}`;
          const c3 = `c3_${p.pHash.substring(12, 16)}`;
          for (const key of [c0, c1, c2, c3]) {
            const list = pHashIndex.get(key) || [];
            list.push(p);
            pHashIndex.set(key, list);
          }
        } else {
          const key = `prefix_${p.pHash.substring(0, 6)}`;
          const list = pHashIndex.get(key) || [];
          list.push(p);
          pHashIndex.set(key, list);
        }
      }
    });

    // Criterion 4, 1, 2, 3: Similar Matches across BOTH Photos & Videos
    for (let i = 0; i < sortedMedia.length; i++) {
      const current = sortedMedia[i];
      const currentId = current.id || current.originalId;
      if (processedIds.has(currentId)) continue;

      const isVideo = current.type?.startsWith('video/') || false;
      const currentTime = current.dateTaken || current.lastModified || 0;

      // Gather candidate targets (Temporal + pHash buckets)
      const candidateMap = new Map<any, PhotoRecord>();

      // 1. Temporal candidates (up to 1 hour window)
      for (let j = i + 1; j < sortedMedia.length; j++) {
        const target = sortedMedia[j];
        const targetTime = target.dateTaken || target.lastModified || 0;
        if (targetTime - currentTime > 3600000) break; // Beyond 1 hour
        const targetId = target.id || target.originalId;
        if (!processedIds.has(targetId) && targetId !== currentId) {
          candidateMap.set(targetId, target);
        }
      }

      // 2. pHash bucket candidates
      if (current.pHash && current.pHash.length >= 8) {
        if (current.pHash.length === 16) {
          const keys = [
            `c0_${current.pHash.substring(0, 4)}`,
            `c1_${current.pHash.substring(4, 8)}`,
            `c2_${current.pHash.substring(8, 12)}`,
            `c3_${current.pHash.substring(12, 16)}`
          ];
          for (const key of keys) {
            const bucket = pHashIndex.get(key);
            if (bucket) {
              for (const target of bucket) {
                const targetId = target.id || target.originalId;
                if (!processedIds.has(targetId) && targetId !== currentId) {
                  candidateMap.set(targetId, target);
                }
              }
            }
          }
        } else {
          const bucket = pHashIndex.get(`prefix_${current.pHash.substring(0, 6)}`);
          if (bucket) {
            for (const target of bucket) {
              const targetId = target.id || target.originalId;
              if (!processedIds.has(targetId) && targetId !== currentId) {
                candidateMap.set(targetId, target);
              }
            }
          }
        }
      }

      if (candidateMap.size === 0) continue;

      const groupMembers: PhotoRecord[] = [current];
      let maxConfidence = 0.85;

      for (const target of candidateMap.values()) {
        const targetId = target.id || target.originalId;
        if (processedIds.has(targetId)) continue;

        const targetIsVideo = target.type?.startsWith('video/') || false;
        if (isVideo !== targetIsVideo) continue;

        const targetTime = target.dateTaken || target.lastModified || 0;
        const timeDiff = Math.abs(currentTime - targetTime);
        const sizeRatio = Math.min(current.size, target.size) / Math.max(current.size, target.size);

        let isSimilar = false;
        let subConf = 0.85;

        // Visual / Video Similarity (pHash)
        if (current.pHash && target.pHash) {
          const distance = calculateHamming(current.pHash, target.pHash);
          const maxDist = isVideo ? 10 : threshold;
          if (distance <= maxDist) {
            isSimilar = true;
            subConf = Math.max(0, Math.min(1.0, (64 - distance) / 64));
          }
        }

        // For Videos: match by duration + time window or size similarity
        if (isVideo && current.durationMs && target.durationMs) {
          const durationDiff = Math.abs(current.durationMs - target.durationMs);
          if (durationDiff < 400 && (sizeRatio > 0.6 || timeDiff <= 3600000)) {
            isSimilar = true;
            subConf = Math.max(subConf, 0.92);
          }
        }

        // For Photos: temporal burst / close date-time capture with same dimensions
        if (!isVideo && timeDiff <= 3000 && timeDiff > 0) {
          if (current.width && current.width === target.width && current.height === target.height) {
            isSimilar = true;
            subConf = Math.max(subConf, 0.88);
          }
        }

        if (isSimilar) {
          groupMembers.push(target);
          processedIds.add(targetId);
          maxConfidence = Math.max(maxConfidence, subConf);
        }
      }

      if (groupMembers.length > 1) {
        processedIds.add(currentId);
        groups.push({
          id: `similar_${current.pHash || currentId}`,
          type: 'similar',
          photos: groupMembers as any,
          redundantSize: groupMembers.slice(1).reduce((sum, p) => sum + p.size, 0),
          confidence: maxConfidence
        });
      }
    }

    this.duplicateGroups = groups;
    return groups;
  }

  public getIndexSize(): number {
    return this.memoryIndex.size;
  }

  /**
   * Centralized Blob URL Provider.
   * Ensures one unique URL per path, preventing multiple revocations/leaks.
   */
  public getBlobUrl(path: string, factory: () => string): string {
    if (this.blobRegistry.has(path)) {
      return this.blobRegistry.get(path)!;
    }
    const url = factory();
    this.blobRegistry.set(path, url);
    return url;
  }

  public revokeBlobUrl(path: string): void {
    const url = this.blobRegistry.get(path);
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      this.blobRegistry.delete(path);
    }
  }

  public clearBlobRegistry(): void {
    this.blobRegistry.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    this.blobRegistry.clear();
  }

  public clearIndex(): void {
    this.memoryIndex.clear();
    this.duplicateGroups = [];
  }
}

export const libraryManager = PhotoLibraryManager.getInstance();
