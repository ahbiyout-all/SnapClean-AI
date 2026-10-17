export interface Photo {
  id?: number;
  originalId?: string;
  path: string;
  size: number;
  date: string;
  type: string;
  aiScore?: number;
  aiTags?: string[];
  category?: string;
  isDeleted?: number;
  isPrivate?: number;
  locationName?: string;
  md5?: string;
  aestheticScore?: number;
  qualityScore?: number;
  qualityTags?: string[];
}

export interface DuplicateGroup {
  id: string;
  type: 'exact' | 'similar';
  photos: Photo[];
  redundantSize?: number;
  confidence?: number;
  reasons?: string[];
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

export interface ScanStats {
  processed: number;
  total: number;
  currentPath: string;
  speed?: number; // files per second (items/sec)
  bytesPerSec?: number; // bytes per second
  etaSeconds?: number; // estimated remaining seconds
  stage?: 'indexing' | 'deep_analysis' | 'funnel_matching';
  phaseName?: string;
  phaseStep?: number;
  totalPhaseSteps?: number;
  discoveredDuplicatesCount?: number;
  discoveredWasteBytes?: number;
  streamingActive?: boolean;
}
