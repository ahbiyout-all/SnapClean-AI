import { PhotoRecord } from './db';
import { DedupeGroup } from './dedupeEngine';

export interface InferredIdentity {
  rawName: string;
  normalizedBase: string;
  detectedPattern: 'os_copy' | 'messenger_export' | 'timestamp_signature' | 'editor_tag' | 'camera_mode' | 'general';
  timestampSignature?: string;
  editorTag?: string;
  copyIndex?: number;
  rationale: string;
}

export interface InferredCandidatePair {
  p1: PhotoRecord;
  p2: PhotoRecord;
  patternType: 'os_copy' | 'messenger_export' | 'timestamp_signature' | 'editor_tag' | 'camera_mode';
  rationaleKo: string;
  rationaleEn: string;
  confidence: number;
}

/**
 * Intelligent Filename Deductive Inference Engine (중복검사 이름으로 유추)
 * Analyzes filenames to uncover duplicate, derivative, and cross-platform transfer copies.
 */
export class FilenameInferenceEngine {
  // Regex pattern for extracting timestamp signatures: YYYYMMDD_HHMMSS, YYYYMMDD-HHMMSS, YYYY-MM-DD-HH-MM-SS
  private static readonly TIMESTAMP_REGEX = /(?:^|[^0-9])((?:20\d{2}|19\d{2})[-_]?(?:0[1-9]|1[0-2])[-_]?(?:0[1-9]|[12]\d|3[01])[-_T](?:[01]\d|2[0-3])[-_:]?(?:[0-5]\d)[-_:]?(?:[0-5]\d))(?:[^0-9]|$)/i;

  // Regex for Unix epoch milliseconds often used by KakaoTalk / Facebook (10-13 digits)
  private static readonly UNIX_TIMESTAMP_REGEX = /(?:KakaoTalk|FB_IMG|IMG_)[-_]?(\d{10,13})/i;

  // OS copy patterns: " (1)", " - 복사본", " - 사본", "_copy", "Copy of "
  private static readonly COPY_PATTERNS = [
    /\s*\(\s*(\d+)\s*\)$/i,
    /\s*-\s*(?:복사본|사본|copy|copie)(?:\s*\(\s*(\d+)\s*\))?$/i,
    /_copy(?:\d+)?$/i,
    /^copy\s+(?:of\s+)?/i,
    /\s+copy(?:\s+\d+)?$/i,
    /_([1-9])$/i,
    /-([1-9])$/i,
  ];

  // Messenger / SNS prefixes
  private static readonly MESSENGER_PREFIXES = [
    /^(?:kakaotalk|kakao)[-_]?(?:photo[-_]?)?/i,
    /^(?:img[-_]?)?wa\d{4}[-_]?/i,
    /^whatsapp[-_]?image[-_]?/i,
    /^fb[-_]?img[-_]?/i,
    /^instagram[-_]?/i,
    /^received[-_]?\d*[-_]?/i,
    /^screenshot[-_]?/i,
    /^line[-_]?(?:album[-_]?)?/i,
  ];

  // Image editing application tags
  private static readonly EDITOR_TAGS = [
    /[-_](?:edit|edited|retouch|retouched|enhanced|filter|snapseed|vsco|lr|lightroom|ps|photoshop|crop|cropped|resized|thumb|preview|small|opt|optimized|compressed|hdr|remaster|upscaled|watermark)$/i,
    /[-_](?:1080p|4k|720p|qhd|fhd)$/i,
  ];

  // Camera mode prefixes
  private static readonly CAMERA_PREFIXES = [
    /^(?:mvimg|pxl|img|dsc|sam|cimg|dji)[-_]?/i,
  ];

  /**
   * Fast Hamming distance between two 16-hex perceptual hashes
   */
  public static calculateHamming(h1?: string, h2?: string): number {
    if (!h1 || !h2) return 64;
    if (h1 === h2) return 0;
    if (h1.length === 16 && h2.length === 16) {
      try {
        let xor = BigInt('0x' + h1) ^ BigInt('0x' + h2);
        let dist = 0;
        while (xor > 0n) {
          if (xor & 1n) dist++;
          xor >>= 1n;
        }
        return dist;
      } catch {}
    }
    let dist = 0;
    const len = Math.min(h1.length, h2.length);
    for (let i = 0; i < len; i++) {
      if (h1.charCodeAt(i) !== h2.charCodeAt(i)) dist++;
    }
    return dist + Math.abs(h1.length - h2.length) * 4;
  }

  /**
   * Extracts clean filename without extension
   */
  public static getFileNameWithoutExt(filePath: string): string {
    const norm = filePath.replace(/\\/g, '/');
    const fileName = norm.split('/').pop() || '';
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * Analyzes a filename to derive its canonical identity, timestamp tokens, and pattern clues
   */
  public static analyzeIdentity(filePath: string): InferredIdentity {
    const raw = this.getFileNameWithoutExt(filePath);
    let working = raw.trim();

    // 1. Check for OS Copy Pattern
    for (const pat of this.COPY_PATTERNS) {
      if (pat.test(working)) {
        const cleaned = working.replace(pat, '').trim();
        return {
          rawName: raw,
          normalizedBase: cleaned.toLowerCase(),
          detectedPattern: 'os_copy',
          rationale: '운영체제 복사본 명명 규칙(- 복사본, (1), _copy)',
        };
      }
    }

    // 2. Check for Messenger Export Prefix
    for (const pref of this.MESSENGER_PREFIXES) {
      if (pref.test(working)) {
        const stripped = working.replace(pref, '').trim();
        // Also try to extract embedded timestamp from messenger file
        const tsMatch = this.extractTimestampToken(working);
        return {
          rawName: raw,
          normalizedBase: (tsMatch || stripped).toLowerCase(),
          detectedPattern: 'messenger_export',
          timestampSignature: tsMatch,
          rationale: '메신저/SNS 전송본(카카오톡, WhatsApp, 인스타그램 등)',
        };
      }
    }

    // 3. Check for Editor & Filter Tags
    for (const tag of this.EDITOR_TAGS) {
      if (tag.test(working)) {
        const cleaned = working.replace(tag, '').trim();
        return {
          rawName: raw,
          normalizedBase: cleaned.toLowerCase(),
          detectedPattern: 'editor_tag',
          editorTag: working.match(tag)?.[0],
          rationale: '사진 편집기 필터/보정/리터칭 접미사(_edit, _snapseed, _retouch)',
        };
      }
    }

    // 4. Check for Embedded Timestamp Signature
    const tsToken = this.extractTimestampToken(working);
    if (tsToken) {
      // Remove camera prefix if present
      let normalized = working;
      for (const cam of this.CAMERA_PREFIXES) {
        normalized = normalized.replace(cam, '');
      }
      return {
        rawName: raw,
        normalizedBase: tsToken,
        detectedPattern: 'timestamp_signature',
        timestampSignature: tsToken,
        rationale: `촬영 일시 타임스탬프 시그니처 일치 (${tsToken})`,
      };
    }

    // 5. Camera mode prefixes (e.g. MVIMG vs IMG)
    for (const cam of this.CAMERA_PREFIXES) {
      if (cam.test(working)) {
        const cleaned = working.replace(cam, '').trim();
        return {
          rawName: raw,
          normalizedBase: cleaned.toLowerCase(),
          detectedPattern: 'camera_mode',
          rationale: '카메라 모션포토/촬영모드 접두사(MVIMG/PXL/IMG)',
        };
      }
    }

    return {
      rawName: raw,
      normalizedBase: working.toLowerCase(),
      detectedPattern: 'general',
      rationale: '일반 파일명',
    };
  }

  /**
   * Extracts canonical numeric timestamp token (e.g., "20240501_143022" -> "20240501143022")
   */
  public static extractTimestampToken(str: string): string | undefined {
    const match = str.match(this.TIMESTAMP_REGEX);
    if (match && match[1]) {
      // Normalize separators into canonical digits
      return match[1].replace(/[-_:T]/g, '');
    }

    const unixMatch = str.match(this.UNIX_TIMESTAMP_REGEX);
    if (unixMatch && unixMatch[1]) {
      return unixMatch[1];
    }

    return undefined;
  }

  /**
   * Evaluates if two photos have an inferred duplicate relationship through filenames,
   * supported by heuristic safety checks (size ratio, pHash distance, or EXIF timing).
   */
  public static evaluateInferredPair(p1: PhotoRecord, p2: PhotoRecord): InferredCandidatePair | null {
    if ((p1.id || p1.originalId) === (p2.id || p2.originalId)) return null;

    const id1 = this.analyzeIdentity(p1.path);
    const id2 = this.analyzeIdentity(p2.path);

    // Safety checks: calculate size ratio and visual pHash
    const minSize = Math.min(p1.size, p2.size);
    const maxSize = Math.max(p1.size, p2.size);
    const sizeRatio = maxSize > 0 ? minSize / maxSize : 0;
    const hammingDist = (p1.pHash && p2.pHash) ? this.calculateHamming(p1.pHash, p2.pHash) : null;
    const time1 = p1.dateTaken || p1.lastModified || 0;
    const time2 = p2.dateTaken || p2.lastModified || 0;
    const timeDiffSec = Math.abs(time1 - time2) / 1000;

    // RULE 1: Direct OS copy match (e.g., "photo.jpg" & "photo (1).jpg" or "photo - 복사본.jpg")
    if (id1.normalizedBase === id2.normalizedBase && id1.normalizedBase.length >= 3) {
      if (id1.detectedPattern === 'os_copy' || id2.detectedPattern === 'os_copy') {
        // High confidence: OS copy pattern with size ratio >= 0.70 OR visual pHash <= 12 OR same second
        if (sizeRatio >= 0.70 || (hammingDist !== null && hammingDist <= 12) || timeDiffSec < 60) {
          return {
            p1,
            p2,
            patternType: 'os_copy',
            confidence: sizeRatio > 0.95 ? 0.99 : 0.94,
            rationaleKo: `운영체제 복사본 명명 규칙 검출 ('${id1.rawName}' ↔ '${id2.rawName}')`,
            rationaleEn: `OS copy suffix pattern detected ('${id1.rawName}' ↔ '${id2.rawName}')`,
          };
        }
      }
    }

    // RULE 2: Embedded Timestamp Signature Match
    // e.g. "IMG_20240501_153022.jpg" ↔ "KakaoTalk_20240501_153022.jpg" or "20240501_153022_edit.jpg"
    if (id1.timestampSignature && id2.timestampSignature && id1.timestampSignature === id2.timestampSignature) {
      // If timestamps match, they are from the exact same capture event.
      // Confirm with pHash <= 14 or size ratio >= 0.35 (accounting for messenger compression)
      const isMessenger = id1.detectedPattern === 'messenger_export' || id2.detectedPattern === 'messenger_export';
      if ((hammingDist !== null && hammingDist <= 14) || sizeRatio >= 0.35 || timeDiffSec < 120) {
        return {
          p1,
          p2,
          patternType: isMessenger ? 'messenger_export' : 'timestamp_signature',
          confidence: 0.96,
          rationaleKo: isMessenger
            ? `메신저 전송본과 원본의 촬영 일시 시그니처(${id1.timestampSignature}) 일치로 중복 유추`
            : `동일 촬영 시각 시그니처(${id1.timestampSignature}) 기반 복사본/파생본 유추`,
          rationaleEn: isMessenger
            ? `Messenger transfer copy inferred via matching capture timestamp signature (${id1.timestampSignature})`
            : `Capture timestamp signature (${id1.timestampSignature}) deductive match`,
        };
      }
    }

    // RULE 3: Messenger Export Prefix + Base Name Match
    if (
      (id1.detectedPattern === 'messenger_export' || id2.detectedPattern === 'messenger_export') &&
      id1.normalizedBase === id2.normalizedBase &&
      id1.normalizedBase.length >= 4
    ) {
      if (sizeRatio >= 0.25 || (hammingDist !== null && hammingDist <= 14)) {
        return {
          p1,
          p2,
          patternType: 'messenger_export',
          confidence: 0.95,
          rationaleKo: `메신저(카카오톡/WhatsApp) 전송 접두사 유추 ('${id1.rawName}' ↔ '${id2.rawName}')`,
          rationaleEn: `Messenger transfer prefix match ('${id1.rawName}' ↔ '${id2.rawName}')`,
        };
      }
    }

    // RULE 4: Editor & Filter Tag Match (e.g., "sunset.jpg" ↔ "sunset_edit.jpg" or "portrait_snapseed.jpg")
    if (
      (id1.detectedPattern === 'editor_tag' || id2.detectedPattern === 'editor_tag') &&
      id1.normalizedBase === id2.normalizedBase &&
      id1.normalizedBase.length >= 3
    ) {
      // Must be visually close (pHash <= 10) or size ratio >= 0.50
      if ((hammingDist !== null && hammingDist <= 10) || sizeRatio >= 0.50) {
        return {
          p1,
          p2,
          patternType: 'editor_tag',
          confidence: 0.92,
          rationaleKo: `사진 보정/필터 편집본 파생 파일명 유추 ('${id1.rawName}' ↔ '${id2.rawName}')`,
          rationaleEn: `Photo editor / filter derivative tag match ('${id1.rawName}' ↔ '${id2.rawName}')`,
        };
      }
    }

    // RULE 5: Camera Mode Match (e.g., "MVIMG_20240501.jpg" ↔ "IMG_20240501.jpg")
    if (
      (id1.detectedPattern === 'camera_mode' || id2.detectedPattern === 'camera_mode') &&
      id1.normalizedBase === id2.normalizedBase &&
      id1.normalizedBase.length >= 4
    ) {
      if ((hammingDist !== null && hammingDist <= 10) || sizeRatio >= 0.60) {
        return {
          p1,
          p2,
          patternType: 'camera_mode',
          confidence: 0.94,
          rationaleKo: `카메라 촬영 모드 파생본(모션포토/인물사진) 유추 ('${id1.rawName}' ↔ '${id2.rawName}')`,
          rationaleEn: `Camera mode variant (Motion Photo / Portrait) inferred ('${id1.rawName}' ↔ '${id2.rawName}')`,
        };
      }
    }

    return null;
  }

  /**
   * Main entry point: Groups photos by filename deductive inference with Union-Find clustering
   */
  public static findInferredGroups(
    photos: PhotoRecord[],
    processedIds: Set<number | string>,
    isCrossFolderOnly = false
  ): DedupeGroup[] {
    const candidates = photos.filter(p => !processedIds.has(p.id || p.originalId));
    if (candidates.length < 2) return [];

    // Bucket candidates by primary index keys to avoid O(N^2)
    // Keys include: normalizedBase, timestampSignature
    const bucketMap = new Map<string, PhotoRecord[]>();

    candidates.forEach(photo => {
      const identity = this.analyzeIdentity(photo.path);
      
      // Index by normalizedBase
      if (identity.normalizedBase && identity.normalizedBase.length >= 3) {
        const key = `base:${identity.normalizedBase}`;
        const list = bucketMap.get(key) || [];
        list.push(photo);
        bucketMap.set(key, list);
      }

      // Index by timestampSignature
      if (identity.timestampSignature && identity.timestampSignature.length >= 8) {
        const tsKey = `ts:${identity.timestampSignature}`;
        const list = bucketMap.get(tsKey) || [];
        list.push(photo);
        bucketMap.set(tsKey, list);
      }
    });

    // Union-Find data structures
    const parent = new Map<string, string>();
    const photoMap = new Map<string, PhotoRecord>();
    const pairMetadata = new Map<string, InferredCandidatePair>();

    const getKey = (p: PhotoRecord) => String(p.id || p.originalId);

    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) !== i) {
        parent.set(i, find(parent.get(i)!));
      }
      return parent.get(i)!;
    };

    const union = (p1: PhotoRecord, p2: PhotoRecord, pair: InferredCandidatePair) => {
      const k1 = getKey(p1);
      const k2 = getKey(p2);
      photoMap.set(k1, p1);
      photoMap.set(k2, p2);

      const r1 = find(k1);
      const r2 = find(k2);
      if (r1 !== r2) {
        parent.set(r1, r2);
        pairMetadata.set(`${k1}::${k2}`, pair);
      }
    };

    // Evaluate pairs within buckets
    const evaluatedPairs = new Set<string>();

    bucketMap.forEach((bucketPhotos) => {
      if (bucketPhotos.length < 2) return;
      for (let i = 0; i < bucketPhotos.length; i++) {
        for (let j = i + 1; j < bucketPhotos.length; j++) {
          const p1 = bucketPhotos[i];
          const p2 = bucketPhotos[j];
          const pairKey = [getKey(p1), getKey(p2)].sort().join('::');
          if (evaluatedPairs.has(pairKey)) continue;
          evaluatedPairs.add(pairKey);

          const result = this.evaluateInferredPair(p1, p2);
          if (result) {
            union(p1, p2, result);
          }
        }
      }
    });

    // Assemble clusters
    const clusters = new Map<string, PhotoRecord[]>();
    photoMap.forEach((photo, k) => {
      const root = find(k);
      const list = clusters.get(root) || [];
      list.push(photo);
      clusters.set(root, list);
    });

    const groups: DedupeGroup[] = [];

    clusters.forEach((members, rootKey) => {
      if (members.length < 2) return;

      // Cross folder check if requested
      if (isCrossFolderOnly) {
        const folders = new Set(members.map(p => {
          const norm = p.path.replace(/\\/g, '/');
          const last = norm.lastIndexOf('/');
          return last === -1 ? '/' : norm.substring(0, last);
        }));
        if (folders.size < 2) return;
      }

      // Find representative metadata from pairs
      let representativePair: InferredCandidatePair | undefined;
      for (const [k, pair] of pairMetadata.entries()) {
        const [a, b] = k.split('::');
        if (members.some(m => getKey(m) === a) || members.some(m => getKey(m) === b)) {
          representativePair = pair;
          break;
        }
      }

      const totalSize = members.reduce((sum, p) => sum + (p.size || 0), 0);
      const sortedBySize = [...members].sort((a, b) => (b.size || 0) - (a.size || 0));
      const redundantSize = sortedBySize.slice(1).reduce((sum, p) => sum + (p.size || 0), 0);

      const rationaleKo = representativePair?.rationaleKo || '파일명 유사성 및 패턴 유추 검출';
      const rationaleEn = representativePair?.rationaleEn || 'Inferred duplicate via filename pattern analysis';

      groups.push({
        id: `inferred_filename_${rootKey}_${Date.now()}`,
        type: 'similar',
        subType: 'filename_inferred',
        photos: members,
        totalSize,
        redundantSize,
        confidence: representativePair?.confidence || 0.95,
        reasons: ['filename_inferred', 'similar'],
        similarityPercent: 95,
        matchDetails: {
          namePatternMatch: true,
          inferredByFilename: true,
          inferredPatternType: representativePair?.patternType || 'os_copy',
          inferredRationale: rationaleKo,
        },
      });
    });

    return groups;
  }
}
