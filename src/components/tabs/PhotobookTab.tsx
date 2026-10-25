import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Music, 
  Palette, 
  ArrowRight, 
  Sliders, 
  Share2, 
  Wand2, 
  Image as ImageIcon,
  Film,
  Play,
  Feather,
  Compass,
  Heart,
  Check,
  CheckSquare,
  Square,
  MessageSquareQuote,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  ArrowDownUp,
  Star,
  Filter,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoRecord } from '../../services/db';
import { PhotobookRecord, PhotobookTheme, StoryTone, PhotobookPhoto, PhotobookChapter } from '../../types';
import { 
  PHOTOBOOK_THEMES, 
  STORY_TONES,
  createPhotobookFromPhotos, 
  getAllPhotobooks, 
  savePhotobook, 
  deletePhotobook, 
  generateSamplePhotos,
  clusterPhotosIntoChapters,
  enhancePhotobookWithAi,
  populateBookWithAiNarrative,
  applyAiNarrativeToPhotobook
} from '../../services/photobookGenerator';
import { generateEventSummary, EventSummary } from '../../services/geminiService';
import { FlipBookViewer, BookPhotoView } from '../photobook/FlipBookViewer';
import { useI18n } from '../../i18n/context';

interface PhotobookTabProps {
  libraryPhotos: PhotoRecord[];
  isAiConfigured?: boolean;
  onOpenAiKeyModal?: () => void;
  initialSelectedBookId?: string | null;
  onSwitchToDuplicates?: () => void;
}

export const PhotobookTab: React.FC<PhotobookTabProps> = ({
  libraryPhotos,
  isAiConfigured = false,
  onOpenAiKeyModal,
  initialSelectedBookId,
  onSwitchToDuplicates,
}) => {
  const { t, language } = useI18n();
  const [photobooks, setPhotobooks] = useState<PhotobookRecord[]>([]);
  const [activeBook, setActiveBook] = useState<PhotobookRecord | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Album Selection & AI Narrative States
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [generatingBookIds, setGeneratingBookIds] = useState<string[]>([]);
  const [narrativeResult, setNarrativeResult] = useState<{
    summary: EventSummary;
    bookTitle: string;
    bookId: string;
    pageCount: number;
    photoCount: number;
    affectedBookCount: number;
  } | null>(null);

  // Persistent AI Narrative Mode
  const [isAiNarrativeMode, setIsAiNarrativeMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('snapclean_ai_narrative_mode') === 'true';
    }
    return false;
  });

  const handleToggleAiNarrativeMode = () => {
    setIsAiNarrativeMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('snapclean_ai_narrative_mode', String(next));
      }
      return next;
    });
  };

  // New book wizard options
  const [newTitle, setNewTitle] = useState('');
  const [selectedStoryTone, setSelectedStoryTone] = useState<StoryTone>('lyrical');
  const [selectedTheme, setSelectedTheme] = useState<PhotobookTheme>('classic-hardcover');
  const [selectedBgm, setSelectedBgm] = useState<'gentle-piano' | 'warm-vinyl' | 'summer-breeze' | 'none'>('gentle-piano');
  const [photoSourceMode, setPhotoSourceMode] = useState<'best-shots' | 'chapter-clustered' | 'all' | 'recent'>('chapter-clustered');
  const [enableAiAutoStory, setEnableAiAutoStory] = useState(true);

  // Viewer options
  const [openWithTheater, setOpenWithTheater] = useState(false);
  const [openWithAutoPlay, setOpenWithAutoPlay] = useState(false);

  // View mode & Timeline states
  const [viewMode, setViewMode] = useState<'shelf' | 'timeline'>('shelf');
  const [timelineBookFilter, setTimelineBookFilter] = useState<string>('all');
  const [timelineSortAsc, setTimelineSortAsc] = useState<boolean>(true);
  const [initialViewerSpread, setInitialViewerSpread] = useState<number>(0);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    photo: PhotobookPhoto;
    book: PhotobookRecord;
    pageNumber: number;
    chapterTitle?: string;
    spreadIndex: number;
    dateFormatted: string;
  } | null>(null);

  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const scrollTimeline = (offset: number) => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Floating Chapter Progress Bar states
  const [activeChapterAlbumId, setActiveChapterAlbumId] = useState<string | null>(null);
  const [hoveredChapterId, setHoveredChapterId] = useState<string | null>(null);
  const [isChapterBarCollapsed, setIsChapterBarCollapsed] = useState<boolean>(false);

  // Load saved photobooks on mount
  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const list = await getAllPhotobooks();
    if (list.length === 0) {
      // Create initial beautiful sample book so user immediately has something glorious to view
      const samplePhotos = libraryPhotos.length > 0 ? libraryPhotos : generateSamplePhotos();
      const initialBook = createPhotobookFromPhotos(samplePhotos, {
        title: language === 'ko' ? '찬란한 계절의 기록' : 'A Memoir of Seasons',
        theme: 'classic-hardcover',
        storyTone: 'lyrical',
        bgmType: 'gentle-piano',
      });
      await savePhotobook(initialBook);
      setPhotobooks([initialBook]);
      if (initialSelectedBookId) {
        setActiveBook(initialBook);
      }
    } else {
      setPhotobooks(list);
      if (initialSelectedBookId) {
        const found = list.find(b => b.id === initialSelectedBookId);
        if (found) setActiveBook(found);
      }
    }
  };

  // Preview photos for wizard
  const wizardPreviewPhotos = useMemo(() => {
    let source = libraryPhotos.filter(p => !p.isDeleted);
    if (source.length === 0) source = generateSamplePhotos();

    if (photoSourceMode === 'best-shots') {
      return [...source].sort((a, b) => (b.aestheticScore || 0) - (a.aestheticScore || 0)).slice(0, 24);
    } else if (photoSourceMode === 'recent') {
      return [...source].sort((a, b) => (b.dateTaken || b.lastModified || 0) - (a.dateTaken || a.lastModified || 0)).slice(0, 24);
    } else if (photoSourceMode === 'chapter-clustered') {
      return [...source].sort((a, b) => (a.dateTaken || a.lastModified || 0) - (b.dateTaken || b.lastModified || 0)).slice(0, 28);
    }
    return source.slice(0, 30);
  }, [libraryPhotos, photoSourceMode]);

  // Live Chapter Preview for wizard
  const estimatedChapters = useMemo(() => {
    const { chapters } = clusterPhotosIntoChapters(wizardPreviewPhotos, selectedStoryTone);
    return chapters;
  }, [wizardPreviewPhotos, selectedStoryTone]);

  // Generate a new photobook
  const handleCreateNew = async () => {
    setIsGenerating(true);
    try {
      let newBook = createPhotobookFromPhotos(wizardPreviewPhotos, {
        title: newTitle.trim() || undefined,
        theme: selectedTheme,
        storyTone: selectedStoryTone,
        bgmType: selectedBgm,
      });

      if (enableAiAutoStory) {
        newBook = await enhancePhotobookWithAi(newBook, wizardPreviewPhotos);
      }

      await savePhotobook(newBook);
      await loadBooks();
      setActiveBook(newBook);
      setOpenWithTheater(false);
      setOpenWithAutoPlay(false);
      setShowCreateModal(false);
      setNewTitle('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete photobook
  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(language === 'ko' ? '이 사진첩을 삭제하시겠습니까?' : 'Delete this photobook?')) {
      await deletePhotobook(id);
      if (activeBook?.id === id) {
        setActiveBook(null);
      }
      setSelectedBookIds(prev => prev.filter(x => x !== id));
      loadBooks();
    }
  };

  // Toggle selection of an album for batch operations
  const handleToggleSelectBook = (id: string) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedBookIds(photobooks.map(b => b.id));
  };

  const handleDeselectAll = () => {
    setSelectedBookIds([]);
  };

  // Triggers generateEventSummary for selected event albums, automatically populating the page with emotional, context-aware captions
  const handleGenerateAiNarrative = async (targetIds?: string[]) => {
    const idsToProcess = (targetIds && targetIds.length > 0)
      ? targetIds
      : (selectedBookIds.length > 0 ? selectedBookIds : (photobooks.length > 0 ? [photobooks[0].id] : []));

    if (idsToProcess.length === 0) return;

    setIsGeneratingNarrative(true);
    setGeneratingBookIds(idsToProcess);

    let lastSummary: EventSummary | null = null;
    let lastBookTitle = '';
    let lastBookId = '';
    let totalPagesCount = 0;
    let totalPhotosCount = 0;

    try {
      const updatedList = [...photobooks];

      for (const id of idsToProcess) {
        const bookIdx = updatedList.findIndex(b => b.id === id);
        if (bookIdx === -1) continue;

        const currentBook = updatedList[bookIdx];
        const { updatedBook, summary } = await applyAiNarrativeToPhotobook(currentBook);

        updatedList[bookIdx] = updatedBook;
        lastSummary = summary;
        lastBookTitle = updatedBook.title;
        lastBookId = updatedBook.id;
        totalPagesCount += updatedBook.pages.length;
        totalPhotosCount += updatedBook.totalPhotos;

        if (activeBook?.id === id) {
          setActiveBook(updatedBook);
        }
      }

      setPhotobooks(updatedList);

      if (lastSummary) {
        setNarrativeResult({
          summary: lastSummary,
          bookTitle: lastBookTitle,
          bookId: lastBookId,
          pageCount: totalPagesCount,
          photoCount: totalPhotosCount,
          affectedBookCount: idsToProcess.length,
        });
      }
    } catch (err) {
      console.error('[AI Narrative Generation Error]:', err);
    } finally {
      setIsGeneratingNarrative(false);
      setGeneratingBookIds([]);
    }
  };

  // Best photos count
  const bestPhotosCount = libraryPhotos.filter(p => !p.isDeleted && (p.aestheticScore || 0) >= 7.0).length;

  interface TimelineItem {
    key: string;
    photo: PhotobookPhoto;
    book: PhotobookRecord;
    pageNumber: number;
    spreadIndex: number;
    chapterTitle?: string;
    timestamp: number;
    dateFormatted: string;
  }

  // Filtered & Chronologically arranged photos for Timeline View
  const timelineItems = useMemo<TimelineItem[]>(() => {
    let targetBooks = photobooks;

    if (timelineBookFilter !== 'all') {
      targetBooks = photobooks.filter(b => b.id === timelineBookFilter);
    } else if (selectedBookIds.length > 0) {
      targetBooks = photobooks.filter(b => selectedBookIds.includes(b.id));
    }

    const items: TimelineItem[] = [];

    targetBooks.forEach((book) => {
      book.pages.forEach((page) => {
        const spreadIndex = page.pageNumber === 0 ? 0 : Math.ceil(page.pageNumber / 2);

        page.photos.forEach((ph, pIdx) => {
          let timestamp = 0;
          let dateFormatted = '';

          if (ph.date) {
            const parsed = Date.parse(ph.date);
            if (!isNaN(parsed)) {
              timestamp = parsed;
              try {
                dateFormatted = new Date(parsed).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              } catch {
                dateFormatted = ph.date;
              }
            } else {
              dateFormatted = ph.date;
            }
          }

          if (!timestamp) {
            timestamp = book.createdAt + (page.pageNumber * 100000) + (pIdx * 1000);
          }

          items.push({
            key: `${book.id}-${page.id}-${pIdx}-${ph.path}`,
            photo: ph,
            book,
            pageNumber: page.pageNumber,
            spreadIndex,
            chapterTitle: page.chapterTitle,
            timestamp,
            dateFormatted: dateFormatted || (book.dateRangeText || (language === 'ko' ? '날짜 미상' : 'Undated'))
          });
        });
      });
    });

    items.sort((a, b) => {
      return timelineSortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    });

    return items;
  }, [photobooks, timelineBookFilter, selectedBookIds, timelineSortAsc, language]);

  // Current event album for Chapter Structure Progress Bar
  const currentAlbum = useMemo<PhotobookRecord | null>(() => {
    if (photobooks.length === 0) return null;
    if (activeChapterAlbumId) {
      const found = photobooks.find(b => b.id === activeChapterAlbumId);
      if (found) return found;
    }
    if (timelineBookFilter !== 'all') {
      const found = photobooks.find(b => b.id === timelineBookFilter);
      if (found) return found;
    }
    if (selectedBookIds.length > 0) {
      const found = photobooks.find(b => selectedBookIds.includes(b.id));
      if (found) return found;
    }
    return photobooks[0];
  }, [photobooks, activeChapterAlbumId, timelineBookFilter, selectedBookIds]);

  // Derived or clustered chapters for the active album from chapter splitting engine
  const currentChapters = useMemo<PhotobookChapter[]>(() => {
    if (!currentAlbum) return [];
    if (currentAlbum.chapters && currentAlbum.chapters.length > 0) {
      return currentAlbum.chapters;
    }

    // Dynamic fallback clustering for albums without explicit chapters
    const photosToCluster = currentAlbum.pages.flatMap(p => p.photos).map((ph, idx) => ({
      id: ph.photoId || idx + 1,
      path: ph.path,
      name: ph.caption || `photo-${idx}`,
      size: 1024,
      lastModified: ph.date ? (Date.parse(ph.date) || Date.now()) : Date.now(),
      dateTaken: ph.date ? (Date.parse(ph.date) || Date.now()) : Date.now(),
      locationName: ph.location,
      aestheticScore: ph.aestheticScore || 8.0,
      description: ph.caption,
    })) as any;

    const clustered = clusterPhotosIntoChapters(photosToCluster, currentAlbum.storyTone || 'lyrical');
    return clustered.chapters;
  }, [currentAlbum]);

  // Total photos across all chapters
  const totalChapterPhotos = useMemo(() => {
    return currentChapters.reduce((acc, c) => acc + (c.photoCount || 1), 0) || 1;
  }, [currentChapters]);

  // Helper to map chapter to target page and 3D FlipBook spread
  const getChapterTarget = (chapter: PhotobookChapter, chapterIdx: number) => {
    if (!currentAlbum || currentAlbum.pages.length === 0) {
      return { pageNumber: 1, spreadIndex: 1 };
    }

    const matchedIdx = currentAlbum.pages.findIndex(p => 
      p.chapterTitle && (
        p.chapterTitle === chapter.title ||
        chapter.title.includes(p.chapterTitle) ||
        p.chapterTitle.includes(chapter.title.split(' ')[0])
      )
    );

    let targetPage = 1;
    if (matchedIdx !== -1) {
      targetPage = currentAlbum.pages[matchedIdx].pageNumber;
    } else {
      const contentPages = currentAlbum.pages.filter(p => p.pageNumber > 0);
      const est = Math.floor((chapterIdx / Math.max(1, currentChapters.length)) * contentPages.length);
      targetPage = contentPages[Math.min(est, contentPages.length - 1)]?.pageNumber || 1;
    }

    const spreadIndex = targetPage === 0 ? 0 : Math.ceil(targetPage / 2);
    return { pageNumber: targetPage, spreadIndex };
  };

  // Jump directly to specific time/location segment generated by chapter splitting engine
  const handleJumpToSegment = (chapter: PhotobookChapter, chapterIdx: number, targetMode?: 'flipbook' | 'timeline') => {
    if (!currentAlbum) return;
    const { spreadIndex } = getChapterTarget(chapter, chapterIdx);

    if (targetMode === 'flipbook' || (viewMode === 'shelf' && targetMode !== 'timeline')) {
      setActiveBook(currentAlbum);
      setInitialViewerSpread(spreadIndex);
      setOpenWithTheater(false);
      setOpenWithAutoPlay(false);
    } else {
      // In timeline mode
      setViewMode('timeline');
      if (timelineBookFilter !== currentAlbum.id && timelineBookFilter !== 'all') {
        setTimelineBookFilter(currentAlbum.id);
      }
      setTimeout(() => {
        const cleanTitle = chapter.title.replace(/[^a-zA-Z0-9가-힣]/g, '-');
        const flagEl = document.getElementById(`timeline-chapter-${cleanTitle}`) ||
                       document.getElementById(`timeline-chapter-${chapter.id}`) ||
                       document.getElementById(`timeline-chapter-flag-${chapterIdx}`);
        if (flagEl && timelineScrollRef.current) {
          flagEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else if (timelineScrollRef.current) {
          const ratio = chapterIdx / Math.max(1, currentChapters.length);
          timelineScrollRef.current.scrollTo({
            left: ratio * (timelineScrollRef.current.scrollWidth - timelineScrollRef.current.clientWidth),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // If a book is currently open in 3D viewer, show the FlipBookViewer
  if (activeBook) {
    return (
      <div className="w-full">
        <FlipBookViewer
          photobook={activeBook}
          onClose={() => {
            setActiveBook(null);
            setOpenWithTheater(false);
            setOpenWithAutoPlay(false);
            setInitialViewerSpread(0);
          }}
          onUpdate={(updated) => {
            setActiveBook(updated);
            loadBooks();
          }}
          isAiConfigured={isAiConfigured}
          onOpenAiKeyModal={onOpenAiKeyModal}
          initialTheaterMode={openWithTheater}
          initialAutoPlay={openWithAutoPlay}
          initialSpreadIndex={initialViewerSpread}
          isAiNarrativeMode={isAiNarrativeMode}
          onToggleAiNarrativeMode={handleToggleAiNarrativeMode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* FLOATING CHAPTER PROGRESS BAR: Shows current event album's chapter structure with 1-click jumps */}
      {currentAlbum && currentChapters.length > 0 && (
        <div className="sticky top-2 sm:top-4 z-40 w-full transition-all duration-300">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/70 p-3 sm:p-4 transition-all">
            {/* Top Bar Strip: Engine Indicator, Album Selector, and Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Engine Badge */}
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  <Bookmark size={13} className="text-amber-400 fill-amber-400/20" />
                  <span>{language === 'ko' ? '챕터 분할 구조 진행 바' : 'Chapter Engine Progress Bar'}</span>
                </div>

                {/* Album Selector Dropdown if multiple albums exist */}
                {photobooks.length > 1 ? (
                  <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
                    <span className="text-slate-400 text-[11px] font-semibold">{language === 'ko' ? '앨범:' : 'Album:'}</span>
                    <select
                      value={currentAlbum.id}
                      onChange={(e) => {
                        setActiveChapterAlbumId(e.target.value);
                        setTimelineBookFilter(e.target.value);
                      }}
                      className="bg-transparent text-white font-bold cursor-pointer focus:outline-none max-w-[180px] truncate"
                    >
                      {photobooks.map((b) => (
                        <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                          {b.title} ({b.totalPhotos}장)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]" title={currentAlbum.title}>
                    "{currentAlbum.title}"
                  </span>
                )}

                {/* Chapter & Location Metadata Summary */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-indigo-300 font-semibold">{currentChapters.length} Chapters</span>
                  <span>•</span>
                  <span>{currentAlbum.totalPhotos} Photos</span>
                  {currentAlbum.locationSummary && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300 truncate max-w-[200px]" title={currentAlbum.locationSummary}>
                        <MapPin size={11} className="text-rose-400 shrink-0" />
                        <span className="truncate">{currentAlbum.locationSummary}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions & Collapse Toggle */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBook(currentAlbum);
                    setInitialViewerSpread(0);
                    setOpenWithTheater(false);
                    setOpenWithAutoPlay(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                  title={language === 'ko' ? '3D 플립북에서 전체 감상' : 'Open Album in 3D FlipBook'}
                >
                  <BookOpen size={13} />
                  <span>{language === 'ko' ? '3D 플립북 열기' : 'Open FlipBook'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsChapterBarCollapsed(prev => !prev)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                  title={isChapterBarCollapsed ? (language === 'ko' ? '챕터 구조 펼치기' : 'Expand Chapters') : (language === 'ko' ? '접기' : 'Collapse')}
                >
                  {isChapterBarCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </button>
              </div>
            </div>

            {/* Segmented Chapter Progress Bar */}
            {!isChapterBarCollapsed ? (
              <div className="flex items-center gap-2 w-full pt-3 pb-1 overflow-x-auto custom-scrollbar select-none">
                {currentChapters.map((chapter, cIdx) => {
                  const isHovered = hoveredChapterId === chapter.id;
                  const widthPct = Math.max(14, ((chapter.photoCount || 1) / totalChapterPhotos) * 100);
                  const { pageNumber } = getChapterTarget(chapter, cIdx);

                  // Format time segment
                  let timeLabel = '';
                  if (chapter.timeRange?.start && chapter.timeRange?.end) {
                    const d1 = new Date(chapter.timeRange.start);
                    const d2 = new Date(chapter.timeRange.end);
                    if (d1.toDateString() === d2.toDateString()) {
                      timeLabel = `${String(d1.getHours()).padStart(2, '0')}:${String(d1.getMinutes()).padStart(2, '0')} ~ ${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}`;
                    } else {
                      timeLabel = `${d1.getMonth() + 1}.${d1.getDate()} ~ ${d2.getMonth() + 1}.${d2.getDate()}`;
                    }
                  }

                  return (
                    <div
                      key={chapter.id || cIdx}
                      style={{ flexGrow: chapter.photoCount || 1, flexBasis: `${widthPct}%` }}
                      className="relative min-w-[125px] sm:min-w-[145px]"
                      onMouseEnter={() => setHoveredChapterId(chapter.id)}
                      onMouseLeave={() => setHoveredChapterId(null)}
                    >
                      {/* Segment Button */}
                      <button
                        type="button"
                        onClick={() => handleJumpToSegment(chapter, cIdx)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-md ${
                          isHovered
                            ? 'bg-gradient-to-r from-indigo-900/90 via-slate-900 to-amber-950/80 border-amber-400 ring-2 ring-amber-400/30 scale-[1.02]'
                            : 'bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 border-white/10 hover:border-amber-400/60'
                        }`}
                        title={language === 'ko' ? `${chapter.title} (클릭하여 이동)` : `${chapter.title} (Click to jump)`}
                      >
                        {/* Glowing Segment Top Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-amber-400 to-rose-400 opacity-80" />

                        <div className="flex items-center justify-between gap-1 w-full text-[10px] font-mono">
                          <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                            <Bookmark size={10} className="fill-current text-amber-400" />
                            <span>Ch.{cIdx + 1}</span>
                          </span>
                          <span className="text-slate-400 text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono">
                            {chapter.photoCount || 1}장
                          </span>
                        </div>

                        {/* Title & Location / Time Segment info */}
                        <div className="mt-1 space-y-0.5">
                          <div className="text-xs font-bold text-white truncate" title={chapter.title}>
                            {chapter.title}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                            {chapter.locationName ? (
                              <>
                                <MapPin size={9} className="text-rose-400 shrink-0" />
                                <span className="truncate text-rose-200/90">{chapter.locationName}</span>
                              </>
                            ) : (
                              <>
                                <Clock size={9} className="text-indigo-400 shrink-0" />
                                <span className="truncate">{timeLabel || `Segment ${cIdx + 1}`}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Hover Floating Details Card / Tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 shadow-2xl z-50 pointer-events-auto space-y-3"
                          >
                            {/* Hero photo preview */}
                            {chapter.heroPhotoPath && (
                              <div className="h-28 rounded-xl overflow-hidden bg-slate-950 relative border border-white/10">
                                <BookPhotoView
                                  photo={{ path: chapter.heroPhotoPath }}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-white">
                                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/20">
                                    {chapter.locationName || 'Location Segment'}
                                  </span>
                                  <span className="text-amber-300 font-bold">
                                    Page {pageNumber}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Bookmark size={13} className="text-amber-400" />
                                <span>{chapter.title}</span>
                              </h4>
                              {chapter.subtitle && (
                                <p className="text-xs text-amber-200/80 italic mt-0.5">
                                  {chapter.subtitle}
                                </p>
                              )}
                              {chapter.prologue && (
                                <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed italic bg-white/5 p-2 rounded-lg border border-white/5">
                                  "{chapter.prologue}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/10">
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-indigo-400" />
                                <span>{timeLabel || 'Time Segment'}</span>
                              </span>
                              <span>{chapter.photoCount || 1} Photos</span>
                            </div>

                            {/* Direct Jump Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleJumpToSegment(chapter, cIdx, 'flipbook')}
                                className="py-2 px-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <BookOpen size={12} />
                                <span>{language === 'ko' ? '3D 플립북에서 열기' : 'In FlipBook'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleJumpToSegment(chapter, cIdx, 'timeline')}
                                className="py-2 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Clock size={12} />
                                <span>{language === 'ko' ? '타임라인에서 보기' : 'On Timeline'}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact Minimalist Chapter Progress Line */
              <div className="pt-2 flex items-center gap-1.5 w-full">
                {currentChapters.map((chapter, cIdx) => (
                  <button
                    key={chapter.id || cIdx}
                    type="button"
                    onClick={() => handleJumpToSegment(chapter, cIdx)}
                    className="h-2 rounded-full flex-1 bg-gradient-to-r from-indigo-500 to-amber-400 hover:h-3 hover:brightness-125 transition-all cursor-pointer relative group"
                    title={`${chapter.title} (Page ${getChapterTarget(chapter, cIdx).pageNumber})`}
                  >
                    <span className="sr-only">{chapter.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-white/10 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
              <Sparkles size={14} />
              {language === 'ko' ? '디지털 사진첩 & 3D 인터랙티브 플립북' : 'Digital Photobook & 3D Flipbook'}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tight leading-tight">
              {language === 'ko' ? '정리된 베스트 컷으로 엮는' : 'Curate Your Memories Into A'}
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-indigo-300 to-blue-300">
                {language === 'ko' ? '단 하나의 디지털 사진첩' : '3D Masterpiece Photobook'}
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              {language === 'ko'
                ? 'AI가 중복 사진을 정밀하게 솎아낸 뒤 남은 최상의 베스트 컷들을 책장 넘김 효과의 3D 인터랙티브 플립북으로 자동 조판합니다. 실물 양장본의 감동을 화면 속에서 경험해 보세요.'
                : 'After AI weeds out duplicates, your finest moments are automatically bound into an interactive 3D flipbook with realistic paper physics, ambient music, and poetic typography.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span>{language === 'ko' ? '새 디지털 사진첩 제작' : 'Create New Photobook'}</span>
              </button>

              {/* 🔮 Persistent Toggle Button: 'Enable AI Narrative Mode' */}
              <button
                type="button"
                onClick={handleToggleAiNarrativeMode}
                className={`px-5 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2.5 cursor-pointer shadow-xl border ${
                  isAiNarrativeMode
                    ? 'bg-gradient-to-r from-purple-600 via-rose-600 to-indigo-600 text-white border-rose-400/80 shadow-rose-600/30 ring-2 ring-rose-400/50'
                    : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-white/20 hover:text-white hover:bg-slate-800'
                }`}
                title={language === 'ko' 
                  ? '3D 포토북을 스크롤할 때 AI가 챕터 헤더와 설명을 자동으로 업데이트합니다' 
                  : 'Automatically updates all chapter headers and descriptions using AI as you scroll through photobooks'}
              >
                <Sparkles size={18} className={isAiNarrativeMode ? 'text-amber-300 animate-spin' : 'text-purple-400'} />
                <span>
                  {isAiNarrativeMode
                    ? (language === 'ko' ? 'AI 내러티브 모드: 활성화' : 'AI Narrative Mode: ON')
                    : (language === 'ko' ? 'AI 내러티브 모드 활성화' : 'Enable AI Narrative Mode')}
                </span>
                <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ml-1 ${
                  isAiNarrativeMode ? 'bg-amber-400' : 'bg-slate-700'
                }`}>
                  <div className={`w-3 h-3 rounded-full transition-transform ${
                    isAiNarrativeMode ? 'translate-x-4 bg-slate-950' : 'translate-x-0 bg-slate-400'
                  }`} />
                </div>
              </button>

              {/* ✨ Integrated AI Narrative Button (Triggers generateEventSummary & populates emotional captions) */}
              <button
                onClick={() => handleGenerateAiNarrative(selectedBookIds.length > 0 ? selectedBookIds : undefined)}
                disabled={isGeneratingNarrative || photobooks.length === 0}
                className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-xl shadow-rose-500/25 flex items-center gap-2 cursor-pointer group"
                title="AI가 선택한 앨범의 감성 스토리 요약을 생성하고 페이지별 맞춤 캡션을 자동 작성합니다"
              >
                <Sparkles size={18} className={isGeneratingNarrative ? "animate-spin text-amber-200" : "text-amber-200 group-hover:rotate-12 transition-transform"} />
                <span>
                  {isGeneratingNarrative
                    ? (language === 'ko' ? 'AI 내러티브 작성 중...' : 'Generating Narrative...')
                    : selectedBookIds.length > 0
                      ? (language === 'ko' ? `AI 내러티브 생성 (${selectedBookIds.length}개 선택)` : `AI Narrative (${selectedBookIds.length} Selected)`)
                      : (language === 'ko' ? 'AI 내러티브 & 감성 캡션' : 'AI Narrative & Captions')}
                </span>
              </button>

              {onSwitchToDuplicates && (
                <button
                  onClick={onSwitchToDuplicates}
                  className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <Layers size={18} className="text-indigo-400" />
                  <span>{language === 'ko' ? '중복 사진 정리 화면으로' : 'Go to Deduplication'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stat Pill Widget */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-4 shrink-0 lg:w-72">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <BookOpen size={14} className="text-amber-400" />
              {language === 'ko' ? '보유 사진첩 현황' : 'Photobook Collection'}
            </div>
            <div>
              <div className="text-3xl font-black font-mono text-white">
                {photobooks.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ko' ? '제작된 인터랙티브 책권 수' : 'Interactive Bound Books'}
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs">
              <span className="text-slate-400">{language === 'ko' ? '베스트 샷 풀' : 'Best Shot Pool'}</span>
              <span className="text-emerald-400 font-mono font-bold">{bestPhotosCount || libraryPhotos.length}장</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photobook Shelf & Timeline View */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-2.5">
              {viewMode === 'shelf' ? (
                <>
                  <BookOpen className="text-indigo-500" />
                  {language === 'ko' ? '나의 디지털 서재 (Photobook Shelf)' : 'My Photobook Shelf'}
                </>
              ) : (
                <>
                  <Clock className="text-amber-400" />
                  {language === 'ko' ? '이벤트 타임라인 뷰 (Timeline View)' : 'Event Photos Timeline'}
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {viewMode === 'shelf'
                ? (language === 'ko' ? '사진첩을 클릭하면 3D 플립북 책장 넘기기 뷰어가 열립니다.' : 'Click any book to open the realistic 3D page-flip viewer.')
                : (language === 'ko' ? '선택한 이벤트 사진들이 시간 순서대로 가로 스크롤 타임라인 바에 배치됩니다.' : 'Selected event photos arranged along a horizontal scrolling chronological bar.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher: Shelf vs Timeline */}
            <div className="p-1 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-1 shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode('shelf')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'shelf'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={language === 'ko' ? '서재 뷰' : 'Shelf View'}
              >
                <BookOpen size={14} />
                <span>{t('shelfView')}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={language === 'ko' ? '가로 스크롤 타임라인 뷰' : 'Horizontal Timeline View'}
              >
                <Clock size={14} />
                <span>{t('timelineView')}</span>
              </button>
            </div>

            {/* Album Selection Toolbar with AI Narrative Action */}
            {photobooks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
                <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-300">
                  <Layers size={13} className="text-indigo-400" />
                  <span className="font-bold">
                    {selectedBookIds.length > 0
                      ? (language === 'ko' ? `${selectedBookIds.length}개 앨범 선택됨` : `${selectedBookIds.length} Selected`)
                      : (language === 'ko' ? `총 ${photobooks.length}개` : `Total ${photobooks.length}`)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                  >
                    {language === 'ko' ? '전체 선택' : 'Select All'}
                  </button>
                  {selectedBookIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                    >
                      {language === 'ko' ? '해제' : 'Clear'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateAiNarrative(selectedBookIds.length > 0 ? selectedBookIds : undefined)}
                  disabled={isGeneratingNarrative || photobooks.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20 cursor-pointer"
                  title="선택한 앨범의 감성 스토리 요약을 작성하고 페이지별 캡션 자동 반영"
                >
                  <Sparkles size={13} className={isGeneratingNarrative ? "animate-spin text-amber-200" : "text-amber-200"} />
                  <span>
                    {isGeneratingNarrative
                      ? (language === 'ko' ? '작성 중...' : 'Generating...')
                      : (language === 'ko' ? 'AI 내러티브' : 'AI Narrative')}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {photobooks.length === 0 ? (
          <div className="py-24 text-center glass rounded-3xl border border-white/5 space-y-4">
            <BookOpen size={56} className="mx-auto text-slate-700" />
            <h3 className="text-lg font-bold text-slate-300">
              {language === 'ko' ? '아직 제작된 사진첩이 없습니다.' : 'No photobooks created yet.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {language === 'ko' ? '상단의 "새 디지털 사진첩 제작" 버튼을 눌러 첫 번째 3D 사진첩을 만들어 보세요.' : 'Click "Create New Photobook" above to generate your first 3D album.'}
            </p>
          </div>
        ) : viewMode === 'shelf' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {photobooks.map((book, idx) => {
              const theme = PHOTOBOOK_THEMES.find(t => t.id === book.theme) || PHOTOBOOK_THEMES[0];

              return (
                <motion.div
                  key={book.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setActiveBook(book)}
                  className="group relative cursor-pointer flex flex-col justify-between rounded-2xl overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl hover:border-indigo-500/50 transition-all bg-slate-900"
                  style={{
                    perspective: '1000px',
                  }}
                >
                  {/* Select Checkbox for multi-album AI Narrative */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectBook(book.id);
                    }}
                    className={`absolute top-3 left-3 z-30 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md ${
                      selectedBookIds.includes(book.id)
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-white scale-105'
                        : 'bg-black/60 text-white/60 hover:text-white hover:bg-black/80 border border-white/20 opacity-70 group-hover:opacity-100'
                    }`}
                    title={selectedBookIds.includes(book.id) ? (language === 'ko' ? "선택 해제" : "Deselect") : (language === 'ko' ? "앨범 선택" : "Select Album")}
                  >
                    {selectedBookIds.includes(book.id) ? (
                      <Check size={14} className="stroke-[3]" />
                    ) : (
                      <Square size={13} className="opacity-60" />
                    )}
                  </div>

                  {/* Book Cover Visual with 3D Spine effect */}
                  <div className={`relative h-64 p-6 flex flex-col justify-between overflow-hidden ${theme.coverBg}`}>
                    {/* Left Spine shadow strip */}
                    <div className="absolute top-0 bottom-0 left-0 w-5 bg-linear-to-r from-black/60 to-transparent pointer-events-none z-10" />
                    
                    {/* Cover Photo Backdrop */}
                    {book.coverImage && (
                      <div className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity">
                        <img 
                          src={book.coverImage} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="relative z-10 flex justify-between items-start gap-1 flex-wrap pl-8">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-black/40 backdrop-blur-xs border border-white/20 text-white">
                          {theme.nameKo}
                        </span>
                        {book.storyTone && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/25 text-amber-200 border border-amber-500/40 flex items-center gap-1">
                            {book.storyTone === 'lyrical' && <Feather size={10} />}
                            {book.storyTone === 'travel' && <Compass size={10} />}
                            {book.storyTone === 'family' && <Heart size={10} />}
                            {book.storyTone === 'minimal' && <Sparkles size={10} />}
                            <span>{STORY_TONES.find(t => t.id === book.storyTone)?.labelKo || book.storyTone}</span>
                          </span>
                        )}
                        {book.chapters && book.chapters.length > 0 && (
                          <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {book.chapters.length}개 챕터
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteBook(e, book.id)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-rose-600 text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        title="사진첩 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Book Title & Subtitle */}
                    <div className="relative z-10 space-y-1">
                      <h3 className={`text-xl font-bold italic tracking-tight line-clamp-2 leading-snug ${theme.fontClass}`}>
                        {book.title}
                      </h3>
                      {book.subtitle && (
                        <p className="text-xs opacity-80 truncate font-light">
                          {book.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Date / Photos Footer */}
                    <div className="relative z-10 pt-3 border-t border-current/20 flex justify-between items-center text-[10px] font-mono opacity-80">
                      <span>{book.totalPhotos} Photos</span>
                      <span>{book.dateRangeText}</span>
                    </div>
                  </div>

                  {/* Card Bottom Meta Bar with AI Narrative & Quick Launch */}
                  <div className="p-3.5 bg-slate-900 border-t border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-indigo-400" />
                        <span>{book.pages.length} Pages</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-indigo-400 group-hover:text-indigo-300">
                        <span>{language === 'ko' ? '책 펼치기' : 'Open Book'}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* 1-Click AI Narrative Button on this album */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAiNarrative([book.id]);
                      }}
                      disabled={generatingBookIds.includes(book.id)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/15 hover:from-amber-500 hover:via-rose-500 hover:to-indigo-600 hover:text-white border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm group/btn disabled:opacity-50"
                      title="AI로 이 사진첩의 감성 스토리 및 페이지별 맞춤 캡션 자동 생성"
                    >
                      <Sparkles size={13} className={generatingBookIds.includes(book.id) ? "animate-spin text-amber-300" : "text-amber-400 group-hover/btn:rotate-12 transition-transform"} />
                      <span>{generatingBookIds.includes(book.id) ? (language === 'ko' ? '캡션 생성 중...' : 'Generating...') : (language === 'ko' ? 'AI 내러티브 (감성 캡션 생성)' : 'AI Narrative & Captions')}</span>
                    </button>

                    {/* Direct Quick Launch Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBook(book);
                          setOpenWithTheater(true);
                          setOpenWithAutoPlay(false);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-600 hover:text-white border border-purple-500/20 text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="전체화면 극장 모드로 바로 감상"
                      >
                        <Film size={12} />
                        <span>극장 모드</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBook(book);
                          setOpenWithTheater(true);
                          setOpenWithAutoPlay(true);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="자동 페이지 넘김 슬라이드쇼 재생"
                      >
                        <Play size={12} className="fill-current" />
                        <span>슬라이드쇼</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* NEW TIMELINE VIEW: Horizontal Scrolling Chronological Bar */
          <div className="space-y-4">
            {/* Timeline Filter & Control Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Album Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0 pl-1">
                  <Filter size={13} className="text-amber-400" />
                  {language === 'ko' ? '앨범 선택:' : 'Filter Album:'}
                </span>
                
                <button
                  type="button"
                  onClick={() => setTimelineBookFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    timelineBookFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  {selectedBookIds.length > 0
                    ? (language === 'ko' ? `선택된 ${selectedBookIds.length}개 앨범` : `${selectedBookIds.length} Selected`)
                    : (language === 'ko' ? '전체 앨범' : 'All Albums')}
                </button>

                {photobooks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTimelineBookFilter(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      timelineBookFilter === b.id
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                    }`}
                  >
                    <BookOpen size={12} className={timelineBookFilter === b.id ? "text-white" : "text-indigo-400"} />
                    <span className="truncate max-w-[140px]">{b.title}</span>
                    <span className="text-[10px] opacity-75 font-mono">({b.totalPhotos})</span>
                  </button>
                ))}
              </div>

              {/* Timeline Navigation & Sort Controls */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                {/* Total Photos Badge */}
                <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <Calendar size={13} className="text-indigo-400" />
                  <span>
                    {language === 'ko' ? `총 ${timelineItems.length}장의 사진` : `${timelineItems.length} Photos`}
                  </span>
                </div>

                {/* Chronological Sort Toggle */}
                <button
                  type="button"
                  onClick={() => setTimelineSortAsc(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title={timelineSortAsc ? (language === 'ko' ? "시간순 (과거→최신)" : "Oldest first") : (language === 'ko' ? "최신순 (최신→과거)" : "Newest first")}
                >
                  <ArrowDownUp size={13} className="text-amber-400" />
                  <span>{timelineSortAsc ? (language === 'ko' ? "시간순 (과거순)" : "Oldest first") : (language === 'ko' ? "최신순" : "Newest first")}</span>
                </button>

                {/* Smooth Horizontal Scroll Navigation */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => scrollTimeline(-500)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={language === 'ko' ? '왼쪽으로 스크롤' : 'Scroll Left'}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTimeline(500)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={language === 'ko' ? '오른쪽으로 스크롤' : 'Scroll Right'}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* The Horizontal Scrolling Chronological Bar Track */}
            {timelineItems.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
                <Clock size={48} className="mx-auto text-slate-700" />
                <h4 className="text-base font-bold text-slate-300">
                  {language === 'ko' ? '선택한 앨범에 사진이 없습니다.' : 'No photos found in selected album.'}
                </h4>
                <button
                  type="button"
                  onClick={() => setTimelineBookFilter('all')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  {language === 'ko' ? '전체 앨범 보기' : 'Show All Albums'}
                </button>
              </div>
            ) : (
              <div className="relative rounded-3xl bg-slate-950/85 backdrop-blur-md border border-white/10 p-6 shadow-2xl overflow-hidden">
                {/* Ambient background glows */}
                <div className="absolute top-1/2 left-10 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 right-10 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Guide strip */}
                <div className="flex items-center justify-between pb-4 text-[11px] font-mono text-slate-400 border-b border-white/5">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {language === 'ko' ? '가로 스크롤 타임라인 바 (마우스 휠 또는 화살표 버튼으로 탐색)' : 'Horizontal Chronological Timeline (Scroll with mouse wheel or buttons)'}
                  </span>
                  <span className="text-slate-500 hidden sm:inline">
                    {language === 'ko' ? '사진을 클릭하면 해당 페이지의 3D 플립북이 열립니다' : 'Click photo card to open in 3D FlipBook'}
                  </span>
                </div>

                {/* Horizontal Scroll Track Container */}
                <div
                  ref={timelineScrollRef}
                  onWheel={(e) => {
                    if (timelineScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                      timelineScrollRef.current.scrollLeft += e.deltaY;
                    }
                  }}
                  className="overflow-x-auto pb-10 pt-8 px-4 custom-scrollbar select-none scroll-smooth"
                >
                  <div className="relative flex items-center min-w-max py-8 px-6">
                    {/* The Continuous Glowing Horizontal Chronological Axis Line */}
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-rose-400 rounded-full shadow-[0_0_16px_rgba(99,102,241,0.6)] z-0" />

                    {/* Start Milestone Node */}
                    <div className="flex flex-col items-center shrink-0 mr-8 z-10">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-white ring-4 ring-amber-500/20">
                        <Compass size={18} />
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                          {language === 'ko' ? '시작' : 'START'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {timelineItems[0]?.dateFormatted.split(' ')[0] || ''}
                        </span>
                      </div>
                    </div>

                    {/* Photo Cards along the Timeline */}
                    {timelineItems.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      const prevItem = idx > 0 ? timelineItems[idx - 1] : null;
                      const isNewChapter = item.chapterTitle && item.chapterTitle !== prevItem?.chapterTitle;

                      return (
                        <React.Fragment key={item.key}>
                          {/* Chapter Milestone Flag Divider */}
                          {isNewChapter && (
                            <div 
                              id={`timeline-chapter-${item.chapterTitle?.replace(/[^a-zA-Z0-9가-힣]/g, '-')}`}
                              className="flex flex-col items-center shrink-0 mx-6 z-10 scroll-mt-24"
                            >
                              <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/30 border border-white/20">
                                <Bookmark size={12} className="fill-current text-amber-300" />
                                <span>{item.chapterTitle}</span>
                              </div>
                              <div className="w-0.5 h-6 bg-indigo-500/60 my-1" />
                              <div className="w-3 h-3 rotate-45 bg-amber-400 border border-white shadow-sm" />
                            </div>
                          )}

                          {/* Timeline Node Column */}
                          <div className="w-72 flex flex-col items-center shrink-0 mx-4 z-10 group">
                            {isEven ? (
                              <>
                                {/* UPPER: Photo Card */}
                                <div
                                  onClick={() => {
                                    setActiveBook(item.book);
                                    setInitialViewerSpread(item.spreadIndex);
                                    setOpenWithTheater(false);
                                    setOpenWithAutoPlay(false);
                                  }}
                                  className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-xl group-hover:border-amber-400/60 group-hover:shadow-2xl group-hover:shadow-amber-500/10 group-hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
                                >
                                  {/* Thumbnail */}
                                  <div className="relative h-40 overflow-hidden bg-slate-950">
                                    <BookPhotoView
                                      photo={item.photo}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Aesthetic Score Badge */}
                                    {item.photo.aestheticScore && (
                                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1 shadow-md">
                                        <Star size={10} className="fill-current text-amber-400" />
                                        <span>{item.photo.aestheticScore.toFixed(1)}</span>
                                      </div>
                                    )}

                                    {/* Page Indicator */}
                                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-indigo-950/80 backdrop-blur-md border border-indigo-400/30 text-indigo-200 text-[10px] font-bold font-mono shadow-md">
                                      P.{item.pageNumber}
                                    </div>

                                    {/* Preview Modal Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewPhotoModal(item);
                                      }}
                                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title={language === 'ko' ? '크게 보기' : 'Enlarge'}
                                    >
                                      <Maximize2 size={12} />
                                    </button>
                                  </div>

                                  {/* Content */}
                                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span className="font-semibold text-slate-300 truncate max-w-[130px]" title={item.book.title}>
                                          {item.book.title}
                                        </span>
                                        {item.photo.location && (
                                          <span className="flex items-center gap-1 text-slate-400 truncate max-w-[100px]" title={item.photo.location}>
                                            <MapPin size={10} className="text-rose-400 shrink-0" />
                                            <span className="truncate">{item.photo.location}</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Emotional Caption */}
                                      <p className="text-xs text-slate-200 italic line-clamp-2 mt-1 leading-snug">
                                        {item.photo.caption ? `"${item.photo.caption}"` : (language === 'ko' ? '소중한 순간의 기록' : 'A cherished memory')}
                                      </p>
                                    </div>

                                    {/* Open in FlipBook prompt */}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-amber-300 group-hover:text-amber-200">
                                      <span className="flex items-center gap-1">
                                        <BookOpen size={12} />
                                        <span>{language === 'ko' ? '3D 플립북에서 보기' : 'View in FlipBook'}</span>
                                      </span>
                                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                  </div>
                                </div>

                                {/* Upper Vertical Stem */}
                                <div className="w-0.5 h-7 bg-gradient-to-b from-indigo-500/80 to-amber-400" />

                                {/* Center Axis Node */}
                                <div className="w-6 h-6 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.8)] z-20 group-hover:scale-125 transition-transform">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                </div>

                                {/* Lower Stem & Info */}
                                <div className="w-0.5 h-5 bg-gradient-to-b from-amber-400 to-transparent" />

                                <div className="mt-1 text-center space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                                    <Clock size={10} className="text-amber-400" />
                                    <span>{item.dateFormatted}</span>
                                  </span>
                                  {item.chapterTitle && (
                                    <span className="block text-[10px] text-indigo-400 font-medium truncate max-w-[200px]">
                                      {item.chapterTitle}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                {/* ODD: Meta on Top */}
                                <div className="mb-1 text-center space-y-1">
                                  {item.chapterTitle && (
                                    <span className="block text-[10px] text-indigo-400 font-medium truncate max-w-[200px]">
                                      {item.chapterTitle}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                                    <Clock size={10} className="text-rose-400" />
                                    <span>{item.dateFormatted}</span>
                                  </span>
                                </div>

                                <div className="w-0.5 h-5 bg-gradient-to-b from-transparent to-rose-400" />

                                {/* Center Axis Node */}
                                <div className="w-6 h-6 rounded-full bg-slate-950 border-2 border-rose-400 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.8)] z-20 group-hover:scale-125 transition-transform">
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                </div>

                                {/* Lower Stem */}
                                <div className="w-0.5 h-7 bg-gradient-to-b from-rose-400 to-indigo-500/80" />

                                {/* LOWER: Photo Card */}
                                <div
                                  onClick={() => {
                                    setActiveBook(item.book);
                                    setInitialViewerSpread(item.spreadIndex);
                                    setOpenWithTheater(false);
                                    setOpenWithAutoPlay(false);
                                  }}
                                  className="w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-xl group-hover:border-rose-400/60 group-hover:shadow-2xl group-hover:shadow-rose-500/10 group-hover:translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
                                >
                                  {/* Thumbnail */}
                                  <div className="relative h-40 overflow-hidden bg-slate-950">
                                    <BookPhotoView
                                      photo={item.photo}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Aesthetic Score Badge */}
                                    {item.photo.aestheticScore && (
                                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1 shadow-md">
                                        <Star size={10} className="fill-current text-amber-400" />
                                        <span>{item.photo.aestheticScore.toFixed(1)}</span>
                                      </div>
                                    )}

                                    {/* Page Indicator */}
                                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-rose-950/80 backdrop-blur-md border border-rose-400/30 text-rose-200 text-[10px] font-bold font-mono shadow-md">
                                      P.{item.pageNumber}
                                    </div>

                                    {/* Preview Modal Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewPhotoModal(item);
                                      }}
                                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title={language === 'ko' ? '크게 보기' : 'Enlarge'}
                                    >
                                      <Maximize2 size={12} />
                                    </button>
                                  </div>

                                  {/* Content */}
                                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span className="font-semibold text-slate-300 truncate max-w-[130px]" title={item.book.title}>
                                          {item.book.title}
                                        </span>
                                        {item.photo.location && (
                                          <span className="flex items-center gap-1 text-slate-400 truncate max-w-[100px]" title={item.photo.location}>
                                            <MapPin size={10} className="text-rose-400 shrink-0" />
                                            <span className="truncate">{item.photo.location}</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Emotional Caption */}
                                      <p className="text-xs text-slate-200 italic line-clamp-2 mt-1 leading-snug">
                                        {item.photo.caption ? `"${item.photo.caption}"` : (language === 'ko' ? '소중한 순간의 기록' : 'A cherished memory')}
                                      </p>
                                    </div>

                                    {/* Open in FlipBook prompt */}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-rose-300 group-hover:text-rose-200">
                                      <span className="flex items-center gap-1">
                                        <BookOpen size={12} />
                                        <span>{language === 'ko' ? '3D 플립북에서 보기' : 'View in FlipBook'}</span>
                                      </span>
                                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* End Milestone Node */}
                    <div className="flex flex-col items-center shrink-0 ml-8 z-10">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white font-black flex items-center justify-center shadow-lg shadow-rose-500/30 border-2 border-white ring-4 ring-rose-500/20">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 block">
                          {language === 'ko' ? '완결' : 'END'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {timelineItems[timelineItems.length - 1]?.dateFormatted.split(' ')[0] || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline Photo Enlarge / Detail Modal */}
      <AnimatePresence>
        {previewPhotoModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setPreviewPhotoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="relative bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
                <BookPhotoView
                  photo={previewPhotoModal.photo}
                  className="w-full max-h-[60vh] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPreviewPhotoModal(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md cursor-pointer border border-white/20 transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-400" />
                      <span>{previewPhotoModal.book.title}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        Page {previewPhotoModal.pageNumber}
                      </span>
                    </h3>
                    {previewPhotoModal.chapterTitle && (
                      <p className="text-xs text-slate-400 mt-1">
                        Chapter: <span className="text-slate-200">{previewPhotoModal.chapterTitle}</span>
                      </p>
                    )}
                  </div>

                  {previewPhotoModal.photo.aestheticScore && (
                    <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0">
                      <Star size={12} className="fill-current text-amber-400" />
                      <span>Aesthetic: {previewPhotoModal.photo.aestheticScore.toFixed(1)}/10</span>
                    </div>
                  )}
                </div>

                {/* Emotional Caption Display */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <MessageSquareQuote size={12} className="text-amber-400" />
                    <span>{language === 'ko' ? 'AI 감성 캡션' : 'AI Narrative Caption'}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed italic">
                    "{previewPhotoModal.photo.caption || (language === 'ko' ? '기록된 캡션이 없습니다.' : 'No caption recorded.')}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-indigo-400" />
                      <span>{previewPhotoModal.dateFormatted}</span>
                    </span>
                    {previewPhotoModal.photo.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-rose-400" />
                        <span>{previewPhotoModal.photo.location}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const book = previewPhotoModal.book;
                      const spread = previewPhotoModal.spreadIndex;
                      setPreviewPhotoModal(null);
                      setActiveBook(book);
                      setInitialViewerSpread(spread);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span>{language === 'ko' ? '3D 플립북에서 바로 보기' : 'Open in 3D FlipBook'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal / Wizard */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="text-indigo-400" size={24} />
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
                    {language === 'ko' ? '새 디지털 사진첩 제작' : 'New Digital Photobook'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-6 custom-scrollbar">
                {/* 1. Title Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>{language === 'ko' ? '1. 사진첩 제목' : '1. Book Title'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {language === 'ko' ? '(비워두면 AI가 최적 제목 자동 생성)' : '(Leave blank for auto AI title)'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={
                      selectedStoryTone === 'travel' 
                        ? (language === 'ko' ? '예: 2026 유럽 배낭여행의 기록' : 'e.g., Summer in Europe 2026') 
                        : selectedStoryTone === 'family'
                          ? (language === 'ko' ? '예: 우리 가족의 다정한 사계절' : 'e.g., Our Warm Family Story')
                          : selectedStoryTone === 'minimal'
                            ? (language === 'ko' ? '예: 빛과 침묵의 모노그래프' : 'e.g., Light & Shadows Monograph')
                            : (language === 'ko' ? '예: 찬란한 계절의 소중한 기록' : 'e.g., A Memoir of Seasons')
                    }
                    className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* 2. Story Tone Selection (4대 감성 톤앤매너) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{language === 'ko' ? '2. AI 감성 스토리텔링 톤앤매너 (Story Tone)' : '2. AI Storytelling Tone'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {STORY_TONES.map((tone) => {
                      const isSelected = selectedStoryTone === tone.id;
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          onClick={() => setSelectedStoryTone(tone.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                              : 'bg-slate-950/70 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              {tone.id === 'lyrical' && <Feather size={14} className="text-amber-400" />}
                              {tone.id === 'travel' && <Compass size={14} className="text-blue-400" />}
                              {tone.id === 'family' && <Heart size={14} className="text-rose-400" />}
                              {tone.id === 'minimal' && <Sparkles size={14} className="text-emerald-400" />}
                              <span>{tone.labelKo}</span>
                            </div>
                            {isSelected && <CheckCircle2 size={14} className="text-indigo-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {tone.descKo}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Photo Source Selection & 3-Axis Smart Clustering */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>{language === 'ko' ? '3. 사진 선별 & 3축 지능형 챕터 분할' : '3. Photo Curation & Chapter Clustering'}</span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      {wizardPreviewPhotos.length}장 선별 대상
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { 
                        id: 'chapter-clustered', 
                        label: language === 'ko' ? '⏱️ 시간·장소·인물 자동 챕터 큐레이션' : 'Time & Geo Clustered Chapters',
                        desc: language === 'ko' ? '3시간 시차 / 5km 거리 기준 서사적 챕터 분할 (추천)' : '3h burst & 5km location clusters'
                      },
                      { 
                        id: 'best-shots', 
                        label: language === 'ko' ? '✨ 고화질 베스트 컷 (Aesthetic Top 24)' : 'Aesthetic Top 24 Best Shots',
                        desc: language === 'ko' ? 'AI 미적 점수 최고점 사진만 엄선' : 'Highest AI aesthetic scores'
                      },
                      { 
                        id: 'recent', 
                        label: language === 'ko' ? '📅 최신 촬영 사진 순' : 'Recent Photos Chronological',
                        desc: language === 'ko' ? '가장 최근에 담긴 기억 위주로 조판' : 'Latest photo sequence'
                      },
                      { 
                        id: 'all', 
                        label: language === 'ko' ? '📂 전체 보관함 사진 균형 조판' : 'Balanced Full Library',
                        desc: language === 'ko' ? '보관함의 모든 사진을 골고루 분배' : 'Distribute across full archive'
                      },
                    ].map((src) => (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setPhotoSourceMode(src.id as any)}
                        className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                          photoSourceMode === src.id
                            ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 shadow-sm'
                            : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white hover:border-white/15'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{src.label}</span>
                          {photoSourceMode === src.id && <CheckCircle2 size={13} className="text-indigo-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          {src.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Live Chapter Preview (실시간 예상 챕터 구성) */}
                {estimatedChapters.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                        <BookOpen size={13} className="text-amber-400" />
                        예상 챕터 구성 미리보기 ({estimatedChapters.length}개 챕터)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        선별 사진 기준 자동 산출
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {estimatedChapters.map((ch, idx) => (
                        <div 
                          key={ch.id || idx}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-200">{ch.title}</span>
                            {ch.subtitle && (
                              <span className="text-[10px] text-slate-400 ml-2 italic">
                                {ch.subtitle}
                              </span>
                            )}
                          </div>
                          {ch.photoCount && (
                            <span className="text-[10px] font-mono text-indigo-300 font-bold shrink-0 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                              {ch.photoCount}컷
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Theme Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {language === 'ko' ? '4. 양장본 디자인 테마' : '4. Design Theme'}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PHOTOBOOK_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedTheme === theme.id
                            ? 'border-indigo-500 bg-indigo-950/40 shadow-sm'
                            : 'border-white/5 bg-slate-950/60 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{theme.nameKo}</span>
                          {selectedTheme === theme.id && <CheckCircle2 size={14} className="text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {theme.descriptionKo}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Ambient BGM Choice */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {language === 'ko' ? '5. 앰비언스 배경 음악' : '5. Ambient Soundtrack'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'gentle-piano', label: '잔잔한 피아노' },
                      { id: 'warm-vinyl', label: '로파이 바이닐' },
                      { id: 'summer-breeze', label: '여름 바닷바람' },
                      { id: 'none', label: '음악 없음' },
                    ].map((bgm) => (
                      <button
                        key={bgm.id}
                        type="button"
                        onClick={() => setSelectedBgm(bgm.id as any)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all border text-center cursor-pointer ${
                          selectedBgm === bgm.id
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {bgm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. AI Story Enhancement Toggle */}
                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {language === 'ko' ? 'Gemini AI 감성 스토리텔링 자동 작성' : 'Gemini AI Emotional Story Synthesis'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'ko' ? '사진 분위기를 분석하여 맞춤 챕터 프롤로그 및 문학적 캡션을 합성합니다.' : 'Analyzes photo moods to synthesize bespoke prologue and captions.'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAiAutoStory}
                    onChange={(e) => setEnableAiAutoStory(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0 ml-3"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
                  <span>
                    {isGenerating 
                      ? (language === 'ko' ? '사진첩 조판 중...' : 'Binding Pages...') 
                      : (language === 'ko' ? '사진첩 생성 및 펼치기' : 'Create & Open Book')}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✨ AI Narrative Completion Result Modal */}
      <AnimatePresence>
        {narrativeResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white shadow-lg">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight">
                      {language === 'ko' ? 'AI 감성 내러티브 생성 완료' : 'AI Narrative Generated'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {language === 'ko' ? '페이지별 맞춤 감성 캡션이 성공적으로 반영되었습니다.' : 'Context-aware captions auto-populated across pages.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNarrativeResult(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Event Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300 font-serif italic truncate max-w-[70%]">
                    "{narrativeResult.summary.title}"
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    Mood: {narrativeResult.summary.mood}
                  </span>
                </div>

                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <MessageSquareQuote size={12} className="text-indigo-400" />
                    <span>Story Narrative</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "{narrativeResult.summary.story}"
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                  <span>{narrativeResult.affectedBookCount}개 앨범</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{narrativeResult.pageCount}개 페이지 캡션 반영</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const targetBook = photobooks.find(b => b.id === narrativeResult.bookId);
                    if (targetBook) {
                      setActiveBook(targetBook);
                    }
                    setNarrativeResult(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen size={15} />
                  <span>{language === 'ko' ? '3D 플립북에서 캡션 감상하기' : 'Open in 3D FlipBook'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNarrativeResult(null)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {language === 'ko' ? '닫기' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
