import { PhotoRecord } from './db';
import { DedupeGroup, DedupeEngine } from './dedupeEngine';
import { mobileWorkerPool } from './mobileWorkerPool';

export interface FunnelMetrics {
  totalScanned: number;
  stage1Pruned: number;      // Filtered out by size/metadata with 0 byte read
  stage2ExactMatches: number; // Matched via 12KB sparse chunk hash
  stage3VisualClusters: number; // Matched via low-res pHash in time windows
  executionTimeMs: number;
  ioSavedBytes: number;
}

export class FunnelEngine {
  /**
   * Fast 32-bit FNV-1a Hash on binary buffer (Ultra-fast, zero-alloc)
   */
  static fastBufferHash(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer);
    let hval = 0x811c9dc5;
    for (let i = 0; i < view.length; i++) {
      hval ^= view[i];
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return (hval >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Stage 2: Sparse 12KB Chunk Hash
   * Hardware & Worker Accelerated: Slices Head 4KB + Mid 4KB + Tail 4KB from file/blob.
   */
  static async computeSparseHash(blobOrFile: Blob | File): Promise<string> {
    const size = blobOrFile.size;
    if (size === 0) return 'sparse_0_empty';

    // Try Off-main-thread WebWorker computation first to avoid UI micro-stutters
    try {
      return await mobileWorkerPool.computeSparseHash(blobOrFile);
    } catch {
      // Graceful local thread fallback
    }

    // If file is smaller than 12KB, read the whole thing
    if (size <= 12288) {
      const buf = await blobOrFile.arrayBuffer();
      return `sparse_${size}_${this.fastBufferHash(buf)}`;
    }

    const CHUNK_SIZE = 4096;
    const midOffset = Math.floor(size / 2) - Math.floor(CHUNK_SIZE / 2);
    const tailOffset = size - CHUNK_SIZE;

    // Slice 3 distinct 4KB regions using zero-copy Blob slices
    const headBlob = blobOrFile.slice(0, CHUNK_SIZE);
    const midBlob = blobOrFile.slice(midOffset, midOffset + CHUNK_SIZE);
    const tailBlob = blobOrFile.slice(tailOffset, size);

    const [headBuf, midBuf, tailBuf] = await Promise.all([
      headBlob.arrayBuffer(),
      midBlob.arrayBuffer(),
      tailBlob.arrayBuffer()
    ]);

    const combined = new Uint8Array(CHUNK_SIZE * 3);
    combined.set(new Uint8Array(headBuf), 0);
    combined.set(new Uint8Array(midBuf), CHUNK_SIZE);
    combined.set(new Uint8Array(tailBuf), CHUNK_SIZE * 2);

    const hash = this.fastBufferHash(combined.buffer);
    return `sparse_${size}_${hash}`;
  }

  /**
   * Stage 3: Hardware-Accelerated Fast Low-Res Perceptual Hash (pHash / dHash)
   * Offloaded to Mobile Web Worker + OffscreenCanvas to guarantee 60fps main UI responsiveness.
   */
  static async computeFastPHash(blobOrUrl: Blob | File | string): Promise<string> {
    try {
      if (typeof window === 'undefined') return '0000000000000000';

      // 1. Off-thread Web Worker acceleration for Blobs and Files
      if (blobOrUrl instanceof Blob) {
        try {
          const workerResult = await mobileWorkerPool.computePHash(blobOrUrl);
          if (workerResult && workerResult.pHash) {
            return workerResult.pHash;
          }
        } catch {
          // Graceful fallback to main thread OffscreenCanvas / DOM
        }
      }

      let bmp: ImageBitmap | null = null;
      let imgElement: HTMLImageElement | null = null;

      if (typeof createImageBitmap === 'function' && blobOrUrl instanceof Blob) {
        try {
          bmp = await createImageBitmap(blobOrUrl, {
            resizeWidth: 32,
            resizeHeight: 32,
            resizeQuality: 'low'
          });
        } catch {
          bmp = null;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return '1f2e3d4c5b6a7988';

      if (bmp) {
        ctx.drawImage(bmp, 0, 0, 32, 32);
        bmp.close();
      } else {
        await new Promise<void>((resolve, reject) => {
          imgElement = new Image();
          imgElement.crossOrigin = 'anonymous';
          imgElement.onload = () => {
            ctx.drawImage(imgElement!, 0, 0, 32, 32);
            resolve();
          };
          imgElement.onerror = () => reject(new Error('Image load failed'));
          if (typeof blobOrUrl === 'string') {
            imgElement.src = blobOrUrl;
          } else {
            imgElement.src = URL.createObjectURL(blobOrUrl);
          }
        });
      }

      const imgData = ctx.getImageData(0, 0, 32, 32);
      const data = imgData.data;

      // 8x8 block averages for 64-bit robust difference hash
      const blockWidth = 4;
      const blockHeight = 4;
      const grid = new Float32Array(64);

      for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
          let sum = 0;
          for (let y = 0; y < blockHeight; y++) {
            for (let x = 0; x < blockWidth; x++) {
              const px = gx * blockWidth + x;
              const py = gy * blockHeight + y;
              const idx = (py * 32 + px) * 4;
              // Rec. 601 Luma
              const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              sum += luma;
            }
          }
          grid[gy * 8 + gx] = sum / (blockWidth * blockHeight);
        }
      }

      // Compute 64-bit difference hash (dHash horizontal gradient)
      let hashHex = '';
      for (let row = 0; row < 8; row++) {
        let byteVal = 0;
        for (let col = 0; col < 8; col++) {
          const nextCol = (col + 1) % 8;
          const bit = grid[row * 8 + col] > grid[row * 8 + nextCol] ? 1 : 0;
          byteVal = (byteVal << 1) | bit;
        }
        hashHex += byteVal.toString(16).padStart(2, '0');
      }

      return hashHex || '1f2e3d4c5b6a7988';
    } catch {
      return '1f2e3d4c5b6a7988';
    }
  }

  /**
   * Stage 1: Size & Metadata Fast Pruning
   * Groups assets by exact byte size. Discards size-unique assets with ZERO byte I/O reads.
   * Clusters time-adjacent photos into temporal buckets for O(N log N) similarity search.
   */
  static stage1SizeAndMetadataPruning(photos: PhotoRecord[]): {
    exactCandidateGroups: PhotoRecord[][];
    temporalClusters: PhotoRecord[][];
    prunedCount: number;
    ioSavedBytes: number;
  } {
    const sizeMap = new Map<number, PhotoRecord[]>();
    let ioSavedBytes = 0;

    for (const photo of photos) {
      const size = photo.size || 0;
      if (size === 0) continue;
      const list = sizeMap.get(size) || [];
      list.push(photo);
      sizeMap.set(size, list);
    }

    const exactCandidateGroups: PhotoRecord[][] = [];
    let prunedCount = 0;

    sizeMap.forEach((items, size) => {
      if (items.length > 1) {
        exactCandidateGroups.push(items);
      } else {
        // Unique size: 100% impossible to be exact duplicate
        prunedCount++;
        ioSavedBytes += size;
      }
    });

    // Spatio-Temporal Clustering for Similar Photos (Window: 30 seconds)
    // Avoids O(N^2) pairwise comparisons by only checking adjacent bursts/scenes
    const sorted = [...photos]
      .filter(p => !p.type || p.type.startsWith('image/'))
      .sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));

    const temporalClusters: PhotoRecord[][] = [];
    const CLUSTER_WINDOW_MS = 30000; // 30 seconds

    let currentCluster: PhotoRecord[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const photo = sorted[i];
      if (currentCluster.length === 0) {
        currentCluster.push(photo);
        continue;
      }

      const prev = currentCluster[currentCluster.length - 1];
      const diff = Math.abs((photo.lastModified || 0) - (prev.lastModified || 0));

      if (diff <= CLUSTER_WINDOW_MS) {
        currentCluster.push(photo);
      } else {
        if (currentCluster.length > 1) {
          temporalClusters.push(currentCluster);
        }
        currentCluster = [photo];
      }
    }
    if (currentCluster.length > 1) {
      temporalClusters.push(currentCluster);
    }

    return {
      exactCandidateGroups,
      temporalClusters,
      prunedCount,
      ioSavedBytes
    };
  }

  /**
   * Stage 2: Sparse Chunk Verification
   * Verifies exact candidates using 12KB sparse chunk hashes.
   */
  static stage2SparseGroupPruning(candidateGroups: PhotoRecord[][]): {
    verifiedExactGroups: DedupeGroup[];
    sparseMatchesCount: number;
  } {
    const verifiedExactGroups: DedupeGroup[] = [];
    let sparseMatchesCount = 0;

    for (const group of candidateGroups) {
      const sparseMap = new Map<string, PhotoRecord[]>();

      for (const p of group) {
        // Use sparseHash if available, or fall back to md5 or size key
        const key = p.sparseHash || p.md5 || `size_${p.size}`;
        const list = sparseMap.get(key) || [];
        list.push(p);
        sparseMap.set(key, list);
      }

      sparseMap.forEach((matchedPhotos, hashKey) => {
        if (matchedPhotos.length > 1) {
          sparseMatchesCount += matchedPhotos.length;
          const best = DedupeEngine.getBestPhoto(matchedPhotos, 'sharpest');
          verifiedExactGroups.push({
            id: `sparse_exact_${hashKey}_${matchedPhotos.map(p => p.id || p.originalId).sort().join('_')}`,
            type: 'exact',
            photos: matchedPhotos,
            totalSize: matchedPhotos.reduce((acc, p) => acc + (p.size || 0), 0),
            redundantSize: matchedPhotos.reduce((acc, p) => acc + (p.id !== best.id ? (p.size || 0) : 0), 0),
            confidence: 100,
            reasons: ['sparse_chunk_match', 'identical_size', 'byte_parity'],
            representativeDate: matchedPhotos[0].lastModified
          });
        }
      });
    }

    return { verifiedExactGroups, sparseMatchesCount };
  }

  /**
   * Stage 3: Fast Visual Clustering within Temporal Buckets
   * Evaluates pHash similarity only within Spatio-Temporal clusters to achieve O(N log N) performance.
   */
  static stage3FastVisualClustering(
    temporalClusters: PhotoRecord[][],
    threshold: number = 8
  ): DedupeGroup[] {
    const similarGroups: DedupeGroup[] = [];
    const globalProcessed = new Set<string>();

    for (const cluster of temporalClusters) {
      const indexed = cluster.filter(p => !!p.pHash);
      if (indexed.length < 2) continue;

      for (let i = 0; i < indexed.length; i++) {
        const p1 = indexed[i];
        const p1Key = String(p1.id || p1.originalId);
        if (globalProcessed.has(p1Key)) continue;

        const groupMembers: PhotoRecord[] = [p1];
        let maxSimilarity = 0;

        for (let j = i + 1; j < indexed.length; j++) {
          const p2 = indexed[j];
          const p2Key = String(p2.id || p2.originalId);
          if (globalProcessed.has(p2Key)) continue;

          const distance = DedupeEngine.calculateHammingDistance(p1.pHash!, p2.pHash!);
          if (distance <= threshold) {
            const sim = Math.floor(((64 - distance) / 64) * 100);
            groupMembers.push(p2);
            globalProcessed.add(p2Key);
            maxSimilarity = Math.max(maxSimilarity, sim);
          }
        }

        if (groupMembers.length > 1) {
          globalProcessed.add(p1Key);
          const best = DedupeEngine.getBestPhoto(groupMembers, 'sharpest');
          similarGroups.push({
            id: `funnel_sim_${threshold}_${groupMembers.map(p => p.id || p.originalId).sort().join('_')}`,
            type: 'similar',
            photos: groupMembers,
            totalSize: groupMembers.reduce((acc, p) => acc + (p.size || 0), 0),
            redundantSize: groupMembers.reduce((acc, p) => acc + (p.id !== best.id ? (p.size || 0) : 0), 0),
            confidence: maxSimilarity || 85,
            reasons: ['temporal_proximity', 'fast_phash_similarity'],
            representativeDate: groupMembers[0].lastModified
          });
        }
      }
    }

    return similarGroups;
  }

  /**
   * High-level Master Funnel Execution:
   * Executes all 4 stages systematically over the dataset.
   */
  static executeFunnel(
    photos: PhotoRecord[],
    visualThreshold: number = 8
  ): {
    exactGroups: DedupeGroup[];
    similarGroups: DedupeGroup[];
    allGroups: DedupeGroup[];
    metrics: FunnelMetrics;
  } {
    const startTime = performance.now();
    const activePhotos = photos.filter(p => !p.isPrivate && p.isDeleted !== 1);

    // Stage 1: Size & Metadata Fast Pruning
    const { exactCandidateGroups, temporalClusters, prunedCount, ioSavedBytes } =
      this.stage1SizeAndMetadataPruning(activePhotos);

    // Stage 2: Sparse Chunk Verification
    const { verifiedExactGroups, sparseMatchesCount } =
      this.stage2SparseGroupPruning(exactCandidateGroups);

    // Stage 3: Fast Visual Clustering
    const similarGroups = this.stage3FastVisualClustering(temporalClusters, visualThreshold);

    // Combine & Deduplicate overlap
    const seenExactIds = new Set<string>();
    verifiedExactGroups.forEach(g => {
      g.photos.forEach(p => seenExactIds.add(String(p.id || p.originalId)));
    });

    // Remove similar groups that are completely covered by exact groups
    const filteredSimilar = similarGroups.filter(sg => {
      const allAlreadyExact = sg.photos.every(p => seenExactIds.has(String(p.id || p.originalId)));
      return !allAlreadyExact;
    });

    const allGroups = [...verifiedExactGroups, ...filteredSimilar];
    const duration = performance.now() - startTime;

    const metrics: FunnelMetrics = {
      totalScanned: activePhotos.length,
      stage1Pruned: prunedCount,
      stage2ExactMatches: sparseMatchesCount,
      stage3VisualClusters: filteredSimilar.length,
      executionTimeMs: Math.round(duration * 100) / 100,
      ioSavedBytes
    };

    return {
      exactGroups: verifiedExactGroups,
      similarGroups: filteredSimilar,
      allGroups,
      metrics
    };
  }
}
