import { PhotoRecord } from './db';
import { Photo, DuplicateGroup } from '../types';
import { SystemAPI } from './systemApi';
import { DedupeEngine } from './dedupeEngine';

export type DedupeRule = 'sharpest' | 'largest' | 'newest' | 'oldest' | 'highest_res' | 'rich_exif' | 'priority_folder';

export interface DedupeOptions {
  matchExactBytes: boolean;        // 100% exact byte/hash match
  matchVisualSimilarity: boolean;  // Visual pHash similarity
  matchTemporalBurst: boolean;     // Sequential shots taken within burst window
  matchResizedCopies: boolean;     // Resized/converted copies (differing resolution/format)
  matchFilenamePatterns: boolean;  // Name copy suffixes like " (1)", "_copy", "- 복사본"
  matchCrossFolder: boolean;       // Enable cross-folder detection

  visualThreshold: number;         // 2 (ultra strict: 97%), 4 (strict: 94%), 6 (balanced: 90%), 10 (loose: 84%)
  burstWindowMs: number;           // 2000 (2s), 5000 (5s), 30000 (30s), 300000 (5m), 3600000 (1h), -1 (unlimited)
  folderScope: 'all' | 'cross_folder' | 'same_folder';
  mediaType: 'all' | 'photos' | 'videos';
  autoResolveRule: DedupeRule;
  priorityFolder?: string;
}

export const DEFAULT_DEDUPE_OPTIONS: DedupeOptions = {
  matchExactBytes: true,
  matchVisualSimilarity: true,
  matchTemporalBurst: true,
  matchResizedCopies: true,
  matchFilenamePatterns: true,
  matchCrossFolder: true,
  visualThreshold: 6,
  burstWindowMs: 30000,
  folderScope: 'all',
  mediaType: 'all',
  autoResolveRule: 'sharpest',
  priorityFolder: '',
};

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
   * Advanced Multi-Criteria Deduplication Engine.
   * Supports:
   * 1. Exact Byte & Hash (MD5, Sparse Chunk Hash, Size + timestamp)
   * 2. Perceptual Visual Similarity (pHash / Hamming distance with adjustable sensitivity)
   * 3. Temporal Burst & Sequence Windows (2s, 10s, 30s, 5m, 1h, unlimited)
   * 4. Resized & Converted Copies Detection (Resolution-independent visual matches)
   * 5. Filename Copy Pattern Recognition ("IMG (1).jpg", "IMG - 복사본.jpg", etc.)
   * 6. Folder Scope Filtering (Cross-folder only, same-folder only, or all)
   * 7. Media Type Filtering (All, Photos only, Videos only)
   * 8. Smart Auto-Resolve Preservation (Sharpness, Largest, Highest Res, Newest, Oldest, Rich EXIF, Priority Folder)
   */
  public findDuplicates(
    photos: PhotoRecord[],
    thresholdOrOptions: number | Partial<DedupeOptions> = 5
  ): DuplicateGroup[] {
    const opts: DedupeOptions = typeof thresholdOrOptions === 'number'
      ? { ...DEFAULT_DEDUPE_OPTIONS, visualThreshold: thresholdOrOptions }
      : { ...DEFAULT_DEDUPE_OPTIONS, ...thresholdOrOptions };

    // 1. Initial Filtering by Media Type and validity
    let validMedia = photos.filter(p => (p.size || 0) > 0 && !p.isDeleted && p.isDeleted !== 1 && !p.isPrivate);

    if (opts.mediaType === 'photos') {
      validMedia = validMedia.filter(p => !p.type?.startsWith('video/'));
    } else if (opts.mediaType === 'videos') {
      validMedia = validMedia.filter(p => p.type?.startsWith('video/'));
    }

    if (validMedia.length === 0) return [];

    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<any>();

    const getDir = (filePath?: string): string => {
      if (!filePath) return '/';
      const norm = filePath.replace(/\\/g, '/');
      const idx = norm.lastIndexOf('/');
      return idx === -1 ? '/' : norm.substring(0, idx);
    };

    const normalizeBaseName = (filePath?: string): string => {
      if (!filePath) return '';
      const norm = filePath.replace(/\\/g, '/');
      const fileName = norm.split('/').pop() || '';
      const withoutExt = fileName.replace(/\.[^/.]+$/, '');
      return withoutExt
        .replace(/\s*\(\d+\)$/i, '')
        .replace(/\s*-\s*(copy|복사본|복사)(\s*\(\d+\))?$/i, '')
        .replace(/_copy(\d+)?$/i, '')
        .replace(/_\d+$/i, '')
        .trim()
        .toLowerCase();
    };

    // Fast Hamming Distance helper optimized with BigInt XOR
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

    // Helper to evaluate folder scope
    const matchesFolderScope = (mediaList: PhotoRecord[]): boolean => {
      if (opts.folderScope === 'all') return true;
      const dirs = new Set(mediaList.map(p => getDir(p.path)));
      if (opts.folderScope === 'cross_folder') {
        return dirs.size > 1; // Must span across 2 or more distinct directories
      }
      if (opts.folderScope === 'same_folder') {
        return dirs.size === 1; // Must be inside the exact same folder
      }
      return true;
    };

    // Helper to compute redundant bytes
    const finalizeGroup = (
      id: string,
      type: 'exact' | 'similar',
      members: PhotoRecord[],
      subType: 'exact_byte' | 'visual_similar' | 'burst' | 'resized' | 'cross_folder' | 'filename_copy',
      confidence: number,
      reasons: string[],
      matchDetails?: any
    ) => {
      const best = DedupeEngine.getBestPhoto(members, opts.autoResolveRule, opts.priorityFolder);
      const redundantSize = members
        .filter(p => (p.id || p.originalId) !== (best.id || best.originalId))
        .reduce((sum, p) => sum + (p.size || 0), 0);

      const dirs = new Set(members.map(p => getDir(p.path)));
      if (dirs.size > 1 && !reasons.includes('cross_folder')) {
        reasons.push('cross_folder');
      }

      groups.push({
        id,
        type,
        photos: members as any,
        redundantSize,
        confidence,
        reasons,
        subType,
        similarityPercent: Math.round(confidence * 100),
        matchDetails: {
          crossFolder: dirs.size > 1,
          ...matchDetails
        }
      });
    };

    // =========================================================
    // STAGE 1: Exact Matches by Size & MD5 / Sparse Chunk Hash
    // =========================================================
    if (opts.matchExactBytes) {
      const exactMap = new Map<string, PhotoRecord[]>();
      validMedia.forEach(photo => {
        // MD5 has highest authority; else sparseHash; else exact byte size + tight 2s timestamp
        const timeBucket = Math.floor((photo.dateTaken || photo.lastModified || 0) / 2000);
        const key = photo.md5
          ? `md5_${photo.md5}`
          : photo.sparseHash
            ? `sparse_${photo.sparseHash}`
            : `size_${photo.size}_time_${timeBucket}`;
        const group = exactMap.get(key) || [];
        group.push(photo);
        exactMap.set(key, group);
      });

      exactMap.forEach((groupPhotos, key) => {
        if (groupPhotos.length > 1) {
          if (!matchesFolderScope(groupPhotos)) return;

          groupPhotos.forEach(p => processedIds.add(p.id || p.originalId));
          finalizeGroup(
            `exact_${key}`,
            'exact',
            groupPhotos,
            'exact_byte',
            1.0,
            ['exact', 'byte_match'],
            { sizeMatch: true, hashMatch: true }
          );
        }
      });
    }

    // =========================================================
    // STAGE 2: Filename Copy Pattern Match (e.g. IMG (1).jpg)
    // =========================================================
    if (opts.matchFilenamePatterns) {
      const nameMap = new Map<string, PhotoRecord[]>();
      validMedia.forEach(photo => {
        const pId = photo.id || photo.originalId;
        if (processedIds.has(pId)) return;

        const base = normalizeBaseName(photo.path);
        if (base && base.length >= 3) {
          const list = nameMap.get(base) || [];
          list.push(photo);
          nameMap.set(base, list);
        }
      });

      nameMap.forEach((matched, baseName) => {
        if (matched.length > 1) {
          // Verify if they are indeed duplicates: either size ratio >= 0.90 or pHash distance <= 8
          const verifiedMembers: PhotoRecord[] = [matched[0]];
          for (let k = 1; k < matched.length; k++) {
            const candidate = matched[k];
            const sizeRatio = Math.min(matched[0].size, candidate.size) / Math.max(matched[0].size, candidate.size);
            let verified = sizeRatio >= 0.90;
            if (!verified && matched[0].pHash && candidate.pHash) {
              const dist = calculateHamming(matched[0].pHash, candidate.pHash);
              if (dist <= 8) verified = true;
            }
            if (verified) verifiedMembers.push(candidate);
          }

          if (verifiedMembers.length > 1 && matchesFolderScope(verifiedMembers)) {
            verifiedMembers.forEach(p => processedIds.add(p.id || p.originalId));
            finalizeGroup(
              `filename_${baseName}_${verifiedMembers.map(p => p.id || p.originalId).slice(0, 3).join('_')}`,
              'similar',
              verifiedMembers,
              'filename_copy',
              0.98,
              ['filename_copy_pattern', 'similar'],
              { namePatternMatch: true }
            );
          }
        }
      });
    }

    // Sort remaining media by time for fast temporal window sliding
    const sortedMedia = [...validMedia]
      .filter(p => !processedIds.has(p.id || p.originalId))
      .sort((a, b) => {
        const ta = a.dateTaken || a.lastModified || 0;
        const tb = b.dateTaken || b.lastModified || 0;
        return ta - tb;
      });

    // Build pHash index chunks for fast candidate lookup
    const pHashIndex = new Map<string, PhotoRecord[]>();
    sortedMedia.forEach(p => {
      if (p.pHash && p.pHash.length >= 8) {
        if (p.pHash.length === 16) {
          const c0 = `c0_${p.pHash.substring(0, 4)}`;
          const c1 = `c1_${p.pHash.substring(4, 8)}`;
          const c2 = `c2_${p.pHash.substring(8, 12)}`;
          const c3 = `c3_${p.pHash.substring(12, 16)}`;
          for (const k of [c0, c1, c2, c3]) {
            const list = pHashIndex.get(k) || [];
            list.push(p);
            pHashIndex.set(k, list);
          }
        } else {
          const k = `prefix_${p.pHash.substring(0, 6)}`;
          const list = pHashIndex.get(k) || [];
          list.push(p);
          pHashIndex.set(k, list);
        }
      }
    });

    // =========================================================
    // STAGE 3: Visual Similarity, Resized Variants & Burst Shots
    // =========================================================
    for (let i = 0; i < sortedMedia.length; i++) {
      const current = sortedMedia[i];
      const currentId = current.id || current.originalId;
      if (processedIds.has(currentId)) continue;

      const isVideo = current.type?.startsWith('video/') || false;
      const currentTime = current.dateTaken || current.lastModified || 0;

      const candidateMap = new Map<any, PhotoRecord>();

      // 1. Sliding temporal window candidates
      const maxWindowMs = opts.burstWindowMs === -1 ? Infinity : Math.max(opts.burstWindowMs, 60000);
      for (let j = i + 1; j < sortedMedia.length; j++) {
        const target = sortedMedia[j];
        const targetTime = target.dateTaken || target.lastModified || 0;
        if (maxWindowMs !== Infinity && (targetTime - currentTime > maxWindowMs)) break;
        const targetId = target.id || target.originalId;
        if (!processedIds.has(targetId) && targetId !== currentId) {
          candidateMap.set(targetId, target);
        }
      }

      // 2. Global pHash bucket candidates (allows finding visual duplicates across wide time ranges)
      if (opts.matchVisualSimilarity && current.pHash && current.pHash.length >= 8) {
        const keys = current.pHash.length === 16
          ? [
              `c0_${current.pHash.substring(0, 4)}`,
              `c1_${current.pHash.substring(4, 8)}`,
              `c2_${current.pHash.substring(8, 12)}`,
              `c3_${current.pHash.substring(12, 16)}`
            ]
          : [`prefix_${current.pHash.substring(0, 6)}`];

        for (const k of keys) {
          const bucket = pHashIndex.get(k);
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
      let matchedSubType: 'visual_similar' | 'burst' | 'resized' = 'visual_similar';
      const reasons = new Set<string>();
      let maxBurstInterval = 0;
      let hasResolutionDiff = false;

      for (const target of candidateMap.values()) {
        const targetId = target.id || target.originalId;
        if (processedIds.has(targetId)) continue;

        const targetIsVideo = target.type?.startsWith('video/') || false;
        if (isVideo !== targetIsVideo) continue;

        const targetTime = target.dateTaken || target.lastModified || 0;
        const timeDiff = Math.abs(currentTime - targetTime);
        const sizeRatio = Math.min(current.size, target.size) / Math.max(current.size, target.size);

        let isMatch = false;
        let subConfidence = 0.85;

        // Visual pHash Matching
        if (opts.matchVisualSimilarity && current.pHash && target.pHash) {
          const distance = calculateHamming(current.pHash, target.pHash);
          const maxDist = isVideo ? Math.min(opts.visualThreshold + 4, 12) : opts.visualThreshold;
          if (distance <= maxDist) {
            isMatch = true;
            subConfidence = Math.max(0, Math.min(1.0, (64 - distance) / 64));
            reasons.add('visual_similarity');

            // Check if this is a Resized or Format-Converted Variant
            if (opts.matchResizedCopies) {
              const currentRes = (current.width || 0) * (current.height || 0);
              const targetRes = (target.width || 0) * (target.height || 0);
              const isDifferentResolution = currentRes > 0 && targetRes > 0 && currentRes !== targetRes;
              const isDifferentFormat = current.type !== target.type;

              if (isDifferentResolution || isDifferentFormat) {
                matchedSubType = 'resized';
                reasons.add('resized_variant');
                hasResolutionDiff = true;
              }
            }
          }
        }

        // Video Duplicate Matching (Duration + Resolution + Size Ratio)
        if (isVideo && current.durationMs && target.durationMs) {
          const durationDiff = Math.abs(current.durationMs - target.durationMs);
          if (durationDiff < 500 && (sizeRatio > 0.6 || timeDiff <= 3600000)) {
            isMatch = true;
            subConfidence = Math.max(subConfidence, 0.94);
            reasons.add('video_match');
          }
        }

        // Temporal Burst Sequence Matching
        if (opts.matchTemporalBurst && !isVideo && timeDiff > 0) {
          const burstThresholdMs = opts.burstWindowMs === -1 ? 5000 : opts.burstWindowMs;
          if (timeDiff <= burstThresholdMs) {
            // Check if captured with same camera or resolution or similar pHash
            const sameCamera = current.cameraModel && current.cameraModel === target.cameraModel;
            const sameDimensions = current.width && current.width === target.width && current.height === target.height;
            const dist = (current.pHash && target.pHash) ? calculateHamming(current.pHash, target.pHash) : 99;

            if (dist <= opts.visualThreshold + 4 || sameCamera || sameDimensions) {
              isMatch = true;
              subConfidence = Math.max(subConfidence, 0.90);
              if (matchedSubType !== 'resized') {
                matchedSubType = 'burst';
              }
              reasons.add('burst_sequence');
              maxBurstInterval = Math.max(maxBurstInterval, timeDiff);
            }
          }
        }

        if (isMatch) {
          groupMembers.push(target);
          processedIds.add(targetId);
          maxConfidence = Math.max(maxConfidence, subConfidence);
        }
      }

      if (groupMembers.length > 1) {
        if (!matchesFolderScope(groupMembers)) continue;

        processedIds.add(currentId);
        finalizeGroup(
          `${matchedSubType}_${current.pHash || currentId}_${groupMembers.length}`,
          'similar',
          groupMembers,
          matchedSubType,
          maxConfidence,
          Array.from(reasons),
          {
            burstIntervalMs: maxBurstInterval > 0 ? maxBurstInterval : undefined,
            resolutionDifferent: hasResolutionDiff
          }
        );
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
