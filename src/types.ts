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
