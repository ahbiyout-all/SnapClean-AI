import React, { useState, useEffect, useRef } from 'react';
import { 
  PhotobookRecord, 
  PhotobookPage, 
  PhotobookPhoto, 
  PhotobookTheme, 
  PhotobookPageLayout,
  StoryTone
} from '../../types';
import { 
  PHOTOBOOK_THEMES, 
  STORY_TONES, 
  enhancePhotobookWithAi, 
  savePhotobook,
  rewritePhotoCaption,
  applyAiNarrativeToPhotobook
} from '../../services/photobookGenerator';
import { generateEventSummary, EventSummary } from '../../services/geminiService';
import { photobookAudio } from '../../utils/photobookAudio';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Music, 
  Printer, 
  Sparkles, 
  Edit3, 
  Check, 
  BookOpen, 
  Sliders, 
  X, 
  Grid, 
  Download, 
  Play, 
  Pause, 
  Film, 
  Wand2, 
  Feather, 
  Compass, 
  Heart,
  RotateCcw,
  Plus,
  Trash2,
  Video,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoRecord } from '../../services/db';
import { libraryManager } from '../../services/PhotoLibraryManager';
import { SystemAPI } from '../../services/systemApi';
import { useI18n } from '../../i18n/context';

interface FlipBookViewerProps {
  photobook: PhotobookRecord;
  onClose?: () => void;
  onUpdate?: (updated: PhotobookRecord) => void;
  isAiConfigured?: boolean;
  onOpenAiKeyModal?: () => void;
  initialTheaterMode?: boolean;
  initialAutoPlay?: boolean;
  initialSpreadIndex?: number;
  isAiNarrativeMode?: boolean;
  onToggleAiNarrativeMode?: () => void;
  onAnimatePhoto?: (photo: PhotoRecord) => void;
  libraryPhotos?: PhotoRecord[];
}

const CURATED_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511497584788-876761c119ef?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-ce74f452623d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
];

export const getFallbackPhotoUrl = (filePath: string): string => {
  if (!filePath) return CURATED_FALLBACK_PHOTOS[0];
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    hash = (hash << 5) - hash + filePath.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURATED_FALLBACK_PHOTOS.length;
  return CURATED_FALLBACK_PHOTOS[index];
};

// Helper to resolve photo thumbnail or full image URL
export const BookPhotoView = ({ 
  photo, 
  className = '', 
  alt = '' 
}: { 
  photo: PhotobookPhoto; 
  className?: string; 
  alt?: string;
}) => {
  const [src, setSrc] = useState<string>(() => {
    if (!photo?.path) return CURATED_FALLBACK_PHOTOS[0];
    if (photo.path.startsWith('http://') || photo.path.startsWith('https://') || photo.path.startsWith('data:')) {
      return photo.path;
    }
    const cached = libraryManager.getBlobUrl(photo.path, () => '');
    if (cached) return cached;
    return getFallbackPhotoUrl(photo.path);
  });

  useEffect(() => {
    let active = true;
    if (!photo?.path) return;

    if (photo.path.startsWith('http://') || photo.path.startsWith('https://') || photo.path.startsWith('data:')) {
      setSrc(photo.path);
      return;
    }

    const cached = libraryManager.getBlobUrl(photo.path, () => '');
    if (cached) {
      setSrc(cached);
      return;
    }

    SystemAPI.getThumbnailData(photo.path).then(tUrl => {
      if (active && tUrl) setSrc(tUrl);
    }).catch(() => {
      if (active) setSrc(getFallbackPhotoUrl(photo.path));
    });

    return () => { active = false; };
  }, [photo?.path]);

  return (
    <img 
      src={src} 
      alt={alt || photo?.caption || ''} 
      className={`object-cover ${className}`}
      loading="lazy"
      onError={(e) => {
        const fallback = getFallbackPhotoUrl(photo?.path || '');
        if (e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
    />
  );
};

export const FlipBookViewer: React.FC<FlipBookViewerProps> = ({
  photobook: initialPhotobook,
  onClose,
  onUpdate,
  isAiConfigured = false,
  onOpenAiKeyModal,
  initialTheaterMode = false,
  initialAutoPlay = false,
  initialSpreadIndex = 0,
  isAiNarrativeMode = false,
  onToggleAiNarrativeMode,
  onAnimatePhoto,
  libraryPhotos = [],
}) => {
  const { language } = useI18n();
  const [book, setBook] = useState<PhotobookRecord>(initialPhotobook);
  const [currentSpread, setCurrentSpread] = useState(initialSpreadIndex);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  
  // Page view mode: 'single' (1-page wide for mobile/wide viewing) vs 'dual' (2-page book spread)
  const [pageViewMode, setPageViewMode] = useState<'single' | 'dual'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'single';
    }
    return 'dual';
  });
  const [singlePageIndex, setSinglePageIndex] = useState<number>(() => {
    if (initialSpreadIndex === 0) return 0;
    return Math.min(initialPhotobook.pages.length - 1, (initialSpreadIndex - 1) * 2 + 1);
  });
  
  // Theater mode & Fullscreen & Wide Spread View
  const [isTheaterMode, setIsTheaterMode] = useState(initialTheaterMode);
  const [isWideSpread, setIsWideSpread] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<any>(null);

  // Auto-play slideshow & transition effects
  const [isAutoPlay, setIsAutoPlay] = useState(initialAutoPlay);
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(5); // 3, 5, 8, 10 seconds
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [transitionEffect, setTransitionEffect] = useState<'3d-flip' | 'smooth-fade' | 'cinematic-slide'>('3d-flip');
  const [showTransitionPicker, setShowTransitionPicker] = useState(false);
  const autoPlayTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Sound & BGM
  const [isMuted, setIsMuted] = useState(photobookAudio.getIsMuted());
  const [isBgmActive, setIsBgmActive] = useState(false);

  // Modals & Drawers
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [isNarrativeRunning, setIsNarrativeRunning] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);

  // 3D Spread & Page DOM refs for IntersectionObserver
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const spreadContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Caption Editing & AI Rewriter
  const [editingPhoto, setEditingPhoto] = useState<{
    pageIndex: number;
    photoIndex: number;
    photo: PhotobookPhoto;
  } | null>(null);
  const [editedCaptionText, setEditedCaptionText] = useState('');
  const [isRewritingCaption, setIsRewritingCaption] = useState(false);
  
  // Layout Editing States
  const [editingLayoutPageIdx, setEditingLayoutPageIdx] = useState<number | null>(null);
  const [swappingPhoto, setSwappingPhoto] = useState<{ pageIdx: number; photoIdx: number } | null>(null);

  const totalPages = book.pages.length;
  const totalSpreads = Math.ceil((totalPages - 1) / 2) + 1;
  const currentTheme = PHOTOBOOK_THEMES.find(t => t.id === book.theme) || PHOTOBOOK_THEMES[0];

  // Sync state when prop updates
  useEffect(() => {
    setBook(initialPhotobook);
  }, [initialPhotobook]);

  // Toggle between 1-page wide and 2-page dual spread
  const handleTogglePageViewMode = (mode: 'single' | 'dual') => {
    if (mode === pageViewMode) return;
    if (mode === 'single') {
      const targetSingle = currentSpread === 0 ? 0 : Math.min(totalPages - 1, (currentSpread - 1) * 2 + 1);
      setSinglePageIndex(targetSingle);
    } else {
      const targetSpread = singlePageIndex === 0 ? 0 : Math.ceil(singlePageIndex / 2);
      setCurrentSpread(Math.min(totalSpreads - 1, targetSpread));
    }
    setPageViewMode(mode);
  };

  // Turn page forward
  const handleNextPage = () => {
    if (isFlipping) return;
    if (pageViewMode === 'single') {
      if (singlePageIndex >= totalPages - 1) return;
      setIsFlipping(true);
      setFlipDirection('next');
      photobookAudio.playPageFlipSound();
      setTimeout(() => {
        setSinglePageIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 350);
    } else {
      if (currentSpread >= totalSpreads - 1) return;
      setIsFlipping(true);
      setFlipDirection('next');
      photobookAudio.playPageFlipSound();
      setTimeout(() => {
        setCurrentSpread(prev => prev + 1);
        setIsFlipping(false);
      }, 450);
    }
  };

  // Turn page back
  const handlePrevPage = () => {
    if (isFlipping) return;
    if (pageViewMode === 'single') {
      if (singlePageIndex <= 0) return;
      setIsFlipping(true);
      setFlipDirection('prev');
      photobookAudio.playPageFlipSound();
      setTimeout(() => {
        setSinglePageIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 350);
    } else {
      if (currentSpread <= 0) return;
      setIsFlipping(true);
      setFlipDirection('prev');
      photobookAudio.playPageFlipSound();
      setTimeout(() => {
        setCurrentSpread(prev => prev - 1);
        setIsFlipping(false);
      }, 450);
    }
  };

  // Slideshow auto-play tick logic
  useEffect(() => {
    if (!isAutoPlay) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setAutoPlayProgress(0);
      return;
    }

    // Stop at final back cover
    const isAtEnd = pageViewMode === 'single' ? singlePageIndex >= totalPages - 1 : currentSpread >= totalSpreads - 1;
    if (isAtEnd) {
      setIsAutoPlay(false);
      return;
    }

    const duration = autoPlayInterval * 1000;
    const stepMs = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += stepMs;
      setAutoPlayProgress(Math.min(100, (elapsed / duration) * 100));
    }, stepMs);

    autoPlayTimerRef.current = setTimeout(() => {
      handleNextPage();
      setAutoPlayProgress(0);
    }, duration);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isAutoPlay, currentSpread, singlePageIndex, totalSpreads, totalPages, pageViewMode, autoPlayInterval]);

  // Mouse idle detection in theater mode
  useEffect(() => {
    const handleMouseMove = () => {
      setControlsVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isTheaterMode) {
        idleTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isTheaterMode]);

  // Toggle Auto-Play with auto-rewind if at end
  const handleToggleAutoPlay = () => {
    const isAtEnd = pageViewMode === 'single' ? singlePageIndex >= totalPages - 1 : currentSpread >= totalSpreads - 1;
    if (!isAutoPlay && isAtEnd) {
      if (pageViewMode === 'single') setSinglePageIndex(0);
      else setCurrentSpread(0);
    }
    setIsAutoPlay(prev => !prev);
  };

  // Dedicated Theater Mode launch with automatic slideshow
  const handleStartTheaterMode = (startAutoPlay: boolean = true) => {
    setIsTheaterMode(true);
    if (startAutoPlay) {
      if (currentSpread >= totalSpreads - 1) {
        setCurrentSpread(0);
      }
      setIsAutoPlay(true);
      if (!isBgmActive && book.bgmType && book.bgmType !== 'none') {
        photobookAudio.startBgm(book.bgmType);
        setIsBgmActive(true);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when editing caption input
      if (editingPhoto) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleToggleAutoPlay();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsTheaterMode(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isTheaterMode) {
          setIsTheaterMode(false);
        } else if (editingPhoto) {
          setEditingPhoto(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSpread, totalSpreads, isFlipping, isTheaterMode, editingPhoto]);

  // Toggle BGM
  const handleToggleBgm = () => {
    if (isBgmActive) {
      photobookAudio.stopBgm();
      setIsBgmActive(false);
    } else {
      photobookAudio.startBgm(book.bgmType && book.bgmType !== 'none' ? book.bgmType : 'gentle-piano');
      setIsBgmActive(true);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = photobookAudio.toggleMute();
    setIsMuted(muted);
  };

  // AI Story Refinement
  const handleAiEnhance = async (tone?: StoryTone) => {
    if (!isAiConfigured) {
      onOpenAiKeyModal?.();
      return;
    }
    setIsAiEnhancing(true);
    try {
      const allPhotos = book.pages.flatMap(p => p.photos).map((bp, i) => ({
        id: bp.photoId || i,
        originalId: `bp-${i}`,
        path: bp.path,
        size: 1000,
        lastModified: Date.now(),
        type: 'image/jpeg',
        status: 'analyzed' as const,
        description: bp.caption,
        category: bp.location || 'Memory',
        locationName: bp.location,
      }));

      const targetBook = tone ? { ...book, storyTone: tone } : book;
      const enhanced = await enhancePhotobookWithAi(targetBook, allPhotos);
      setBook({ ...enhanced });
      await savePhotobook(enhanced);
      onUpdate?.(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiEnhancing(false);
      setShowTonePicker(false);
    }
  };

  // Trigger AI Narrative (generateEventSummary + auto-populate captions across all pages)
  const handleTriggerNarrative = async () => {
    setIsNarrativeRunning(true);
    try {
      const { updatedBook } = await applyAiNarrativeToPhotobook(book);
      setBook({ ...updatedBook });
      onUpdate?.(updatedBook);
    } catch (e) {
      console.error('[FlipBook AI Narrative Error]:', e);
    } finally {
      setIsNarrativeRunning(false);
    }
  };

  const updatedSpreadNarrativesRef = useRef<Set<string>>(new Set());

  // Change Theme
  const handleChangeTheme = (themeId: PhotobookTheme) => {
    const updated = { ...book, theme: themeId, updatedAt: Date.now() };
    setBook(updated);
    savePhotobook(updated);
    onUpdate?.(updated);
  };

  // Open Caption Editor
  const handleOpenCaptionEditor = (pageIndex: number, photoIndex: number, photo: PhotobookPhoto) => {
    setEditingPhoto({ pageIndex, photoIndex, photo });
    setEditedCaptionText(photo.caption || '');
  };

  // Save Edited Caption
  const handleSaveCaption = async () => {
    if (!editingPhoto) return;
    const { pageIndex, photoIndex } = editingPhoto;
    const updatedPages = [...book.pages];
    if (updatedPages[pageIndex] && updatedPages[pageIndex].photos[photoIndex]) {
      updatedPages[pageIndex].photos[photoIndex].caption = editedCaptionText;
      const updatedBook = { ...book, pages: updatedPages, updatedAt: Date.now() };
      setBook(updatedBook);
      await savePhotobook(updatedBook);
      onUpdate?.(updatedBook);
    }
    setEditingPhoto(null);
  };

  // Single Photo Caption AI Rewriter
  const handleRewriteCaptionWithTone = async (tone: StoryTone) => {
    if (!editingPhoto) return;
    setIsRewritingCaption(true);
    try {
      const newCaption = await rewritePhotoCaption(editingPhoto.photo, tone);
      setEditedCaptionText(newCaption);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRewritingCaption(false);
    }
  };

  // Print to PDF
  const handlePrint = () => {
    window.print();
  };

  // Request AI Motion generation for a specific photo in the book
  const handleRequestAnimate = (photo: PhotobookPhoto) => {
    if (!onAnimatePhoto) return;
    const fullRecord = libraryPhotos?.find(p => p.id === photo.photoId);
    if (fullRecord) {
      onAnimatePhoto(fullRecord);
    } else {
      // Fallback if ID matching fails - build a minimal record from path
      onAnimatePhoto({
        path: photo.path,
        id: photo.photoId,
        size: 0,
        lastModified: Date.now(),
        type: 'image/jpeg',
        status: 'analyzed',
      } as any);
    }
  };

  // Change Page Layout
  const handleChangePageLayout = (pageIdx: number, layout: PhotobookPageLayout) => {
    const updatedPages = [...book.pages];
    const page = updatedPages[pageIdx];
    if (!page) return;

    // Adjust photos array length to match layout if needed (fill with empty if fewer, slice if more)
    // For now we just change the layout enum; the UI handles the mapping
    updatedPages[pageIdx] = { ...page, layout };
    const updatedBook = { ...book, pages: updatedPages, updatedAt: Date.now() };
    setBook(updatedBook);
    savePhotobook(updatedBook);
    onUpdate?.(updatedBook);
    setEditingLayoutPageIdx(null);
  };

  // Swap Photos within a page or across pages (if we implement multi-page swap)
  const handleSwapPhotos = (targetPageIdx: number, targetPhotoIdx: number) => {
    if (!swappingPhoto) {
      setSwappingPhoto({ pageIdx: targetPageIdx, photoIdx: targetPhotoIdx });
      return;
    }

    const { pageIdx: sourcePageIdx, photoIdx: sourcePhotoIdx } = swappingPhoto;
    
    // Only support swapping within the same page for now (as requested: "internal photo positions")
    if (sourcePageIdx !== targetPageIdx) {
      setSwappingPhoto(null);
      return;
    }

    const updatedPages = [...book.pages];
    const page = { ...updatedPages[targetPageIdx] };
    const updatedPhotos = [...page.photos];
    
    // Swap elements
    const temp = updatedPhotos[sourcePhotoIdx];
    updatedPhotos[sourcePhotoIdx] = updatedPhotos[targetPhotoIdx];
    updatedPhotos[targetPhotoIdx] = temp;
    
    page.photos = updatedPhotos;
    updatedPages[targetPageIdx] = page;
    
    const updatedBook = { ...book, pages: updatedPages, updatedAt: Date.now() };
    setBook(updatedBook);
    savePhotobook(updatedBook);
    onUpdate?.(updatedBook);
    setSwappingPhoto(null);
  };

  // Add a new empty page
  const handleAddPage = (atIndex: number) => {
    const updatedPages = [...book.pages];
    
    // Create new content page
    const newPage: PhotobookPage = {
      id: `page-new-${Date.now()}`,
      pageNumber: atIndex + 1,
      layout: 'hero-with-caption',
      photos: [],
      chapterTitle: updatedPages[atIndex]?.chapterTitle || 'New Chapter',
      subtitle: 'Memories continue...',
      storyNote: '추가된 새로운 페이지입니다. 사진을 채워보세요.'
    };

    // Insert new page
    updatedPages.splice(atIndex + 1, 0, newPage);

    // If total pages is now odd, add a padding page before the back cover
    // to maintain even spreads (Cover + Inner Spreads + Back Cover)
    if (updatedPages.length % 2 !== 0) {
      const backCover = updatedPages.pop()!;
      updatedPages.push({
        id: `page-padding-${Date.now()}`,
        pageNumber: updatedPages.length,
        layout: 'quote-memory',
        photos: [],
        chapterTitle: language === 'ko' ? '추억의 여백' : 'Echoes of Serenity',
        subtitle: 'Padding Page',
        storyNote: language === 'ko' ? '조판 균형을 위한 여백입니다.' : 'A quiet space for your memories.'
      });
      updatedPages.push(backCover);
    }

    // Re-index all pages
    const finalPages = updatedPages.map((p, idx) => ({
      ...p,
      pageNumber: idx
    }));

    const updatedBook = { ...book, pages: finalPages, updatedAt: Date.now() };
    setBook(updatedBook);
    savePhotobook(updatedBook);
    onUpdate?.(updatedBook);
    setEditingLayoutPageIdx(null);
  };

  // Delete a page
  const handleDeletePage = (atIndex: number) => {
    // Don't allow deleting cover or back cover
    if (atIndex === 0 || atIndex === book.pages.length - 1) return;
    
    if (!confirm(language === 'ko' ? '이 페이지를 삭제하시겠습니까?' : 'Delete this page?')) return;

    const updatedPages = [...book.pages];
    updatedPages.splice(atIndex, 1);

    // If total pages is now odd, we need to handle it.
    // Simple approach: remove the last content page if it's a padding page, or add one.
    if (updatedPages.length % 2 !== 0) {
      const lastContentIdx = updatedPages.length - 2;
      if (updatedPages[lastContentIdx]?.id.includes('padding') || updatedPages[lastContentIdx]?.layout === 'quote-memory') {
        updatedPages.splice(lastContentIdx, 1);
      } else {
        const backCover = updatedPages.pop()!;
        updatedPages.push({
          id: `page-padding-${Date.now()}`,
          pageNumber: updatedPages.length,
          layout: 'quote-memory',
          photos: [],
          chapterTitle: language === 'ko' ? '추억의 여백' : 'Echoes of Serenity',
          subtitle: 'Padding Page',
          storyNote: language === 'ko' ? '조판 균형을 위한 여백입니다.' : 'A quiet space for your memories.'
        });
        updatedPages.push(backCover);
      }
    }

    // Re-index all pages
    const finalPages = updatedPages.map((p, idx) => ({
      ...p,
      pageNumber: idx
    }));

    const updatedBook = { ...book, pages: finalPages, updatedAt: Date.now() };
    setBook(updatedBook);
    savePhotobook(updatedBook);
    onUpdate?.(updatedBook);
    setEditingLayoutPageIdx(null);
    
    // Adjust current spread if needed
    const newTotalSpreads = Math.ceil((finalPages.length - 1) / 2) + 1;
    if (currentSpread >= newTotalSpreads) {
      setCurrentSpread(Math.max(0, newTotalSpreads - 1));
    }
  };

  // Export self-contained HTML book
  const handleExportHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${book.title} - SnapClean AI Photobook</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { background-color: #07090e; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .book-spread { display: flex; max-width: 1000px; margin: 40px auto; background: #faf7f2; color: #1e293b; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border-radius: 8px; overflow: hidden; }
    .page { flex: 1; padding: 32px; min-height: 600px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid #e2e8f0; }
    img { border-radius: 6px; object-fit: cover; width: 100%; }
    @media print { body { background: white; color: black; } .book-spread { page-break-after: always; box-shadow: none; } }
  </style>
</head>
<body class="p-6">
  <header class="text-center max-w-xl mx-auto my-8">
    <h1 class="text-3xl font-bold mb-2">${book.title}</h1>
    <p class="text-slate-400 text-sm">${book.subtitle || ''} • ${book.dateRangeText || ''}</p>
  </header>
  <main>
    ${book.pages.map((page) => `
      <div class="book-spread">
        <div class="page">
          <div>
            <span class="text-xs font-bold text-indigo-600 tracking-wider uppercase">${page.chapterTitle || 'Memory'}</span>
            <h2 class="text-lg font-bold mt-1">${page.subtitle || ''}</h2>
            <p class="text-xs text-slate-500 mt-2 italic">${page.storyNote || ''}</p>
          </div>
          <div class="my-4">
            ${page.photos.map(p => `
              <div class="mb-3">
                <img src="${p.path}" alt="${p.caption || ''}" style="max-height: 380px;">
                <p class="text-[11px] text-slate-500 mt-1">${p.caption || ''}</p>
              </div>
            `).join('')}
          </div>
          <div class="text-[10px] text-slate-400 text-right">Page ${page.pageNumber + 1}</div>
        </div>
      </div>
    `).join('')}
  </main>
  <footer class="text-center text-xs text-slate-500 my-12">
    Generated with SnapClean AI Photobook Engine 2.0
  </footer>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_Photobook.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine which pages to display on left and right
  const isCoverSpread = currentSpread === 0;
  const isBackCoverSpread = currentSpread === totalSpreads - 1;

  let leftPageIndex = -1;
  let rightPageIndex = -1;

  if (isCoverSpread) {
    rightPageIndex = 0; // Cover sits on right side in open presentation
  } else if (isBackCoverSpread) {
    leftPageIndex = totalPages - 1; // Back cover sits on left
  } else {
    leftPageIndex = (currentSpread - 1) * 2 + 1;
    rightPageIndex = (currentSpread - 1) * 2 + 2;
  }

  const leftPage = leftPageIndex >= 0 && leftPageIndex < totalPages ? book.pages[leftPageIndex] : null;
  const rightPage = rightPageIndex >= 0 && rightPageIndex < totalPages ? book.pages[rightPageIndex] : null;

  // Attach IntersectionObserver to the 3D photobook pages to trigger generateEventSummary for currently visible chapter images
  useEffect(() => {
    if (!isAiNarrativeMode) {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    const currentPages: PhotobookPage[] = [];
    if (pageViewMode === 'single') {
      if (book.pages[singlePageIndex]) currentPages.push(book.pages[singlePageIndex]);
    } else {
      if (leftPage) currentPages.push(leftPage);
      if (rightPage) currentPages.push(rightPage);
    }

    if (currentPages.length === 0) return;

    const chapterName = currentPages[0]?.chapterTitle || 'Memory';
    const spreadKey = `${book.id}_ch_${chapterName}_${pageViewMode}_${pageViewMode === 'single' ? singlePageIndex : currentSpread}`;

    const triggerNarrativeUpdate = async () => {
      if (updatedSpreadNarrativesRef.current.has(spreadKey)) {
        return;
      }
      updatedSpreadNarrativesRef.current.add(spreadKey);
      setIsNarrativeRunning(true);

      try {
        const spreadPhotos = currentPages.flatMap(p => p.photos);
        const tags = [
          chapterName,
          ...currentPages.map(p => p.subtitle).filter(Boolean) as string[],
          ...spreadPhotos.map(ph => ph.location).filter(Boolean) as string[],
          ...spreadPhotos.map(ph => ph.caption).filter(Boolean) as string[],
          book.title,
          book.storyTone || 'lyrical',
        ].filter(t => typeof t === 'string' && t.trim().length > 0);

        const uniqueTags = Array.from(new Set(tags)).slice(0, 12);
        const summary: EventSummary = await generateEventSummary(
          uniqueTags.length > 0 ? uniqueTags : ['Memories', 'Photobook Event', 'Cherished Chapter'],
          book.storyTone || 'lyrical'
        );

        const mood = summary.mood || 'Sentimental';
        const cleanStory = summary.story?.trim() || 'A cherished collection of captured memories.';
        const storySentences = cleanStory.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
        const firstSentence = storySentences[0] || cleanStory;

        // Context-aware emotional & descriptive captions generated for visible chapter images
        const updatedPages = book.pages.map((page, pageIdx) => {
          const isTargetChapterPage = currentPages.some(cp => cp.id === page.id || cp.pageNumber === page.pageNumber) ||
            page.chapterTitle === chapterName;

          if (!isTargetChapterPage) return page;

          const updatedPhotos = page.photos.map((ph, pIdx) => {
            const loc = ph.location ? `${ph.location} · ` : '';
            const dateText = ph.date ? `${ph.date} · ` : '';

            const emotionalTemplates = [
              `${loc}${firstSentence}`,
              `${loc}[${mood}] 마음에 스며든 따스한 온기와 잊지 못할 찰나의 미소.`,
              `바람결에 실려 온 그날의 향기, 영원히 간직하고픈 소중한 기억.`,
              `${dateText}빛과 그림자가 수놓은 우리들의 가장 찬란했던 오후.`,
              `함께여서 더없이 애틋하고 아름다웠던 우리들의 다정한 시간.`,
              `${loc}시간이 멈추었으면 했던 순간, 마음에 새겨진 영혼의 풍경.`,
              `작은 웃음소리마저 보석처럼 빛나던 잊을 수 없는 그날의 기억.`,
              `[${mood}] 일상의 모든 순간이 기적이 되었던 특별한 하루.`,
              `${loc}${dateText}발길 닿는 곳마다 마주한 다정하고 눈부신 삶의 한 장면.`
            ];

            const chosen = emotionalTemplates[(pageIdx * 3 + pIdx) % emotionalTemplates.length];
            return {
              ...ph,
              caption: chosen,
            };
          });

          return {
            ...page,
            chapterTitle: summary.title || page.chapterTitle || 'Chapter Memory',
            subtitle: summary.mood ? `[${summary.mood}] ${summary.title}` : page.subtitle,
            storyNote: summary.story || page.storyNote,
            accentQuote: `"${firstSentence}"`,
            photos: updatedPhotos
          };
        });

        // Update book chapters metadata
        const updatedChapters = book.chapters?.map(ch => {
          if (ch.title === chapterName || currentPages.some(cp => cp.chapterTitle === ch.title)) {
            return {
              ...ch,
              title: summary.title || ch.title,
              subtitle: summary.mood ? `Mood: ${summary.mood}` : ch.subtitle,
              prologue: summary.story || ch.prologue,
            };
          }
          return ch;
        });

        const updatedBook: PhotobookRecord = {
          ...book,
          pages: updatedPages,
          chapters: updatedChapters,
          updatedAt: Date.now()
        };

        setBook(updatedBook);
        await savePhotobook(updatedBook);
        onUpdate?.(updatedBook);
      } catch (err) {
        console.warn('[AI Narrative Observer Update Error]:', err);
      } finally {
        setIsNarrativeRunning(false);
      }
    };

    // Attach IntersectionObserver to 3D photobook pages
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15);
        if (isVisible) {
          triggerNarrativeUpdate();
        }
      },
      {
        threshold: [0.15, 0.4, 0.7],
        root: null,
      }
    );

    observerRef.current = observer;
    if (spreadContainerRef.current) observer.observe(spreadContainerRef.current);
    if (leftPageRef.current) observer.observe(leftPageRef.current);
    if (rightPageRef.current) observer.observe(rightPageRef.current);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [currentSpread, singlePageIndex, pageViewMode, isAiNarrativeMode, leftPage, rightPage, book]);

  // Render a specific page content based on layout
  const renderPageContent = (page: PhotobookPage, isLeft: boolean, pageIdx: number) => {
    const isCover = page.layout === 'cover';
    const isBackCover = page.layout === 'back-cover';

    if (isCover) {
      return (
        <div className={`w-full h-full p-2.5 sm:p-6 md:p-12 flex flex-col justify-between rounded-r-2xl shadow-2xl relative overflow-hidden ${currentTheme.coverBg}`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-linear-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />

          <div className="border border-current/25 p-2.5 sm:p-6 h-full flex flex-col justify-between rounded-xl relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 flex items-center gap-1.5">
                  <Sparkles size={12} /> SnapClean AI Memoir Edition
                </span>
                <span className="text-[10px] font-mono opacity-60">
                  {book.dateRangeText}
                </span>
              </div>
              <h1 className={`text-3xl md:text-5xl font-black italic tracking-tight mb-2 leading-tight ${currentTheme.fontClass}`}>
                {book.title}
              </h1>
              <p className="text-sm md:text-base opacity-80 font-light italic">
                {book.subtitle}
              </p>
            </div>

            {page.photos[0] && (
              <div className="my-6 aspect-4/3 w-full rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 relative group">
                <BookPhotoView photo={page.photos[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <p className="text-xs text-white/90 font-medium truncate">
                    {page.photos[0].caption || book.locationSummary}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-end pt-4 border-t border-current/20">
              <div>
                <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest">
                  Total Photos: {book.totalPhotos} Curated Best Shots
                </p>
                <p className="text-xs font-semibold opacity-90 mt-0.5">
                  {book.locationSummary}
                </p>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded border border-current/30">
                Bound Archive
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isBackCover) {
      return (
        <div className={`w-full h-full p-8 md:p-12 flex flex-col justify-between rounded-l-2xl shadow-2xl relative overflow-hidden ${currentTheme.coverBg}`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-linear-to-l from-black/50 via-black/20 to-transparent pointer-events-none" />

          <div className="border border-current/25 p-8 h-full flex flex-col justify-between rounded-xl relative text-center">
            <div className="pt-8">
              <BookOpen size={36} className="mx-auto mb-4 opacity-75" />
              <h3 className={`text-2xl font-bold tracking-tight mb-2 ${currentTheme.fontClass}`}>
                {page.chapterTitle || 'Epilogue'}
              </h3>
              <p className="text-xs md:text-sm opacity-80 max-w-sm mx-auto leading-relaxed whitespace-pre-line mt-4">
                {page.storyNote || '수많은 사진 중 가장 아름다운 순간만을 엄선하여 엮어낸 소중한 디지털 사진첩입니다.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-24 h-0.5 bg-current opacity-30 mx-auto" />
              <p className="text-[11px] font-mono opacity-60">
                SnapClean AI • Digital Photobook 2.0
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Inside Pages
    return (
      <div className={`w-full h-full p-2.5 sm:p-5 md:p-8 flex flex-col justify-between ${currentTheme.pageBg} relative select-none overflow-hidden ${
        isLeft ? 'rounded-l-xl border-r border-black/10' : 'rounded-r-xl border-l border-black/10'
      }`}>
        {/* Subtle center spine shadow */}
        <div className={`absolute top-0 bottom-0 w-8 pointer-events-none ${
          isLeft 
            ? 'right-0 bg-linear-to-l from-black/15 to-transparent' 
            : 'left-0 bg-linear-to-r from-black/15 to-transparent'
        }`} />

        {/* 🛠️ Page Layout Editor Trigger */}
        <div className={`absolute top-14 ${isLeft ? 'left-6' : 'right-6'} z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            onClick={() => setEditingLayoutPageIdx(editingLayoutPageIdx === pageIdx ? null : pageIdx)}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 shadow-xl border border-slate-200 transition-all flex items-center gap-1.5 text-[10px] font-bold"
            title="페이지 레이아웃 변경"
          >
            <Grid size={14} className="text-indigo-600" />
            <span>레이아웃</span>
          </button>
          
          {editingLayoutPageIdx === pageIdx && (
            <div className={`absolute top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 ${isLeft ? 'left-0' : 'right-0'} grid grid-cols-2 gap-1.5`}>
              {(['full-bleed', 'hero-with-caption', 'duo-vertical', 'trio-collage', 'quad-grid', 'quote-memory'] as PhotobookPageLayout[]).map((lo) => (
                <button
                  key={lo}
                  onClick={() => handleChangePageLayout(pageIdx, lo)}
                  className={`p-2 rounded-lg text-[9px] font-bold border transition-all ${
                    page.layout === lo 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                      : 'hover:bg-slate-50 border-slate-100 text-slate-500'
                  }`}
                >
                  {lo.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
              
              <div className="col-span-2 h-px bg-slate-100 my-1" />
              
              <button
                onClick={() => handleAddPage(pageIdx)}
                className="col-span-2 p-2 rounded-lg text-[9px] font-bold border border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={12} />
                <span>{language === 'ko' ? '뒤에 페이지 추가' : 'Add Page After'}</span>
              </button>

              <button
                onClick={() => handleDeletePage(pageIdx)}
                className="col-span-2 p-2 rounded-lg text-[9px] font-bold border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>{language === 'ko' ? '현재 페이지 삭제' : 'Delete Page'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div className="truncate max-w-[80%]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block truncate">
                {page.chapterTitle || 'Memory'}
              </span>
              {isAiNarrativeMode && (
                <span className="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0 font-semibold shadow-xs">
                  <Sparkles size={8} className="text-amber-500" />
                  AI Narrative
                </span>
              )}
            </div>
            {page.subtitle && (
              <h4 className="text-xs font-semibold text-slate-800 truncate">
                {page.subtitle}
              </h4>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            P.{page.pageNumber}
          </span>
        </div>

        {/* Main Page Layout Content */}
        <div className="flex-1 my-3 flex flex-col justify-center">
          {page.layout === 'full-bleed' && page.photos[0] && (
            <div className="w-full h-full max-h-[460px] rounded-lg overflow-hidden shadow-lg relative group">
              <BookPhotoView photo={page.photos[0]} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs text-white/95 font-medium leading-relaxed">
                    {page.photos[0].caption}
                  </p>
                  {page.photos[0].date && (
                    <p className="text-[10px] text-white/70 font-mono mt-0.5">
                      {page.photos[0].date} {page.photos[0].location ? `• ${page.photos[0].location}` : ''}
                    </p>
                  )}
                </div>
                  <div className="flex gap-1.5">
                    {onAnimatePhoto && (
                      <button
                        onClick={() => handleRequestAnimate(page.photos[0])}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-indigo-300 hover:text-indigo-200 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="AI 모션 비디오 생성"
                      >
                        <Video size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleSwapPhotos(pageIdx, 0)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                        swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === 0
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                      }`}
                      title="사진 위치 교환 (Click to swap)"
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenCaptionEditor(pageIdx, 0, page.photos[0])}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="캡션 수정 및 AI 재작성"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
              </div>
            </div>
          )}

          {page.layout === 'hero-with-caption' && page.photos[0] && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex-1 max-h-[350px] rounded-lg overflow-hidden shadow-md relative group">
                <BookPhotoView photo={page.photos[0]} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={() => handleSwapPhotos(pageIdx, 0)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                      swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === 0
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                    }`}
                    title="사진 위치 교환"
                  >
                    <RotateCcw size={13} />
                  </button>
                  {onAnimatePhoto && (
                    <button
                      onClick={() => handleRequestAnimate(page.photos[0])}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-indigo-300 hover:text-indigo-200 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="AI 모션 비디오 생성"
                    >
                      <Video size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenCaptionEditor(pageIdx, 0, page.photos[0])}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title="캡션 수정 및 AI 재작성"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-black/5">
                <p className="text-xs leading-relaxed text-slate-700 italic">
                  "{page.photos[0].caption}"
                </p>
                {page.storyNote && (
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    {page.storyNote}
                  </p>
                )}
              </div>
            </div>
          )}

          {page.layout === 'duo-vertical' && (
            <div className="grid grid-cols-2 gap-3 h-full max-h-[440px]">
              {page.photos.slice(0, 2).map((p, pIdx) => (
                <div key={pIdx} className="flex flex-col h-full">
                  <div className="flex-1 rounded-lg overflow-hidden shadow-sm relative group bg-black/5">
                    <BookPhotoView photo={p} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => handleSwapPhotos(pageIdx, pIdx)}
                        className={`p-1 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                          swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === pIdx
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                        }`}
                        title="사진 위치 교환"
                      >
                        <RotateCcw size={11} />
                      </button>
                      {onAnimatePhoto && (
                        <button
                          onClick={() => handleRequestAnimate(p)}
                          className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-indigo-300 hover:text-indigo-200 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="AI 모션 비디오 생성"
                        >
                          <Video size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenCaptionEditor(pageIdx, pIdx, p)}
                        className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="캡션 수정 및 AI 재작성"
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1.5 line-clamp-2 leading-tight">
                    {p.caption}
                  </p>
                </div>
              ))}
            </div>
          )}

          {page.layout === 'trio-collage' && (
            <div className="grid grid-cols-2 gap-2.5 h-full max-h-[440px]">
              {page.photos[0] && (
                <div className="row-span-2 rounded-lg overflow-hidden shadow-sm relative group bg-black/5">
                  <BookPhotoView photo={page.photos[0]} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => handleSwapPhotos(pageIdx, 0)}
                      className={`p-1 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                        swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === 0
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                      }`}
                      title="사진 위치 교환"
                    >
                      <RotateCcw size={11} />
                    </button>
                    <button
                      onClick={() => handleOpenCaptionEditor(pageIdx, 0, page.photos[0])}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="캡션 수정 및 AI 재작성"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                </div>
              )}
              {page.photos.slice(1, 3).map((p, pIdx) => (
                <div key={pIdx} className="rounded-lg overflow-hidden shadow-sm relative group bg-black/5">
                  <BookPhotoView photo={p} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => handleSwapPhotos(pageIdx, pIdx + 1)}
                      className={`p-1 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                        swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === pIdx + 1
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                      }`}
                      title="사진 위치 교환"
                    >
                      <RotateCcw size={11} />
                    </button>
                    <button
                      onClick={() => handleOpenCaptionEditor(pageIdx, pIdx + 1, p)}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="캡션 수정 및 AI 재작성"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {page.layout === 'quad-grid' && (
            <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full max-h-[440px]">
              {page.photos.slice(0, 4).map((p, pIdx) => (
                <div key={pIdx} className="rounded-lg overflow-hidden shadow-xs relative group bg-black/5">
                  <BookPhotoView photo={p} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button
                      onClick={() => handleSwapPhotos(pageIdx, pIdx)}
                      className={`p-1 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
                        swappingPhoto?.pageIdx === pageIdx && swappingPhoto?.photoIdx === pIdx
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white'
                      }`}
                      title="사진 위치 교환"
                    >
                      <RotateCcw size={10} />
                    </button>
                    <button
                      onClick={() => handleOpenCaptionEditor(pageIdx, pIdx, p)}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="캡션 수정 및 AI 재작성"
                    >
                      <Edit3 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {page.layout === 'quote-memory' && (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full">
              <div className="w-12 h-12 rounded-full bg-slate-900/5 flex items-center justify-center mb-6">
                <BookOpen size={24} className="text-slate-400" />
              </div>
              <h3 className={`text-xl md:text-2xl font-serif italic text-slate-800 mb-4 ${currentTheme.fontClass}`}>
                "{page.accentQuote || '우리가 기억하는 것은 날들이 아니라 순간들이다.'}"
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                {page.storyNote}
              </p>
            </div>
          )}
        </div>

        {/* Page Footer */}
        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>{book.title}</span>
          <span>{page.photos[0]?.location || book.locationSummary}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col ${
      isTheaterMode 
        ? 'fixed inset-0 z-[1000] bg-[#07090e] overflow-hidden' 
        : 'w-full h-[88vh] bg-slate-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden'
    }`}>
      {/* 🎬 Theater Mode Ambient Backlight Glow */}
      {isTheaterMode && (
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-1000 blur-3xl opacity-40 scale-125"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentTheme.ambientGlow || 'rgba(99,102,241,0.2)'} 0%, transparent 70%)`
          }}
        />
      )}

      {/* 🎬 Theater Mode Floating Exit Indicator (when controls auto-hidden) */}
      {isTheaterMode && !controlsVisible && (
        <button
          onClick={() => setIsTheaterMode(false)}
          className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white text-[11px] font-mono border border-white/10 backdrop-blur-md transition-all cursor-pointer opacity-50 hover:opacity-100 flex items-center gap-1.5"
          title="극장 모드 종료 (Esc)"
        >
          <Minimize2 size={12} />
          <span>극장 모드 종료 (Esc)</span>
        </button>
      )}

      {/* Top Header / Bar */}
      <AnimatePresence>
        {(!isTheaterMode || controlsVisible) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center justify-between p-3 md:p-4 border-b z-50 shrink-0 backdrop-blur-xl ${
              isTheaterMode 
                ? 'absolute top-0 left-0 right-0 bg-slate-950/80 border-white/5' 
                : 'bg-slate-900/90 border-white/10'
            }`}
          >
            {/* Left: Book Meta */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="닫기 (Close)"
                >
                  <X size={16} className="sm:size-[18px]" />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs md:max-w-md">
                    {book.title}
                  </h2>
                  <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    3D FLIPBOOK
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate max-w-[160px] sm:max-w-none">
                  {book.dateRangeText} • {book.totalPhotos} Best Shots
                </p>
              </div>
            </div>

            {/* 🔄 Swapping Mode Hint */}
            {swappingPhoto && (
              <div className="absolute left-1/2 -translate-x-1/2 top-20 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                <RotateCcw size={14} />
                <span>{language === 'ko' ? '교환할 다른 사진을 클릭하세요' : 'Select another photo to swap positions'}</span>
                <button onClick={() => setSwappingPhoto(null)} className="ml-2 bg-black/20 hover:bg-black/30 rounded-full p-0.5">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Center: Spread Navigation & Slideshow Auto-Play */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/60 p-1 rounded-2xl border border-white/10">
              <button 
                onClick={handlePrevPage}
                disabled={(pageViewMode === 'single' ? singlePageIndex <= 0 : currentSpread <= 0) || isFlipping}
                className="p-1.5 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all text-slate-300"
                title="이전 페이지 (Previous)"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-xs font-mono font-bold px-1.5 sm:px-2 text-slate-200">
                {pageViewMode === 'single' ? (
                  `P.${singlePageIndex + 1} / ${totalPages}`
                ) : (
                  currentSpread === 0 ? '표지 (Cover)' : currentSpread === totalSpreads - 1 ? '뒷표지 (End)' : `${currentSpread} / ${totalSpreads - 2}`
                )}
              </span>

              <button 
                onClick={handleNextPage}
                disabled={(pageViewMode === 'single' ? singlePageIndex >= totalPages - 1 : currentSpread >= totalSpreads - 1) || isFlipping}
                className="p-1.5 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all text-slate-300"
                title="다음 페이지 (Next)"
              >
                <ChevronRight size={18} />
              </button>

              <div className="h-4 w-px bg-white/10 mx-0.5" />

              {/* View Mode Toggle: 1페이지 와이드 vs 2페이지 양면 */}
              <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => handleTogglePageViewMode('single')}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    pageViewMode === 'single'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="1페이지 와이드 화면 모드 (모바일 화면 가득 채움)"
                >
                  <Smartphone size={12} />
                  <span className="hidden xs:inline">1페이지 와이드</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePageViewMode('dual')}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    pageViewMode === 'dual'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="2페이지 양면 책장 넘김 모드"
                >
                  <BookOpen size={12} />
                  <span className="hidden xs:inline">2페이지 양면</span>
                </button>
              </div>

              <div className="h-4 w-px bg-white/10 mx-0.5" />

              {/* ⏱️ Auto-Play Slideshow Button with Circular Countdown Ring */}
              <button
                onClick={handleToggleAutoPlay}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isAutoPlay 
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/20' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
                title={isAutoPlay ? "슬라이드쇼 일시정지 (Pause Slideshow)" : "슬라이드쇼 자동 재생 (Auto-Play Slideshow)"}
              >
                {isAutoPlay ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
                <span className="hidden sm:inline">
                  {isAutoPlay ? '재생 중' : '슬라이드쇼'}
                </span>

                {isAutoPlay && (
                  <svg className="w-3.5 h-3.5 -rotate-90">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                    <circle 
                      cx="7" cy="7" r="5" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      fill="none" 
                      strokeDasharray="31.4"
                      strokeDashoffset={31.4 - (31.4 * autoPlayProgress) / 100}
                      className="transition-all duration-100"
                    />
                  </svg>
                )}
              </button>

              {/* Slideshow Interval Selector */}
              {isAutoPlay && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 pl-1">
                  {[3, 5, 8].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setAutoPlayInterval(sec)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        autoPlayInterval === sec ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-white/10'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Tools: Audio, Theme, Tone, AI, Fullscreen Theater */}
            <div className="flex items-center gap-1.5">
              {/* BGM Toggle */}
              <button 
                onClick={handleToggleBgm}
                className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isBgmActive 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isBgmActive ? "BGM 끄기" : "배경음악 켜기"}
              >
                <Music size={15} className={isBgmActive ? "animate-bounce" : ""} />
              </button>

              {/* Sound FX Mute Toggle */}
              <button 
                onClick={handleToggleMute}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title={isMuted ? "소리 켜기" : "소리 음소거"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Theme Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  title="테마 스타일 변경"
                >
                  <Sliders size={15} />
                </button>

                {showThemePicker && (
                  <div className="absolute right-0 top-12 w-64 bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl z-50 space-y-1.5 backdrop-blur-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 py-1">
                      사진첩 테마
                    </div>
                    {PHOTOBOOK_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          handleChangeTheme(theme.id);
                          setShowThemePicker(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          book.theme === theme.id 
                            ? 'bg-indigo-600 text-white font-bold' 
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{theme.nameKo}</div>
                          <div className="text-[10px] opacity-70">{theme.name}</div>
                        </div>
                        {book.theme === theme.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ✨ Persistent AI Narrative Mode Toggle Button */}
              <button
                type="button"
                onClick={onToggleAiNarrativeMode || handleTriggerNarrative}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg border ${
                  isAiNarrativeMode
                    ? 'bg-gradient-to-r from-purple-600 via-rose-600 to-indigo-600 text-white border-rose-400/80 shadow-rose-600/30 ring-2 ring-rose-400/50 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white border-transparent hover:from-amber-400 hover:to-indigo-500 shadow-rose-500/25'
                }`}
                title="AI 내러티브 모드 토글 (Automatically updates chapter headers & descriptions as you scroll)"
              >
                <Sparkles size={14} className={isNarrativeRunning ? "animate-spin text-amber-200" : "text-amber-200"} />
                <span className="hidden md:inline">
                  {isNarrativeRunning 
                    ? "내러티브 작성 중..." 
                    : isAiNarrativeMode 
                      ? "AI Narrative Mode: ON" 
                      : "Enable AI Narrative Mode"}
                </span>
              </button>

              {/* AI Poetic Story Enhance Button with Tone Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowTonePicker(!showTonePicker)}
                  disabled={isAiEnhancing}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                  title="AI 감성 스토리 및 톤앤매너 재작성"
                >
                  <Sparkles size={14} className={isAiEnhancing ? "animate-spin text-amber-300" : ""} />
                  <span className="hidden md:inline">
                    {isAiEnhancing ? "스토리 작성 중..." : "AI 스토리 톤"}
                  </span>
                </button>

                {showTonePicker && (
                  <div className="absolute right-0 top-12 w-72 bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl z-50 space-y-2 backdrop-blur-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 py-1">
                      감성 스토리 톤앤매너 선택
                    </div>
                    {STORY_TONES.map(tone => (
                      <button
                        key={tone.id}
                        onClick={() => handleAiEnhance(tone.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                          book.storyTone === tone.id 
                            ? 'bg-indigo-600 text-white font-bold' 
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{tone.labelKo}</span>
                          <span className="text-[9px] opacity-75 font-mono">{tone.labelEn}</span>
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">
                          {tone.descKo}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export HTML */}
              <button 
                onClick={handleExportHtml}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="독립 웹북(HTML) 내보내기"
              >
                <Download size={15} />
              </button>

              {/* Print */}
              <button 
                onClick={handlePrint}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="PDF 출력 / 인쇄"
              >
                <Printer size={15} />
              </button>

              {/* 🎬 Theater Mode Fullscreen Toggle */}
              <button 
                onClick={() => {
                  if (!isTheaterMode) {
                    handleStartTheaterMode(true);
                  } else {
                    setIsTheaterMode(false);
                  }
                }}
                className={`p-2 py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isTheaterMode 
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50' 
                    : 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600 hover:to-indigo-600 text-purple-200 hover:text-white border border-purple-500/30'
                }`}
                title={isTheaterMode ? "극장 모드 종료 (Exit Theater - Esc)" : "극장 모드 자동 슬라이드쇼 재생 (Theater Mode - F)"}
              >
                <Film size={15} className={isTheaterMode ? "animate-pulse text-amber-300" : ""} />
                <span>
                  {isTheaterMode ? '극장 종료' : '🎬 극장 모드'}
                </span>
              </button>

              {/* ↔️ Wide Landscape View Toggle */}
              <button
                type="button"
                onClick={() => setIsWideSpread(prev => !prev)}
                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isWideSpread
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title={isWideSpread ? "표준 뷰 크기로 변경" : "가로 파노라마 와이드로 확대 (Wide Landscape View)"}
              >
                <Maximize2 size={14} className={isWideSpread ? "text-amber-400" : ""} />
                <span className="hidden xl:inline">
                  {isWideSpread ? '표준 크기' : '가로 넓게 보기'}
                </span>
              </button>

              {/* 🎨 Transition Effect Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTransitionPicker(!showTransitionPicker)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="페이지 화면 전환 효과 선택"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="hidden xl:inline">
                    {transitionEffect === '3d-flip' ? '3D 책장' : transitionEffect === 'smooth-fade' ? '디졸브' : '슬라이드'}
                  </span>
                </button>

                {showTransitionPicker && (
                  <div className="absolute right-0 top-12 w-56 bg-slate-900/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl z-50 space-y-1 backdrop-blur-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 py-1">
                      화면 전환 효과 선택
                    </div>
                    {[
                      { id: '3d-flip', label: '📖 3D 책장 넘김', desc: '입체 종이 재질의 3D 리얼리스틱 플립' },
                      { id: 'smooth-fade', label: '✨ 부드러운 디졸브', desc: '은은한 페이드 크로스디졸브 전환' },
                      { id: 'cinematic-slide', label: '🎞️ 시네마틱 슬라이드', desc: '영화같은 가로 슬라이딩 무빙' },
                    ].map(fx => (
                      <button
                        key={fx.id}
                        type="button"
                        onClick={() => {
                          setTransitionEffect(fx.id as any);
                          setShowTransitionPicker(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs transition-all cursor-pointer ${
                          transitionEffect === fx.id
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="font-bold">{fx.label}</div>
                        <div className="text-[10px] opacity-70">{fx.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔮 Real-time AI Narrative Generation Status Floating Pill */}
      {isNarrativeRunning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-950/90 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-pulse">
          <Sparkles size={14} className="text-amber-300 animate-spin" />
          <span>AI Narrative Mode: 현재 챕터 이미지 분석 및 실시간 캡션 생성 중...</span>
        </div>
      )}

      {/* Main 3D Book Workspace */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-3 md:p-6 overflow-hidden relative">
        {/* Left Arrow Trigger */}
        <button 
          onClick={handlePrevPage}
          disabled={(pageViewMode === 'single' ? singlePageIndex <= 0 : currentSpread <= 0) || isFlipping}
          className={`absolute left-1 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-indigo-600 text-white shadow-2xl transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer group ${
            isTheaterMode && !controlsVisible ? 'opacity-0' : 'opacity-100'
          }`}
          title="이전 페이지 (Left Arrow)"
        >
          <ChevronLeft size={18} className="sm:hidden" />
          <ChevronLeft size={24} className="hidden sm:block group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Right Arrow Trigger */}
        <button 
          onClick={handleNextPage}
          disabled={(pageViewMode === 'single' ? singlePageIndex >= totalPages - 1 : currentSpread >= totalSpreads - 1) || isFlipping}
          className={`absolute right-1 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-indigo-600 text-white shadow-2xl transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer group ${
            isTheaterMode && !controlsVisible ? 'opacity-0' : 'opacity-100'
          }`}
          title="다음 페이지 (Right Arrow)"
        >
          <ChevronRight size={18} className="sm:hidden" />
          <ChevronRight size={24} className="hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 1-Page Full Width View or 2-Page Dual Spread View */}
        {pageViewMode === 'single' ? (
          <div 
            ref={spreadContainerRef}
            data-page-index={singlePageIndex}
            className={`relative w-full aspect-[3.7/5] sm:aspect-[4/5] md:aspect-[3/4] max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl flex items-center justify-center transition-all duration-500 mx-auto ${
              isWideSpread
                ? 'max-w-3xl h-[86vh]'
                : isTheaterMode ? 'h-[78vh] md:h-[85vh]' : 'max-h-[82vh]'
            }`}
            style={{
              perspective: '1800px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Ambient Spread Shadow */}
            <div 
              className="absolute inset-x-8 bottom-0 h-12 bg-black/80 blur-2xl rounded-full pointer-events-none transform translate-y-6 scale-95" 
            />

            <AnimatePresence mode="wait">
              <motion.div 
                key={`single-page-${singlePageIndex}-${transitionEffect}`}
                initial={
                  transitionEffect === 'smooth-fade'
                    ? { opacity: 0.15, scale: 0.98 }
                    : transitionEffect === 'cinematic-slide'
                      ? { x: flipDirection === 'next' ? 80 : -80, opacity: 0.2 }
                      : { opacity: 0.9, rotateY: flipDirection === 'next' ? 25 : -25 }
                }
                animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                exit={
                  transitionEffect === 'smooth-fade'
                    ? { opacity: 0.15, scale: 0.98 }
                    : transitionEffect === 'cinematic-slide'
                      ? { x: flipDirection === 'next' ? -80 : 80, opacity: 0.2 }
                      : { opacity: 0.8, rotateY: flipDirection === 'next' ? -25 : 25 }
                }
                transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                className="w-full h-full rounded-2xl relative shadow-[0_30px_90px_rgba(0,0,0,0.7)] overflow-hidden"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <div 
                  ref={leftPageRef}
                  data-page-id={book.pages[singlePageIndex]?.id}
                  data-chapter={book.pages[singlePageIndex]?.chapterTitle}
                  className="w-full h-full relative cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x < rect.width / 3) {
                      handlePrevPage();
                    } else if (x > (rect.width * 2) / 3) {
                      handleNextPage();
                    }
                  }}
                >
                  {book.pages[singlePageIndex] ? (
                    renderPageContent(book.pages[singlePageIndex], false, singlePageIndex)
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 opacity-20">
                      <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-500">
                        SnapClean AI Archive
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          /* 3D Realistic Dual Spread Perspective Container */
          <div 
            ref={spreadContainerRef}
            data-spread-index={currentSpread}
            className={`relative w-full aspect-[1.35/1] sm:aspect-[1.5/1] md:aspect-[1.75/1] flex items-center justify-center transition-all duration-500 mx-auto ${
              isWideSpread
                ? 'max-w-[96vw] max-h-[88vh] h-[82vh]'
                : 'max-w-5xl max-h-[55vh] sm:max-h-[75vh] md:max-h-[82vh]'
            } ${
              isTheaterMode ? 'h-[78vh] md:h-[85vh]' : 'h-auto'
            }`}
            style={{
              perspective: '2200px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Ambient Spread Shadow */}
            <div 
              className="absolute inset-x-8 bottom-0 h-12 bg-black/80 blur-2xl rounded-full pointer-events-none transform translate-y-6 scale-95" 
            />

            {/* Book Spread Core Frame with Smooth Transition Effect */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`spread-${currentSpread}-${transitionEffect}`}
                initial={
                  transitionEffect === 'smooth-fade'
                    ? { opacity: 0.15, scale: 0.97 }
                    : transitionEffect === 'cinematic-slide'
                      ? { x: flipDirection === 'next' ? 90 : -90, opacity: 0.2 }
                      : { opacity: 1 }
                }
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={
                  transitionEffect === 'smooth-fade'
                    ? { opacity: 0.15, scale: 0.97 }
                    : transitionEffect === 'cinematic-slide'
                      ? { x: flipDirection === 'next' ? -90 : 90, opacity: 0.2 }
                      : { opacity: 1 }
                }
                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                className="w-full h-full flex rounded-2xl relative shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Left Page (Half) */}
                <div 
                  ref={leftPageRef}
                  data-page-id={leftPage?.id}
                  data-chapter={leftPage?.chapterTitle}
                  onClick={() => { if (!isCoverSpread) handlePrevPage(); }}
                  className={`w-1/2 h-full relative cursor-pointer ${isCoverSpread ? 'pointer-events-none' : ''}`}
                >
                  {leftPage ? (
                    renderPageContent(leftPage, true, leftPageIndex)
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 opacity-20">
                      <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-500">
                        SnapClean AI Archive
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Page (Half) */}
                <div 
                  ref={rightPageRef}
                  data-page-id={rightPage?.id}
                  data-chapter={rightPage?.chapterTitle}
                  onClick={() => { if (!isBackCoverSpread) handleNextPage(); }}
                  className={`w-1/2 h-full relative cursor-pointer ${isBackCoverSpread ? 'pointer-events-none' : ''}`}
                >
                  {rightPage ? (
                    renderPageContent(rightPage, false, rightPageIndex)
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 opacity-20">
                      <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-500">
                        SnapClean AI Archive
                      </div>
                    </div>
                  )}
                </div>

                {/* Realistic 3D Leaf Turn Animation */}
                <AnimatePresence>
                  {transitionEffect === '3d-flip' && isFlipping && (
                    <motion.div
                      key={`flip-${currentSpread}-${flipDirection}`}
                      initial={{ 
                        rotateY: flipDirection === 'next' ? 0 : -180,
                        transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                        opacity: 0.96
                      }}
                      animate={{ 
                        rotateY: flipDirection === 'next' ? -180 : 0,
                        opacity: 1
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.35, 0, 0.15, 1] }}
                      className="absolute top-0 bottom-0 w-1/2 z-30 shadow-2xl pointer-events-none"
                      style={{
                        left: flipDirection === 'next' ? '50%' : '0%',
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      <div className="w-full h-full bg-linear-to-r from-black/25 via-white/10 to-black/25 backdrop-blur-[1px] border border-white/20 rounded-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Bottom Drawer / Scrubber */}
      <AnimatePresence>
        {(!isTheaterMode || controlsVisible) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`py-2 sm:py-2.5 px-3 sm:px-6 pb-5 sm:pb-2.5 z-40 shrink-0 backdrop-blur-xl border-t ${
              isTheaterMode 
                ? 'absolute bottom-0 left-0 right-0 bg-slate-950/80 border-white/5' 
                : 'bg-slate-900/95 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">
                  스페이스바: 슬라이드쇼 재생/정지 • 방향키: 페이지 넘김 • F: 극장 모드
                </span>
                <span className="sm:hidden">
                  Space: 재생 • F: 극장모드
                </span>
              </div>

              <button 
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
              >
                <Grid size={14} />
                <span>{showThumbnails ? '목차 닫기' : '전체 목차 / 썸네일'}</span>
              </button>
            </div>

            {/* Thumbnail Strip */}
            <AnimatePresence>
              {showThumbnails && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="pt-3 space-y-3"
                >
                  {/* Chapter Fast Jump Chips */}
                  {book.chapters && book.chapters.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 font-mono flex items-center gap-1">
                        <BookOpen size={12} className="text-indigo-400" />
                        챕터 바로가기:
                      </span>
                      {book.chapters.map((ch, chIdx) => {
                        const targetPageIdx = book.pages.findIndex(p => p.chapterTitle === ch.title);
                        const targetSpread = targetPageIdx <= 0 ? 0 : Math.floor((targetPageIdx - 1) / 2) + 1;
                        const isChapterActive = currentSpread === targetSpread;

                        return (
                          <button
                            key={ch.id || chIdx}
                            onClick={() => {
                              setCurrentSpread(targetSpread);
                              photobookAudio.playPageFlipSound();
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                              isChapterActive
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{ch.title}</span>
                            {ch.locationName && (
                              <span className="text-[9px] opacity-75 font-mono">({ch.locationName})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Thumbnail Strip */}
                  <div className="overflow-x-auto flex gap-3 custom-scrollbar pb-1">
                  {book.pages.map((page, idx) => {
                    const targetSpread = page.layout === 'cover' 
                      ? 0 
                      : page.layout === 'back-cover' 
                        ? totalSpreads - 1 
                        : Math.floor((idx - 1) / 2) + 1;
                    
                    const isSelected = currentSpread === targetSpread;

                    return (
                      <button
                        key={page.id}
                        onClick={() => {
                          setCurrentSpread(targetSpread);
                          photobookAudio.playPageFlipSound();
                        }}
                        className={`shrink-0 w-24 h-32 rounded-lg border-2 p-1.5 flex flex-col justify-between text-left transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20 scale-105' 
                            : 'border-white/10 bg-slate-800/80 hover:border-white/30'
                        }`}
                      >
                        <div className="text-[9px] font-bold text-slate-400 truncate">
                          {page.layout === 'cover' ? '표지' : page.layout === 'back-cover' ? '뒷표지' : `P.${page.pageNumber}`}
                        </div>
                        {page.photos[0] ? (
                          <div className="w-full h-16 rounded overflow-hidden my-1 bg-black/40">
                            <BookPhotoView photo={page.photos[0]} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-16 rounded bg-white/5 flex items-center justify-center text-[10px] text-slate-500 italic">
                            Text
                          </div>
                        )}
                        <div className="text-[8px] text-slate-500 truncate">
                          {page.chapterTitle}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✨ Inline Caption AI Rewriter & Editor Modal */}
      <AnimatePresence>
        {editingPhoto && (
          <div 
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingPhoto(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                    <Wand2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      사진 캡션 편집 및 AI 감성 재작성
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      원하는 톤앤매너로 AI가 문학적 캡션을 재작성해 드립니다.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingPhoto(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current Preview */}
              <div className="flex gap-4 items-center p-3 rounded-2xl bg-slate-950 border border-white/5">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-black/40">
                  <BookPhotoView photo={editingPhoto.photo} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    {editingPhoto.photo.location || 'Memory'} • {editingPhoto.photo.date}
                  </span>
                  <p className="text-xs text-white font-medium italic mt-1 line-clamp-2">
                    "{editingPhoto.photo.caption}"
                  </p>
                </div>
              </div>

              {/* 4 Tone AI Rewrite Buttons */}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                  AI 감성 톤 선택 (원클릭 재작성)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {STORY_TONES.map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => handleRewriteCaptionWithTone(tone.id)}
                      disabled={isRewritingCaption}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-left transition-all cursor-pointer disabled:opacity-50"
                    >
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{tone.labelKo}</span>
                        {tone.id === 'lyrical' && <Feather size={12} className="text-amber-400" />}
                        {tone.id === 'travel' && <Compass size={12} className="text-blue-400" />}
                        {tone.id === 'family' && <Heart size={12} className="text-rose-400" />}
                        {tone.id === 'minimal' && <Sparkles size={12} className="text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {tone.descKo}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Edit Area */}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                  캡션 문구 직접 수정
                </span>
                <textarea
                  value={editedCaptionText}
                  onChange={e => setEditedCaptionText(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-all font-sans leading-relaxed resize-none"
                  placeholder="사진에 어울리는 감성적인 한 줄을 입력하세요..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveCaption}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>캡션 저장</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔮 Live AI Narrative Mode Status HUD */}
      <AnimatePresence>
        {isNarrativeRunning && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-slate-900/95 border border-rose-500/50 text-white text-xs font-bold backdrop-blur-xl shadow-2xl flex items-center gap-2.5"
          >
            <Sparkles size={14} className="text-amber-300 animate-spin" />
            <span className="text-slate-200">
              ✨ AI Narrative Engine: Synthesizing Chapter Header &amp; Description...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
