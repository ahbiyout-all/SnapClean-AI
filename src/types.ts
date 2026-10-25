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

export type PhotobookTheme = 'classic-hardcover' | 'modern-magazine' | 'vintage-film' | 'art-gallery';
export type StoryTone = 'lyrical' | 'travel' | 'family' | 'minimal';

export type PhotobookPageLayout = 
  | 'cover'
  | 'back-cover'
  | 'full-bleed'
  | 'hero-with-caption'
  | 'duo-vertical'
  | 'trio-collage'
  | 'quad-grid'
  | 'quote-memory';

export interface PhotobookPhoto {
  photoId?: number;
  path: string;
  caption?: string;
  date?: string;
  location?: string;
  rotation?: number; // subtle scrapbook tilt (-3 to 3 deg)
  blurScore?: number;
  aestheticScore?: number;
}

export interface PhotobookChapter {
  id: string;
  title: string;
  subtitle?: string;
  prologue?: string;
  timeRange?: { start: number; end: number };
  locationName?: string;
  heroPhotoPath?: string;
  photoCount?: number;
}

export interface PhotobookPage {
  id: string;
  pageNumber: number; // 0 = Front cover, 1..N = content pages, N+1 = Back cover
  layout: PhotobookPageLayout;
  photos: PhotobookPhoto[];
  chapterTitle?: string;
  subtitle?: string;
  storyNote?: string;
  accentQuote?: string;
}

export interface PhotobookRecord {
  id: string;
  title: string;
  subtitle?: string;
  theme: PhotobookTheme;
  storyTone?: StoryTone;
  chapters?: PhotobookChapter[];
  coverImage?: string;
  coverColor?: string;
  createdAt: number;
  updatedAt: number;
  totalPhotos: number;
  dateRangeText?: string;
  locationSummary?: string;
  bgmType?: 'gentle-piano' | 'warm-vinyl' | 'summer-breeze' | 'none';
  pages: PhotobookPage[];
}
