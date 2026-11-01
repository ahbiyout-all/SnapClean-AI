import { PhotoRecord } from './db';
import { DedupeGroup } from './dedupeEngine';

export interface AiQualityBreakdown {
  blurScore: number;         // 0 - 10 (higher is sharper)
  exposureScore: number;     // 0 - 10 (higher is optimal exposure / dynamic range)
  compositionScore: number;  // 0 - 10 (higher is better composition & aesthetics)
  overallScore: number;      // 0 - 10 (weighted composite)
  tags: string[];            // Descriptive badges
  recommendationReason: string;
  isAiWinner?: boolean;
}

export class SmartDuplicateSelector {
  /**
   * Evaluates a single photo on 3 core photographic axes:
   * 1. Blur / Sharpness (0-10)
   * 2. Exposure / Dynamic Balance (0-10)
   * 3. Composition / Aesthetics (0-10)
   */
  public static calculateAiQuality(photo: PhotoRecord): AiQualityBreakdown {
    // 1. Sharpness / Blur score (0 - 10)
    let blur = photo.blurScore !== undefined ? photo.blurScore : 7.0;
    // Normalize if needed
    if (blur > 10) blur = Math.min(10, blur / 10);
    if (blur < 0) blur = 0;

    // Adjust based on quality tags
    const qTags = photo.qualityTags || [];
    if (qTags.includes('Blurry') || qTags.includes('Motion Blur')) {
      blur = Math.min(blur, 3.5);
    }

    // 2. Exposure score (0 - 10)
    // Evaluates balanced exposure: penalizes severe over/underexposure or extreme ISO noise
    let exposure = 7.5; // baseline good lighting
    if (qTags.includes('Dark') || qTags.includes('Underexposed')) {
      exposure -= 3.5;
    }
    if (qTags.includes('Bright') || qTags.includes('Overexposed')) {
      exposure -= 3.0;
    }
    if (qTags.includes('High Dynamic Range') || qTags.includes('Vibrant')) {
      exposure += 1.5;
    }

    // EXIF-informed exposure refinement if available
    if (photo.iso !== undefined) {
      if (photo.iso > 6400) exposure -= 2.0; // severe sensor noise
      else if (photo.iso > 3200) exposure -= 1.0;
      else if (photo.iso <= 400 && photo.iso >= 50) exposure += 0.5; // clean base ISO
    }

    // Shutter speed check for motion stability
    if (photo.exposureTime !== undefined) {
      // Very slow handheld shutter speeds (< 1/15s) often carry micro-shake
      if (photo.exposureTime > (1 / 15)) exposure -= 0.5;
      else if (photo.exposureTime <= (1 / 125) && photo.exposureTime >= (1 / 2000)) exposure += 0.5;
    }
    exposure = Math.max(1.0, Math.min(10.0, exposure));

    // 3. Composition & Aesthetics score (0 - 10)
    let composition = photo.aestheticScore !== undefined 
      ? photo.aestheticScore 
      : (photo.aiScore !== undefined ? photo.aiScore : 6.8);
    
    if (composition > 10) composition = Math.min(10, composition / 10);
    if (composition < 0) composition = 0;

    // Face / Subject framing bonus
    if (photo.detectedFaces && photo.detectedFaces > 0) {
      // Balanced portrait framing bonus
      composition = Math.min(10.0, composition + 0.8);
    }

    // Penalize low-quality tag
    if (qTags.includes('Low Quality') || qTags.includes('Artifacts')) {
      composition = Math.max(1.0, composition - 2.5);
    }
    if (qTags.includes('Golden Hour') || qTags.includes('Rule of Thirds') || qTags.includes('Symmetric')) {
      composition = Math.min(10.0, composition + 1.2);
    }

    // 4. Weighted Composite Score:
    // Blur (40%) + Exposure (35%) + Composition (25%)
    const overallScore = Math.round(
      ((blur * 0.40) + (exposure * 0.35) + (composition * 0.25)) * 10
    ) / 10;

    // Descriptive tags
    const tags: string[] = [];
    if (blur >= 8.0) tags.push('선명한 초점 (Sharp Focus)');
    else if (blur < 4.5) tags.push('초점 흐림 (Soft Focus)');

    if (exposure >= 8.0) tags.push('최적 노출 (Optimal Lighting)');
    else if (exposure < 5.0) tags.push('노출 불안정 (Imbalanced Exposure)');

    if (composition >= 8.0) tags.push('황금 구도 (Strong Composition)');

    // Explainable rationale
    let recommendationReason = '';
    if (overallScore >= 8.5) {
      recommendationReason = '초점 선명도, 노출 밸런스, 피사체 구도가 가장 완벽한 컷입니다.';
    } else if (blur > exposure && blur > composition) {
      recommendationReason = '다른 복사본 대비 모션 블러가 없고 피사체 디테일이 가장 또렷합니다.';
    } else if (exposure > blur && exposure > composition) {
      recommendationReason = '하이라이트와 암부 뭉개짐 없이 조명 밸런스가 가장 자연스럽습니다.';
    } else {
      recommendationReason = '초점과 노출 및 안정적인 구도를 종합 분석하여 가장 보존 가치가 높습니다.';
    }

    return {
      blurScore: Math.round(blur * 10) / 10,
      exposureScore: Math.round(exposure * 10) / 10,
      compositionScore: Math.round(composition * 10) / 10,
      overallScore,
      tags,
      recommendationReason,
    };
  }

  /**
   * Compares photos in a duplicate group and selects the optimal photo to preserve
   * based on AI quality metrics rather than simple resolution or file size.
   */
  public static getSmartBestPhoto(photos: PhotoRecord[]): {
    bestPhoto: PhotoRecord;
    breakdownMap: Map<number, AiQualityBreakdown>;
    rationale: string;
  } {
    if (!photos || photos.length === 0) {
      throw new Error('Group must contain at least one photo');
    }

    if (photos.length === 1) {
      const single = photos[0];
      const breakdown = this.calculateAiQuality(single);
      breakdown.isAiWinner = true;
      const map = new Map<number, AiQualityBreakdown>();
      if (single.id) map.set(single.id, breakdown);
      return { bestPhoto: single, breakdownMap: map, rationale: breakdown.recommendationReason };
    }

    const breakdownMap = new Map<number, AiQualityBreakdown>();
    for (const p of photos) {
      if (p.id) {
        breakdownMap.set(p.id, this.calculateAiQuality(p));
      }
    }

    // Sort photos using AI Quality first, then resolution/size as tiebreaker
    const sorted = [...photos].sort((a, b) => {
      const aId = a.id || 0;
      const bId = b.id || 0;
      const aScore = breakdownMap.get(aId)?.overallScore ?? 5.0;
      const bScore = breakdownMap.get(bId)?.overallScore ?? 5.0;

      // Noticeable AI quality difference (0.2+ pts) wins unconditionally over resolution
      if (Math.abs(bScore - aScore) >= 0.2) {
        return bScore - aScore;
      }

      // If overall score is identical, check sharpness specifically
      const aBlur = breakdownMap.get(aId)?.blurScore ?? 5.0;
      const bBlur = breakdownMap.get(bId)?.blurScore ?? 5.0;
      if (Math.abs(bBlur - aBlur) >= 0.3) {
        return bBlur - aBlur;
      }

      // Check exposure
      const aExp = breakdownMap.get(aId)?.exposureScore ?? 5.0;
      const bExp = breakdownMap.get(bId)?.exposureScore ?? 5.0;
      if (Math.abs(bExp - aExp) >= 0.3) {
        return bExp - aExp;
      }

      // Tiebreaker 1: Richer EXIF or larger dimensions
      const aPixels = (a.width || 0) * (a.height || 0);
      const bPixels = (b.width || 0) * (b.height || 0);
      if (bPixels !== aPixels) return bPixels - aPixels;

      // Tiebreaker 2: File size
      return (b.size || 0) - (a.size || 0);
    });

    const bestPhoto = sorted[0];
    if (bestPhoto.id && breakdownMap.has(bestPhoto.id)) {
      breakdownMap.get(bestPhoto.id)!.isAiWinner = true;
    }

    const bestBreakdown = bestPhoto.id ? breakdownMap.get(bestPhoto.id) : undefined;
    const rationale = bestBreakdown?.recommendationReason || 'AI 종합 화질 분석에서 가장 높은 점수를 획득했습니다.';

    return {
      bestPhoto,
      breakdownMap,
      rationale,
    };
  }

  /**
   * Applies Smart Selection across all duplicate groups
   */
  public static applySmartSelectionToGroups(groups: DedupeGroup[]): {
    keepMap: Map<string, number>; // groupId -> bestPhotoId
    totalEvaluated: number;
    improvedOverResolutionCount: number;
  } {
    const keepMap = new Map<string, number>();
    let totalEvaluated = 0;
    let improvedOverResolutionCount = 0;

    for (const group of groups) {
      if (!group.photos || group.photos.length <= 1) continue;
      totalEvaluated++;

      const { bestPhoto } = this.getSmartBestPhoto(group.photos);
      if (bestPhoto.id) {
        keepMap.set(group.id, bestPhoto.id);
      }

      // Check if AI pick beat naive highest resolution
      const highestResPhoto = [...group.photos].sort((a, b) => {
        const aPix = (a.width || 0) * (a.height || 0);
        const bPix = (b.width || 0) * (b.height || 0);
        return bPix - aPix;
      })[0];

      if (highestResPhoto && bestPhoto.id !== highestResPhoto.id) {
        improvedOverResolutionCount++;
      }
    }

    return {
      keepMap,
      totalEvaluated,
      improvedOverResolutionCount,
    };
  }
}
