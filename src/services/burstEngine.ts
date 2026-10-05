import { db, PhotoRecord } from './db';

export interface BurstGroup {
  id: string;
  photos: PhotoRecord[];
  totalSize: number;
  timeSpanMs: number;
  representativeDate: number;
  bestPhotoId?: number;
  burstReason: string;
}

export class BurstEngine {
  /**
   * Intelligently scans the database for photos taken within a close time window (default 3 seconds),
   * clustering them into Burst Groups for animated GIFs/Videos or cleaning up redundant shots.
   */
  static async findBurstGroups(
    preloadedPhotos?: PhotoRecord[],
    timeWindowMs: number = 3000
  ): Promise<BurstGroup[]> {
    try {
      const allPhotos =
        preloadedPhotos ||
        (await db.photos.toArray()).filter(
          (p) => !p.isPrivate && p.isDeleted !== 1 && (!p.type || p.type.startsWith('image/'))
        );

      if (allPhotos.length < 2) return [];

      // Sort strictly by timestamp or lastModified
      const sorted = [...allPhotos]
        .filter((p) => p.id !== undefined && p.lastModified)
        .sort((a, b) => a.lastModified - b.lastModified);

      const groups: BurstGroup[] = [];
      let currentGroup: PhotoRecord[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const photo = sorted[i];

        if (currentGroup.length === 0) {
          currentGroup.push(photo);
          continue;
        }

        const prevPhoto = currentGroup[currentGroup.length - 1];
        const timeDiff = Math.abs(photo.lastModified - prevPhoto.lastModified);

        // Group together if within timeWindowMs AND either camera model matches or dimensions are similar
        const sameCamera =
          !photo.cameraModel ||
          !prevPhoto.cameraModel ||
          photo.cameraModel === prevPhoto.cameraModel;
        const similarDimensions =
          !photo.width ||
          !prevPhoto.width ||
          (Math.abs(photo.width - prevPhoto.width) < 50 && Math.abs(photo.height - prevPhoto.height) < 50);

        if (timeDiff <= timeWindowMs && (sameCamera || similarDimensions)) {
          currentGroup.push(photo);
        } else {
          if (currentGroup.length >= 2) {
            groups.push(BurstEngine.createGroupObject(currentGroup));
          }
          currentGroup = [photo];
        }
      }

      // Check the final leftover group
      if (currentGroup.length >= 2) {
        groups.push(BurstEngine.createGroupObject(currentGroup));
      }

      // Sort groups by most recent first
      return groups.sort((a, b) => b.representativeDate - a.representativeDate);
    } catch (e) {
      console.error('[BurstEngine] Error detecting burst groups:', e);
      return [];
    }
  }

  private static createGroupObject(photos: PhotoRecord[]): BurstGroup {
    // Sort inside group by timestamp ascending
    photos.sort((a, b) => a.lastModified - b.lastModified);

    // Pick sharpest/largest as best photo
    let bestPhoto = photos[0];
    let maxScore = -1;

    photos.forEach((p) => {
      const score = (p.aestheticScore || 5) * 10 + (p.size || 0) / (1024 * 1024);
      if (score > maxScore) {
        maxScore = score;
        bestPhoto = p;
      }
    });

    const startTime = photos[0].lastModified;
    const endTime = photos[photos.length - 1].lastModified;
    const timeSpanMs = Math.max(0, endTime - startTime);

    const seconds = (timeSpanMs / 1000).toFixed(1);
    const burstReason =
      timeSpanMs < 1000
        ? `초고속 연속 촬영 (${photos.length}장 / 1초 이내)`
        : `연속 촬영 묶음 (${photos.length}장 / 약 ${seconds}초 간격)`;

    return {
      id: `burst_${photos.map((p) => p.id).join('_')}`,
      photos,
      totalSize: photos.reduce((acc, p) => acc + (p.size || 0), 0),
      timeSpanMs,
      representativeDate: startTime,
      bestPhotoId: bestPhoto.id,
      burstReason,
    };
  }
}
