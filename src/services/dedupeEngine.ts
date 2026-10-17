import { db, PhotoRecord } from './db';
import { createErrorPayload, OperationType } from '../utils/errorUtils';
import { FunnelEngine } from './funnelEngine';

export interface DedupeGroup {
  id: string;
  type: 'exact' | 'similar';
  photos: PhotoRecord[];
  totalSize: number;
  redundantSize?: number;
  confidence?: number;
  reasons?: string[];
  representativeDate?: number;
  subType?: 'exact_byte' | 'visual_similar' | 'burst' | 'resized' | 'cross_folder' | 'filename_copy';
  similarityPercent?: number;
  timeDiffSeconds?: number;
  matchDetails?: {
    sizeMatch?: boolean;
    hashMatch?: boolean;
    burstIntervalMs?: number;
    resolutionDifferent?: boolean;
    crossFolder?: boolean;
    namePatternMatch?: boolean;
  };
}

export class DedupeEngine {
  /**
   * Intelligently groups photos by combining MD5, visual similarity, and temporal proximity using the 4-Stage Funnel.
   */
  static async findIntelligentGroups(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    try {
      const allPhotos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate && p.isDeleted !== 1);
      if (allPhotos.length === 0) return [];

      // Execute 4-Stage Funnel Engine for O(N log N) processing and zero-waste I/O
      const funnelResult = FunnelEngine.executeFunnel(allPhotos, 8);

      // Video Duplicates analysis
      const videoDups = await this.findVideoDuplicates(allPhotos);

      const allMap = new Map<string, DedupeGroup>();
      funnelResult.allGroups.forEach(g => allMap.set(g.id, g));
      videoDups.forEach(g => allMap.set(g.id, g));

      return Array.from(allMap.values());
    } catch (e) {
      console.error('Intelligent grouping failed:', e);
      return [];
    }
  }

  /**
   * Find exact duplicates by grouping entries with Stage 1 (Size) & Stage 2 (Sparse 12KB Hash / MD5)
   */
  static async findExactDuplicates(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    try {
      const allPhotos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate && p.isDeleted !== 1);
      const { exactCandidateGroups } = FunnelEngine.stage1SizeAndMetadataPruning(allPhotos);
      const { verifiedExactGroups } = FunnelEngine.stage2SparseGroupPruning(exactCandidateGroups);
      return verifiedExactGroups;
    } catch (e) {
      throw new Error(JSON.stringify(createErrorPayload(e, OperationType.DB_READ, { location: 'findExactDuplicates' })));
    }
  }

  /**
   * Find temporal duplicates (Burst shots) taken within a very short time window (e.g., 2 seconds)
   */
  static async findTemporalDuplicates(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    const allPhotos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate && p.isDeleted !== 1);
    // Sort by time
    const sorted = [...allPhotos].sort((a,b) => a.lastModified - b.lastModified);
    const groups: DedupeGroup[] = [];
    
    let currentGroup: PhotoRecord[] = [];
    const BURST_WINDOW_MS = 2000; // 2 seconds

    for (let i = 0; i < sorted.length; i++) {
      const photo = sorted[i];
      if (currentGroup.length === 0) {
        currentGroup.push(photo);
        continue;
      }

      const lastPhoto = currentGroup[currentGroup.length - 1];
      if (photo.lastModified - lastPhoto.lastModified <= BURST_WINDOW_MS) {
        currentGroup.push(photo);
      } else {
        if (currentGroup.length > 1) {
          groups.push({
            id: `burst_${currentGroup.map(p => p.id).sort().join('_')}`,
            type: 'similar', // We flag burst shots as similar for now
            photos: currentGroup,
            totalSize: currentGroup.reduce((acc, p) => acc + p.size, 0),
            confidence: 80 // Base confidence for temporal closeness
          });
        }
        currentGroup = [photo];
      }
    }

    if (currentGroup.length > 1) {
      groups.push({
        id: `burst_${currentGroup.map(p => p.id).sort().join('_')}`,
        type: 'similar',
        photos: currentGroup,
        totalSize: currentGroup.reduce((acc, p) => acc + p.size, 0),
        confidence: 80
      });
    }

    return groups;
  }

  /**
   * Find visual duplicates by comparing pHash entries
   */
  static async findVisualDuplicates(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    return this.findVisualDuplicatesWithThreshold(preloadedPhotos, 5);
  }

  /**
   * Find loose visual duplicates with a higher distance threshold
   */
  static async findLooseVisualDuplicates(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    return this.findVisualDuplicatesWithThreshold(preloadedPhotos, 10);
  }

  /**
   * Find video duplicates based on duration, resolution, and sampled frame hash (pHash)
   */
  static async findVideoDuplicates(preloadedPhotos?: PhotoRecord[]): Promise<DedupeGroup[]> {
    try {
      const allPhotos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate && p.isDeleted !== 1);
      const videos = allPhotos.filter(p => p.type?.startsWith('video/'));
      const groups: DedupeGroup[] = [];
      const processedIds = new Set<number>();

      for (let i = 0; i < videos.length; i++) {
        if (processedIds.has(videos[i].id!)) continue;
        
        const current = videos[i];
        const groupMembers: PhotoRecord[] = [current];
        let maxConfidence = 0;

        for (let j = i + 1; j < videos.length; j++) {
          if (processedIds.has(videos[j].id!)) continue;
          
          const target = videos[j];
          let subConfidence = 0;

          // Criterion 1: pHash (Sampled Frame Hash)
          if (current.pHash && target.pHash) {
            const distance = this.calculateHammingDistance(current.pHash, target.pHash);
            if (distance <= 8) { // Common threshold for similar frame
              subConfidence = Math.max(subConfidence, Math.floor(((64 - distance) / 64) * 100));
            }
          }

          // Criterion 2: Duration + Resolution matching
          if (current.durationMs !== undefined && target.durationMs !== undefined) {
            const durationDiff = Math.abs(current.durationMs - target.durationMs);
            // Same duration (within 200ms) often implies same content if resolution also matches
            if (durationDiff < 200) {
              if (current.width === target.width && current.height === target.height) {
                subConfidence = Math.max(subConfidence, 95);
                
                // Extra credit: if codecs are different but duration/size is same-ish, likely transcoded
                if (current.codec && target.codec && current.codec !== target.codec) {
                   subConfidence = Math.max(subConfidence, 92);
                }
              } else if (current.width && target.width) {
                 // Different resolution but same duration - likely transcoded
                 subConfidence = Math.max(subConfidence, 85);
              }
            }
          }

          // Criterion 3: Bitrate similarity (heuristic)
          if (current.bitrate && target.bitrate) {
            const bitrateRatio = Math.min(current.bitrate, target.bitrate) / Math.max(current.bitrate, target.bitrate);
            if (bitrateRatio > 0.9 && subConfidence > 50) {
              subConfidence += 5; // Boost confidence if bitrates are similar
            }
          }

          if (subConfidence > 70) {
            groupMembers.push(target);
            processedIds.add(target.id!);
            maxConfidence = Math.max(maxConfidence, subConfidence);
          }
        }

        if (groupMembers.length > 1) {
          processedIds.add(current.id!);
          groups.push({
            id: `video_dup_${groupMembers.map(p => p.id).sort().join('_')}`,
            type: 'similar',
            photos: groupMembers,
            totalSize: groupMembers.reduce((acc, p) => acc + p.size, 0),
            confidence: maxConfidence || 80
          });
        }
      }

      return groups;
    } catch (e) {
      console.error('Video deduplication failed:', e);
      return [];
    }
  }

  static async findVisualDuplicatesWithThreshold(preloadedPhotos: PhotoRecord[] | undefined, threshold: number): Promise<DedupeGroup[]> {
    const allPhotos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate && p.isDeleted !== 1);
    const { temporalClusters } = FunnelEngine.stage1SizeAndMetadataPruning(allPhotos);
    return FunnelEngine.stage3FastVisualClustering(temporalClusters, threshold);
  }

  public static calculateHammingDistance(h1: string, h2: string): number {
    if (h1 === h2) return 0;
    try {
      // Hex representation (16 bytes/chars hex string etc)
      const isHex = /^[0-9a-fA-F]+$/.test(h1) && /^[0-9a-fA-F]+$/.test(h2);
      if (isHex && h1.length % 2 === 0) {
        let distance = 0;
        const len = Math.min(h1.length, h2.length);
        for (let i = 0; i < len; i += 2) {
          const b1 = parseInt(h1.substring(i, i + 2), 16);
          const b2 = parseInt(h2.substring(i, i + 2), 16);
          if (!isNaN(b1) && !isNaN(b2)) {
            let xor = b1 ^ b2;
            while (xor > 0) {
              if (xor & 1) distance++;
              xor >>= 1;
            }
          }
        }
        distance += Math.abs(h1.length - h2.length) * 4;
        return distance;
      }

      // Base64 representation fallback
      const atobSafe = (str: string) => typeof window !== 'undefined' ? window.atob(str) : Buffer.from(str, 'base64').toString('binary');
      const s1 = atobSafe(h1);
      const s2 = atobSafe(h2);
      
      let distance = 0;
      const len = Math.min(s1.length, s2.length);
      
      for (let i = 0; i < len; i++) {
        let xor = s1.charCodeAt(i) ^ s2.charCodeAt(i);
        // Count set bits (population count)
        while (xor > 0) {
          if (xor & 1) distance++;
          xor >>= 1;
        }
      }
      
      // Account for length difference if any (should be 8 bytes for pHash)
      distance += Math.abs(s1.length - s2.length) * 8;
      
      return distance;
    } catch (e) {
      return h1 === h2 ? 0 : 64;
    }
  }

  public static calculateSimilarity(h1: string, h2: string): number {
    const distance = this.calculateHammingDistance(h1, h2);
    return Math.max(0, Math.floor(((64 - distance) / 64) * 100));
  }
  /**
   * Identifies the "Best" photo in a group based on criteria:
   * 1. Sharpness (Blur Score)
   * 2. Aesthetic Appeal (Composition Score)
   * 3. Higher resolution/size
   */
  static getBestPhoto(
    group: PhotoRecord[], 
    rule: 'sharpest' | 'largest' | 'newest' | 'oldest' | 'highest_res' | 'rich_exif' | 'priority_folder' = 'sharpest',
    priorityFolder?: string
  ): PhotoRecord {
    return [...group].sort((a, b) => {
      const aIsVideo = a.type?.startsWith('video/');
      const bIsVideo = b.type?.startsWith('video/');

      // Priority Folder rule
      if (rule === 'priority_folder' && priorityFolder) {
        const normPriority = priorityFolder.toLowerCase().replace(/\\/g, '/');
        const aInPriority = a.path?.toLowerCase().replace(/\\/g, '/').startsWith(normPriority);
        const bInPriority = b.path?.toLowerCase().replace(/\\/g, '/').startsWith(normPriority);
        if (aInPriority && !bInPriority) return -1;
        if (!aInPriority && bInPriority) return 1;
      }

      if (rule === 'highest_res') {
        const aPixels = (a.width || 0) * (a.height || 0);
        const bPixels = (b.width || 0) * (b.height || 0);
        if (bPixels !== aPixels) return bPixels - aPixels;
        if (b.size !== a.size) return b.size - a.size;
      }

      if (rule === 'rich_exif') {
        const getExifScore = (p: PhotoRecord) => {
          let score = 0;
          if (p.cameraModel) score += 2;
          if (p.latitude && p.longitude) score += 3;
          if (p.dateTaken) score += 2;
          if (p.iso) score += 1;
          if (p.fNumber) score += 1;
          if (p.exposureTime) score += 1;
          if (p.width && p.height) score += 1;
          return score;
        };
        const aScore = getExifScore(a);
        const bScore = getExifScore(b);
        if (bScore !== aScore) return bScore - aScore;
      }

      if (rule === 'largest') {
        if (b.size !== a.size) return b.size - a.size;
      }
      if (rule === 'newest') {
        const bTime = b.dateTaken || b.lastModified || 0;
        const aTime = a.dateTaken || a.lastModified || 0;
        return bTime - aTime;
      }
      if (rule === 'oldest') {
        const bTime = b.dateTaken || b.lastModified || 0;
        const aTime = a.dateTaken || a.lastModified || 0;
        return aTime - bTime;
      }
      
      // Default / Sharpest rule
      // FOR VIDEOS: Prioritize resolution/size as we don't have per-frame analysis
      if (aIsVideo || bIsVideo) {
        if (aIsVideo && bIsVideo) {
          return b.size - a.size;
        }
        if (b.size !== a.size) return b.size - a.size;
      }

      // Prioritize Sharpness first (higher is better) for images
      if (a.blurScore !== undefined && b.blurScore !== undefined) {
        if (Math.abs(b.blurScore - a.blurScore) > 0.1) {
            return b.blurScore - a.blurScore;
        }
      }
      
      // Then Aesthetic Score (higher is better)
      if (a.aestheticScore !== undefined && b.aestheticScore !== undefined) {
        if (b.aestheticScore !== a.aestheticScore) {
            return b.aestheticScore - a.aestheticScore;
        }
      }

      // Fallback to Size
      if (b.size !== a.size) return b.size - a.size;
      return (b.dateTaken || b.lastModified || 0) - (a.dateTaken || a.lastModified || 0);
    })[0];
  }

  /**
   * Deletes all photos in a group EXCEPT the best one
   */
  static async resolveGroup(group: PhotoRecord[]): Promise<PhotoRecord[]> {
    try {
      const best = this.getBestPhoto(group);
      const toDelete = group.filter(p => p.id !== best.id);
      
      if (toDelete.length > 0) {
        await db.photos.bulkDelete(toDelete.map(p => p.id!).filter(Boolean));
      }
      
      return toDelete;
    } catch (e) {
      throw new Error(JSON.stringify(createErrorPayload(e, OperationType.DB_WRITE, { location: 'resolveGroup', groupSize: group.length })));
    }
  }

  /**
   * Clusters photos based on location Name.
   */
  static async findLocations(preloadedPhotos?: PhotoRecord[]): Promise<{ id: string, name: string, photos: PhotoRecord[] }[]> {
    const photos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate);
    const locationMap = new Map<string, PhotoRecord[]>();
    
    for (const photo of photos) {
      if (photo.locationName) {
        const arr = locationMap.get(photo.locationName) || [];
        arr.push(photo);
        locationMap.set(photo.locationName, arr);
      } else {
        const arr = locationMap.get('Unknown Location') || [];
        arr.push(photo);
        locationMap.set('Unknown Location', arr);
      }
    }

    return Array.from(locationMap.entries()).map(([name, photos]) => ({
      id: `loc_${name.replace(/ /g, '_')}`,
      name,
      photos
    })).sort((a,b) => b.photos.length - a.photos.length);
  }

  /**
   * Clusters photos into "Events" based on temporal proximity (8-hour window)
   */
  static async findEvents(preloadedPhotos?: PhotoRecord[]): Promise<{ id: string, name: string, photos: PhotoRecord[], date: Date }[]> {
    const _all = preloadedPhotos || await db.photos.toArray();
    const photos = _all.filter(p => !p.isPrivate).sort((a,b) => a.lastModified - b.lastModified);
    if (photos.length === 0) return [];

    const events: { id: string, name: string, photos: PhotoRecord[], date: Date }[] = [];
    let currentEventPhotos: PhotoRecord[] = [];
    let lastTime = photos[0].lastModified;

    const WINDOW_MS = 1000 * 60 * 60 * 8; // 8 hours

    photos.forEach((p, i) => {
      if (i === 0 || p.lastModified - lastTime < WINDOW_MS) {
        currentEventPhotos.push(p);
      } else {
        // Finalize previous event
        const date = new Date(currentEventPhotos[0].lastModified);
        const name = this.generateEventName(currentEventPhotos);
        events.push({
          id: `event-${date.getTime()}`,
          name,
          photos: [...currentEventPhotos],
          date
        });
        currentEventPhotos = [p];
      }
      lastTime = p.lastModified;
    });

    // Don't forget the last group
    if (currentEventPhotos.length > 0) {
      const date = new Date(currentEventPhotos[0].lastModified);
      const name = this.generateEventName(currentEventPhotos);
      events.push({
        id: `event-${date.getTime()}`,
        name,
        photos: [...currentEventPhotos],
        date
      });
    }

    return events.reverse(); // Newest first
  }

  private static generateEventName(photos: PhotoRecord[]): string {
    const categories = photos.map(p => p.category).filter(Boolean);
    const topCategory = categories.sort((a, b) =>
      categories.filter(v => v === a).length - categories.filter(v => v === b).length
    ).pop() || 'Untitled Session';

    const date = new Date(photos[0].lastModified);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();

    return `${topCategory} in ${month} ${day}`;
  }

  /**
   * Get distribution of photos by year
   */
  static async getDateStats(preloadedPhotos?: PhotoRecord[]): Promise<Record<string, number>> {
    const photos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate);
    const stats: Record<string, number> = {};
    photos.forEach(p => {
      const year = new Date(p.lastModified).getFullYear().toString();
      stats[year] = (stats[year] || 0) + 1;
    });
    return stats;
  }

  /**
   * Identifies "Low-Value" assets like receipts, screenshots, or very blurry photos
   */
  static async findLowValueAssets(preloadedPhotos?: PhotoRecord[]): Promise<PhotoRecord[]> {
    const _all = preloadedPhotos || (await db.photos.toArray()).filter(p => p.isDeleted !== 1);
    const all = _all.filter(p => !p.isPrivate);
    return all.filter(p => 
      (p.qualityScore !== undefined && p.qualityScore < 30) || 
      (p.blurScore !== undefined && p.blurScore < 0.3) ||
      (p.qualityTags?.some(t => ['Dark', 'Bright'].includes(t))) ||
      (p.category === 'Documents') ||
      (p.tags?.some(t => ['Receipt', 'Text', 'Document'].includes(t)))
    ).slice(0, 50); // Limit results for demo
  }

  /**
   * Simulates AI enhancement (Super Resolution & Color Correction)
   */
  static async enhancePhoto(id: number, type: 'SuperRes' | 'ColorFix'): Promise<void> {
    const photo = await db.photos.get(id);
    if (!photo) return;
    
    // Artificial delay to simulate heavy AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await db.photos.update(id, {
      isEnhanced: true,
      enhancementType: type,
      aestheticScore: Math.min(10, (photo.aestheticScore || 5) + 1.5),
      blurScore: type === 'SuperRes' ? Math.min(1.0, (photo.blurScore || 0.5) + 0.2) : photo.blurScore
    });
  }

  /**
   * Get distribution of photos by category
   */
  static async getCategoryStats(preloadedPhotos?: PhotoRecord[]): Promise<Record<string, { count: number, size: number }>> {
    const photos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate);
    const stats: Record<string, { count: number, size: number }> = {};
    photos.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { count: 0, size: 0 };
      stats[cat].count++;
      stats[cat].size += p.size;
    });
    return stats;
  }

  /**
   * Get distribution of photos by file format
   */
  static async getFormatStats(preloadedPhotos?: PhotoRecord[]): Promise<Record<string, number>> {
    const photos = preloadedPhotos || (await db.photos.toArray()).filter(p => !p.isPrivate);
    const stats: Record<string, number> = {};
    photos.forEach(p => {
      const fileName = p.path.split('/').pop() || '';
      const format = fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      stats[format] = (stats[format] || 0) + 1;
    });
    return stats;
  }
}
