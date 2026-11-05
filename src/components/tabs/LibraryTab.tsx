import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  RefreshCw, 
  MapPin, 
  Layers, 
  Zap, 
  CheckCircle2,
  List,
  Grid,
  SlidersHorizontal,
  RotateCcw,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  LayoutGrid,
  Calendar,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Folder,
  Copy,
  ExternalLink,
  AlertCircle,
  Edit2,
  X,
  Sparkles,
  BarChart3,
  ChevronDown,
  Check,
  Filter,
  ArrowUpDown,
  Clock,
  Type,
  HardDrive
} from 'lucide-react';
import { db, PhotoRecord } from '../../services/db';
import { useI18n } from '../../i18n/context';
import { PhotoCard } from '../PhotoCard';
import { PhotoMap } from '../PhotoMap';
import { VirtualGrid } from '../VirtualGrid';
import { AnimatePresence, motion } from 'motion/react';
import { getLocalizedCategory } from '../../utils/categoryUtils';
import { SystemAPI } from '../../services/systemApi';
import { Tooltip, InfoTooltip } from '../Tooltip';
import { fastViewEngine } from '../../services/fastViewEngine';
import { SearchDistributionChart } from '../SearchDistributionChart';
import { CategorySummaryChart } from '../CategorySummaryChart';
import { BulkActionHeaderBar } from '../BulkActionHeaderBar';
import { SmartQuery } from '../../services/geminiService';

const LibMiniThumbnail = ({ thumbnail, photo }: { thumbnail?: Blob; photo?: PhotoRecord }) => {
  const [src, setSrc] = useState<string | null>(() => photo ? fastViewEngine.getInstantThumbnail(photo.path) : null);

  useEffect(() => {
    let active = true;
    if (photo) {
      const instant = fastViewEngine.getInstantThumbnail(photo.path);
      if (instant) {
        setSrc(instant);
        return;
      }
      fastViewEngine.getFastThumbnail(photo)
        .then(res => {
          if (active && res.url) setSrc(res.url);
        })
        .catch(() => {});
    } else if (thumbnail && thumbnail.size > 0) {
      const url = URL.createObjectURL(thumbnail);
      setSrc(url);
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }
    return () => {
      active = false;
    };
  }, [thumbnail, photo?.path]);

  if (!src) return <ImageIcon size={14} className="text-slate-500" />;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />;
};

interface LibraryTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSmartSearch: () => void;
  isProcessingSmartQuery: boolean;
  isOnline: boolean;
  syncing: boolean;
  handleSyncLibrary: () => void;
  categoryStats: Record<string, { count: number, size: number }>;
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  selectedQualityTags: string[];
  setSelectedQualityTags: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFormats: string[];
  setSelectedFormats: React.Dispatch<React.SetStateAction<string[]>>;
  dateStats: Record<string, number>;
  selectedYears: string[];
  setSelectedYears: React.Dispatch<React.SetStateAction<string[]>>;
  locations: any[];
  selectedLocations: string[];
  setSelectedLocations?: React.Dispatch<React.SetStateAction<string[]>>;
  handleSelectLocation: (location: string) => void;
  selectedSizes: string[];
  setSelectedSizes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedOrientations: string[];
  setSelectedOrientations: React.Dispatch<React.SetStateAction<string[]>>;
  cameraModels: string[];
  selectedCameras: string[];
  setSelectedCameras: React.Dispatch<React.SetStateAction<string[]>>;
  filteredLibraryPhotos: PhotoRecord[];
  selectedPhotoIds: number[];
  setSelectedPhotoIds: React.Dispatch<React.SetStateAction<number[]>>;
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  libraryPhotos: PhotoRecord[];
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  taggingProgress: any;
  handleBulkTagging: (photos: PhotoRecord[]) => void;
  handleEnhance: (photo: PhotoRecord) => void;
  handleContextMenu: (e: React.MouseEvent, photo: PhotoRecord) => void;
  setSelectedPhotoId: (id: number | null) => void;
  selectedPhotoId: number | null;
  setModal: (modal: any) => void;
  handleOrganize: (photos: PhotoRecord[], option: string, mode: 'copy' | 'move') => void;
  handleBatchRename?: (photos: PhotoRecord[], pattern: string) => void;
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  isAiConfigured?: boolean;
  onAnimatePhoto?: (photo: PhotoRecord) => void;
  smartQuery?: SmartQuery | null;
}

export const LibraryTab = ({
  searchQuery,
  setSearchQuery,
  handleSmartSearch,
  isProcessingSmartQuery,
  isOnline,
  isAiConfigured = false,
  smartQuery = null,
  syncing,
  handleSyncLibrary,
  categoryStats,
  selectedCategories,
  setSelectedCategories,
  selectedQualityTags,
  setSelectedQualityTags,
  selectedFormats,
  setSelectedFormats,
  dateStats,
  selectedYears,
  setSelectedYears,
  locations,
  selectedLocations,
  setSelectedLocations,
  handleSelectLocation,
  selectedSizes,
  setSelectedSizes,
  selectedOrientations,
  setSelectedOrientations,
  cameraModels,
  selectedCameras,
  setSelectedCameras,
  filteredLibraryPhotos,
  selectedPhotoIds,
  setSelectedPhotoIds,
  showMap,
  setShowMap,
  libraryPhotos,
  isMultiSelectMode,
  setIsMultiSelectMode,
  taggingProgress,
  handleBulkTagging,
  handleEnhance,
  handleContextMenu,
  setSelectedPhotoId,
  selectedPhotoId,
  setModal,
  handleOrganize,
  handleBatchRename,
  addNotification,
  onAnimatePhoto
}: LibraryTabProps) => {
  const { t, language } = useI18n();

  const [showDistributionChart, setShowDistributionChart] = useState<boolean>(() => Boolean(searchQuery.trim()));

  // Auto-expand distribution chart when a smart query is analyzed or search query is applied
  useEffect(() => {
    if (smartQuery || searchQuery.trim().length > 1) {
      setShowDistributionChart(true);
    }
  }, [smartQuery]);

  const [viewLayout, setViewLayout] = useState<'extra-large' | 'large' | 'medium' | 'small' | 'list' | 'details'>(
    () => (localStorage.getItem('library_view_layout') as any) || 'medium'
  );
  const [viewSortBy, setViewSortBy] = useState<'dateTaken' | 'size' | 'name' | 'category' | 'qualityScore' | 'aiScore'>(
    () => (localStorage.getItem('library_view_sort_by') as any) || 'dateTaken'
  );
  const [viewSortOrder, setViewSortOrder] = useState<'asc' | 'desc'>(
    () => (localStorage.getItem('library_view_sort_order') as any) || 'desc'
  );
  const [viewGroupBy, setViewGroupBy] = useState<'none' | 'category' | 'type' | 'year' | 'size'>(
    () => (localStorage.getItem('library_view_group_by') as any) || 'none'
  );
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCategorySummary, setShowCategorySummary] = useState(false);
  const activeFiltersCount = useMemo(() => {
    return selectedCategories.length + selectedQualityTags.length + selectedFormats.length + selectedYears.length + selectedLocations.length + selectedSizes.length + selectedOrientations.length + selectedCameras.length;
  }, [selectedCategories, selectedQualityTags, selectedFormats, selectedYears, selectedLocations, selectedSizes, selectedOrientations, selectedCameras]);

  const handleResetAllFilters = () => {
    setSelectedCategories([]);
    setSelectedQualityTags([]);
    setSelectedFormats([]);
    setSelectedYears([]);
    setSelectedLocations([]);
    setSelectedSizes([]);
    setSelectedOrientations([]);
    setSelectedCameras([]);
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const [showBatchRenameModal, setShowBatchRenameModal] = useState(false);
  const [renamePattern, setRenamePattern] = useState('[Date]-[Location]-[Sequence]');

  // 'Select by Category' state and ref
  const [showCategorySelectMenu, setShowCategorySelectMenu] = useState(false);
  const categorySelectMenuRef = useRef<HTMLDivElement>(null);

  // Header Filter Dropdown state and ref
  const [showHeaderCategoryDropdown, setShowHeaderCategoryDropdown] = useState(false);
  const headerCategoryDropdownRef = useRef<HTMLDivElement>(null);

  // Header Sort Dropdown state and ref
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCategorySelectMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (categorySelectMenuRef.current && !categorySelectMenuRef.current.contains(e.target as Node)) {
        setShowCategorySelectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategorySelectMenu]);

  useEffect(() => {
    if (!showHeaderCategoryDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (headerCategoryDropdownRef.current && !headerCategoryDropdownRef.current.contains(e.target as Node)) {
        setShowHeaderCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderCategoryDropdown]);

  useEffect(() => {
    if (!showSortDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('nature') || lower.includes('자연') || lower.includes('풍경')) return '🌿';
    if (lower.includes('people') || lower.includes('인물') || lower.includes('family') || lower.includes('portrait')) return '👥';
    if (lower.includes('work') || lower.includes('업무') || lower.includes('office') || lower.includes('job')) return '💼';
    if (lower.includes('abstract') || lower.includes('추상') || lower.includes('art') || lower.includes('pattern')) return '🎨';
    if (lower.includes('food') || lower.includes('음식') || lower.includes('식당')) return '🍔';
    if (lower.includes('doc') || lower.includes('문서') || lower.includes('영수증') || lower.includes('receipt')) return '📄';
    if (lower.includes('arch') || lower.includes('건축') || lower.includes('building') || lower.includes('city')) return '🏛️';
    if (lower.includes('travel') || lower.includes('여행') || lower.includes('trip')) return '✈️';
    if (lower.includes('animal') || lower.includes('동물') || lower.includes('pet') || lower.includes('cat') || lower.includes('dog')) return '🐾';
    if (lower.includes('vehicle') || lower.includes('차량') || lower.includes('car')) return '🚗';
    if (lower.includes('night') || lower.includes('야경')) return '🌙';
    return '🏷️';
  };

  // Preset & detected categories dropdown list for header filter
  const categoryDropdownOptions = useMemo(() => {
    const presetNames = ['Nature', 'People', 'Travel', 'Work', 'Abstract', 'Food', 'Architecture', 'Documents'];
    const countMap = new Map<string, number>();

    libraryPhotos.forEach(p => {
      const cat = p.category?.trim() || 'Uncategorized';
      countMap.set(cat, (countMap.get(cat) || 0) + 1);

      const tags = p.tags || p.aiTags || [];
      tags.forEach(t => {
        const normTag = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        if (presetNames.includes(normTag)) {
          countMap.set(normTag, (countMap.get(normTag) || 0) + 1);
        }
      });
    });

    Object.entries(categoryStats).forEach(([cat, data]) => {
      if (!countMap.has(cat)) {
        countMap.set(cat, data.count);
      }
    });

    if (naturePhotosCount > 0) {
      countMap.set('Nature', naturePhotosCount);
    }

    const allNames = Array.from(new Set([...presetNames, ...Array.from(countMap.keys())]));
    return allNames.map(name => ({
      name,
      count: countMap.get(name) || 0,
    }));
  }, [libraryPhotos, categoryStats]);

  // Compute available AI categories with photo counts, IDs, and current selection status
  const aiCategoryItems = useMemo(() => {
    const map = new Map<string, { count: number; ids: number[]; size: number }>();

    libraryPhotos.forEach(p => {
      if (!p.id) return;
      const cat = p.category?.trim() || 'Uncategorized';
      const existing = map.get(cat) || { count: 0, ids: [], size: 0 };
      existing.count++;
      existing.ids.push(p.id);
      existing.size += (p.size || 0);
      map.set(cat, existing);
    });

    Object.entries(categoryStats).forEach(([cat, data]) => {
      if (!map.has(cat) && data.count > 0) {
        map.set(cat, { count: data.count, ids: [], size: data.size });
      }
    });

    return Array.from(map.entries())
      .map(([name, data]) => {
        const selectedCount = data.ids.filter(id => selectedPhotoIds.includes(id)).length;
        const isAllSelected = data.ids.length > 0 && selectedCount === data.ids.length;
        const isPartiallySelected = selectedCount > 0 && selectedCount < data.ids.length;
        return {
          name,
          count: data.count,
          ids: data.ids,
          size: data.size,
          localizedName: getLocalizedCategory(name, t),
          icon: getCategoryIcon(name),
          selectedCount,
          isAllSelected,
          isPartiallySelected,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [libraryPhotos, categoryStats, selectedPhotoIds, t]);

  // Instantly highlight/select photos belonging to a specific AI category
  const handleSelectByCategory = (
    categoryName: string,
    action: 'replace' | 'add' | 'remove' = 'replace'
  ) => {
    const targetName = categoryName.toLowerCase().trim();
    const matchingPhotos = libraryPhotos.filter(p => {
      if (!p.id) return false;
      const cat = (p.category || 'Uncategorized').toLowerCase().trim();
      const tags = p.tags || p.aiTags || [];
      if (targetName === 'nature' || targetName === 'landscape') {
        const hasTag = tags.some(t => t.toLowerCase() === 'nature' || t.toLowerCase() === 'landscape');
        return cat === 'nature' || cat === 'landscape' || hasTag;
      }
      return cat === targetName || tags.some(t => t.toLowerCase() === targetName);
    });

    const matchingIds = matchingPhotos.map(p => p.id!);

    if (matchingIds.length === 0) {
      addNotification(
        language === 'ko' ? '사진 없음' : 'No Photos Found',
        language === 'ko'
          ? `'${getLocalizedCategory(categoryName, t)}' 카테고리에 해당하는 사진이 없습니다.`
          : `No photos found in category '${categoryName}'.`,
        'info'
      );
      return;
    }

    setIsMultiSelectMode(true);

    if (action === 'replace') {
      setSelectedPhotoIds(matchingIds);
      addNotification(
        language === 'ko' ? '카테고리 일괄 선택 완료' : 'Category Selected',
        language === 'ko'
          ? `'${getLocalizedCategory(categoryName, t)}' 카테고리의 사진 ${matchingIds.length}장이 일괄 선택(하이라이트)되었습니다.`
          : `Instantly highlighted ${matchingIds.length} photos in '${categoryName}'.`,
        'success'
      );
    } else if (action === 'add') {
      setSelectedPhotoIds(prev => Array.from(new Set([...prev, ...matchingIds])));
      addNotification(
        language === 'ko' ? '선택에 추가됨' : 'Added to Selection',
        language === 'ko'
          ? `'${getLocalizedCategory(categoryName, t)}' 카테고리 사진 ${matchingIds.length}장을 선택에 추가했습니다.`
          : `Added ${matchingIds.length} '${categoryName}' photos to selection.`,
        'success'
      );
    } else if (action === 'remove') {
      const matchSet = new Set(matchingIds);
      setSelectedPhotoIds(prev => prev.filter(id => !matchSet.has(id)));
      addNotification(
        language === 'ko' ? '선택 제외됨' : 'Removed from Selection',
        language === 'ko'
          ? `'${getLocalizedCategory(categoryName, t)}' 카테고리 사진 ${matchingIds.length}장을 선택에서 해제했습니다.`
          : `Removed ${matchingIds.length} '${categoryName}' photos from selection.`,
        'info'
      );
    }
  };

  // Count of nature and landscape themed photos
  const naturePhotosCount = useMemo(() => {
    return libraryPhotos.filter(p => {
      const c = (p.category || '').toLowerCase();
      const tags = p.tags || p.aiTags || [];
      const hasTag = tags.some(t => t.toLowerCase() === 'nature' || t.toLowerCase() === 'landscape');
      return c === 'nature' || c === 'landscape' || hasTag;
    }).length;
  }, [libraryPhotos]);

  // Dedicated 'Nature' and 'Landscape' filter button handlers that update selectedCategories to include 'nature' and 'landscape'
  const isNatureFilterActive = useMemo(() => {
    return selectedCategories.some(c => c.toLowerCase() === 'nature') && selectedCategories.some(c => c.toLowerCase() === 'landscape');
  }, [selectedCategories]);

  const handleToggleNatureFilter = () => {
    setSelectedCategories(prev => {
      const isCurrentlyActive = prev.some(c => c.toLowerCase() === 'nature') && prev.some(c => c.toLowerCase() === 'landscape');
      if (isCurrentlyActive) {
        return prev.filter(c => c.toLowerCase() !== 'nature' && c.toLowerCase() !== 'landscape');
      } else {
        const withoutThem = prev.filter(c => c.toLowerCase() !== 'nature' && c.toLowerCase() !== 'landscape');
        return [...withoutThem, 'nature', 'landscape'];
      }
    });
  };

  const isLandscapeFilterActive = isNatureFilterActive;
  const handleToggleLandscapeFilter = handleToggleNatureFilter;

  // Count of people and portrait themed photos
  const peoplePhotosCount = useMemo(() => {
    return libraryPhotos.filter(p => {
      const c = (p.category || '').toLowerCase();
      const tags = p.tags || p.aiTags || [];
      const hasTag = tags.some(t => t.toLowerCase() === 'people' || t.toLowerCase() === 'portrait' || t.toLowerCase() === 'person' || t.toLowerCase() === 'human' || t.toLowerCase() === 'family');
      return c === 'people' || c === 'portrait' || (p.detectedFaces !== undefined && p.detectedFaces > 0) || hasTag;
    }).length;
  }, [libraryPhotos]);

  // Dedicated 'People' filter button handler that updates selectedCategories to include 'people' and 'portrait'
  const isPeopleFilterActive = useMemo(() => {
    return selectedCategories.some(c => c.toLowerCase() === 'people') && selectedCategories.some(c => c.toLowerCase() === 'portrait');
  }, [selectedCategories]);

  const handleTogglePeopleFilter = () => {
    setSelectedCategories(prev => {
      const isCurrentlyActive = prev.some(c => c.toLowerCase() === 'people') && prev.some(c => c.toLowerCase() === 'portrait');
      if (isCurrentlyActive) {
        return prev.filter(c => c.toLowerCase() !== 'people' && c.toLowerCase() !== 'portrait');
      } else {
        const withoutThem = prev.filter(c => c.toLowerCase() !== 'people' && c.toLowerCase() !== 'portrait');
        return [...withoutThem, 'people', 'portrait'];
      }
    });
  };

  // Count of travel and urban themed photos
  const travelPhotosCount = useMemo(() => {
    return libraryPhotos.filter(p => {
      const c = (p.category || '').toLowerCase();
      const tags = p.tags || p.aiTags || [];
      const hasTag = tags.some(t => t.toLowerCase() === 'travel' || t.toLowerCase() === 'urban' || t.toLowerCase() === 'trip' || t.toLowerCase() === 'vacation' || t.toLowerCase() === 'city');
      return c === 'travel' || c === 'urban' || hasTag;
    }).length;
  }, [libraryPhotos]);

  // Dedicated 'Travel' filter button handler that updates selectedCategories to include 'travel' and 'urban'
  const isTravelFilterActive = useMemo(() => {
    return selectedCategories.some(c => c.toLowerCase() === 'travel') && selectedCategories.some(c => c.toLowerCase() === 'urban');
  }, [selectedCategories]);

  const handleToggleTravelFilter = () => {
    setSelectedCategories(prev => {
      const isCurrentlyActive = prev.some(c => c.toLowerCase() === 'travel') && prev.some(c => c.toLowerCase() === 'urban');
      if (isCurrentlyActive) {
        return prev.filter(c => c.toLowerCase() !== 'travel' && c.toLowerCase() !== 'urban');
      } else {
        const withoutThem = prev.filter(c => c.toLowerCase() !== 'travel' && c.toLowerCase() !== 'urban');
        return [...withoutThem, 'travel', 'urban'];
      }
    });
  };

  // Count of urban and architecture themed photos
  const urbanPhotosCount = useMemo(() => {
    return libraryPhotos.filter(p => {
      const c = (p.category || '').toLowerCase();
      const tags = p.tags || p.aiTags || [];
      const hasTag = tags.some(t => t.toLowerCase() === 'urban' || t.toLowerCase() === 'architecture' || t.toLowerCase() === 'city' || t.toLowerCase() === 'building' || t.toLowerCase() === 'skyline');
      return c === 'urban' || c === 'architecture' || hasTag;
    }).length;
  }, [libraryPhotos]);

  // Dedicated 'Urban' filter button handler that updates selectedCategories to include 'urban' and 'architecture'
  const isUrbanFilterActive = useMemo(() => {
    return selectedCategories.some(c => c.toLowerCase() === 'urban') && selectedCategories.some(c => c.toLowerCase() === 'architecture');
  }, [selectedCategories]);

  const handleToggleUrbanFilter = () => {
    setSelectedCategories(prev => {
      const isCurrentlyActive = prev.some(c => c.toLowerCase() === 'urban') && prev.some(c => c.toLowerCase() === 'architecture');
      if (isCurrentlyActive) {
        return prev.filter(c => c.toLowerCase() !== 'urban' && c.toLowerCase() !== 'architecture');
      } else {
        const withoutThem = prev.filter(c => c.toLowerCase() !== 'urban' && c.toLowerCase() !== 'architecture');
        return [...withoutThem, 'urban', 'architecture'];
      }
    });
  };

  // Count of work and document themed photos
  const workPhotosCount = useMemo(() => {
    return libraryPhotos.filter(p => {
      const c = (p.category || '').toLowerCase();
      const tags = p.tags || p.aiTags || [];
      const hasTag = tags.some(t => t.toLowerCase() === 'work' || t.toLowerCase() === 'document' || t.toLowerCase() === 'office' || t.toLowerCase() === 'receipt' || t.toLowerCase() === 'text' || t.toLowerCase() === 'documents');
      return c === 'work' || c === 'document' || c === 'documents' || hasTag;
    }).length;
  }, [libraryPhotos]);

  // Dedicated 'Work' filter button handler that updates selectedCategories to include 'work' and 'document'
  const isWorkFilterActive = useMemo(() => {
    return selectedCategories.some(c => c.toLowerCase() === 'work') && selectedCategories.some(c => c.toLowerCase() === 'document');
  }, [selectedCategories]);

  const handleToggleWorkFilter = () => {
    setSelectedCategories(prev => {
      const isCurrentlyActive = prev.some(c => c.toLowerCase() === 'work') && prev.some(c => c.toLowerCase() === 'document');
      if (isCurrentlyActive) {
        return prev.filter(c => c.toLowerCase() !== 'work' && c.toLowerCase() !== 'document');
      } else {
        const withoutThem = prev.filter(c => c.toLowerCase() !== 'work' && c.toLowerCase() !== 'document');
        return [...withoutThem, 'work', 'document'];
      }
    });
  };

  // FastView Profile State & Listener for PC vs Mobile Dual-Mode
  const [fastViewProfile, setFastViewProfile] = useState(() => fastViewEngine.getProfileConfig());

  useEffect(() => {
    const unsubscribe = fastViewEngine.subscribeProfile((config) => {
      setFastViewProfile(config);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem('library_view_layout', viewLayout);
  }, [viewLayout]);

  useEffect(() => {
    localStorage.setItem('library_view_sort_by', viewSortBy);
  }, [viewSortBy]);

  useEffect(() => {
    localStorage.setItem('library_view_sort_order', viewSortOrder);
  }, [viewSortOrder]);

  useEffect(() => {
    localStorage.setItem('library_view_group_by', viewGroupBy);
  }, [viewGroupBy]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sortedPhotos = useMemo(() => {
    const photosCopy = [...filteredLibraryPhotos];
    return photosCopy.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (viewSortBy === 'dateTaken') {
        valA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        valB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
      } else if (viewSortBy === 'size') {
        valA = a.size || 0;
        valB = b.size || 0;
      } else if (viewSortBy === 'name') {
        valA = (a.path || '').split('/').pop()?.toLowerCase() || '';
        valB = (b.path || '').split('/').pop()?.toLowerCase() || '';
      } else if (viewSortBy === 'category') {
        valA = (a.category || '').toLowerCase();
        valB = (b.category || '').toLowerCase();
      } else if (viewSortBy === 'qualityScore') {
        valA = a.qualityScore || 0;
        valB = b.qualityScore || 0;
      } else if (viewSortBy === 'aiScore') {
        valA = a.aiScore || 0;
        valB = b.aiScore || 0;
      }

      if (valA < valB) return viewSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return viewSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLibraryPhotos, viewSortBy, viewSortOrder]);

  // Unique animation key derived from filter and sort criteria to trigger staggered fade-in animations
  const filterSortAnimationKey = useMemo(() => {
    return [
      searchQuery.trim(),
      selectedCategories.slice().sort().join(','),
      selectedQualityTags.slice().sort().join(','),
      selectedFormats.slice().sort().join(','),
      selectedYears.slice().sort().join(','),
      selectedLocations.slice().sort().join(','),
      selectedSizes.slice().sort().join(','),
      selectedOrientations.slice().sort().join(','),
      selectedCameras.slice().sort().join(','),
      viewSortBy,
      viewSortOrder,
      viewLayout,
      viewGroupBy
    ].join('::');
  }, [
    searchQuery,
    selectedCategories,
    selectedQualityTags,
    selectedFormats,
    selectedYears,
    selectedLocations,
    selectedSizes,
    selectedOrientations,
    selectedCameras,
    viewSortBy,
    viewSortOrder,
    viewLayout,
    viewGroupBy
  ]);

  const [visibleCount, setVisibleCount] = useState(120);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(120);
  }, [
    searchQuery,
    selectedCategories,
    selectedQualityTags,
    selectedFormats,
    selectedYears,
    selectedLocations,
    selectedSizes,
    selectedOrientations,
    selectedCameras,
    viewLayout,
    viewGroupBy
  ]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 120);
      }
    }, { rootMargin: '400px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef, sortedPhotos.length]);

  // Predictive FastView DLL Prefetching Queue tailored to PC / Mobile Dual-Mode
  useEffect(() => {
    if (sortedPhotos.length > 0) {
      const distance = fastViewProfile.prefetchDistance || 48;
      const sliceToPrefetch = sortedPhotos.slice(0, Math.min(visibleCount + distance, sortedPhotos.length));
      fastViewEngine.prefetchBatch(sliceToPrefetch);
    }
  }, [sortedPhotos, visibleCount, fastViewProfile]);

  const groupedPhotosMap = useMemo(() => {
    if (viewGroupBy === 'none') return null;

    const groups: Record<string, PhotoRecord[]> = {};

    sortedPhotos.forEach(p => {
      let groupKey = 'Other';

      if (viewGroupBy === 'category') {
        groupKey = p.category || 'Uncategorized';
      } else if (viewGroupBy === 'type') {
        groupKey = p.path ? (p.path.split('.').pop()?.toUpperCase() || 'UNKNOWN') : 'UNKNOWN';
      } else if (viewGroupBy === 'year') {
        groupKey = p.dateTaken ? new Date(p.dateTaken).getFullYear().toString() : 'Unknown Year';
      } else if (viewGroupBy === 'size') {
        const sizeMb = p.size / (1024 * 1024);
        if (sizeMb >= 5) {
          groupKey = language === 'ko' ? '대용량 (5MB 이상)' : 'Large (>= 5MB)';
        } else if (sizeMb >= 1) {
          groupKey = language === 'ko' ? '중간 용량 (1MB - 5MB)' : 'Medium (1MB - 5MB)';
        } else {
          groupKey = language === 'ko' ? '소용량 (1MB 미만)' : 'Small (< 1MB)';
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(p);
    });

    return groups;
  }, [sortedPhotos, viewGroupBy, language]);

  const renderPhotosListOrGrid = (photosToRender: PhotoRecord[], prefix = 'library') => {
    if (photosToRender.length === 0) {
      return (
        <div className="text-center p-8 text-slate-500 font-mono text-xs">
          {language === 'ko' ? '검색 필터와 일치하는 파일이 없습니다.' : 'No files matching filters or sorting criteria.'}
        </div>
      );
    }

    const slicedPhotos = photosToRender.slice(0, visibleCount);

    if (viewLayout === 'list') {
      return (
        <div className="flex flex-col gap-2 bg-slate-950/20 p-2 rounded-xl border border-white/5">
          {slicedPhotos.map((photo, idx) => {
            const isSelected = isMultiSelectMode || selectedPhotoIds.length > 0 ? selectedPhotoIds.includes(photo.id!) : selectedPhotoId === photo.id;
            const filename = photo.path.split('/').pop() || 'document';
            const sizeMb = (photo.size / (1024 * 1024)).toFixed(2);
            
            const isAudio = photo.type?.startsWith('audio/') || photo.path?.toLowerCase().match(/\.(mp3|wav|ogg|m4a|flac)$/);
            const isVideo = photo.type?.startsWith('video/') || photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
            const isPdf = photo.type === 'application/pdf' || photo.path?.toLowerCase().endsWith('.pdf');
            const isDocText = photo.path?.toLowerCase().match(/\.(txt|csv|json|md)$/);

            return (
              <motion.div 
                key={`list-photo-${filterSortAnimationKey}-${prefix}-${photo.id}-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.24,
                  delay: Math.min((idx % 24) * 0.02, 0.3),
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => {
                  if (isMultiSelectMode || selectedPhotoIds.length > 0) {
                    setSelectedPhotoIds(prev => 
                      prev.includes(photo.id!) ? prev.filter(id => id !== photo.id) : [...prev, photo.id!]
                    );
                  } else {
                    setSelectedPhotoId(photo.id || null);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, photo)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  SystemAPI.openInDefaultApp(photo, addNotification);
                }}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all cv-row ${
                  isSelected 
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-white' 
                    : 'bg-white/[0.01] border-white/5 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                    {isAudio ? (
                      <Music size={14} className="text-fuchsia-400" />
                    ) : isPdf ? (
                      <FileText size={14} className="text-blue-400" />
                    ) : isVideo ? (
                      <Video size={14} className="text-sky-400" />
                    ) : isDocText ? (
                      <FileText size={14} className="text-emerald-400" />
                    ) : (
                      <LibMiniThumbnail thumbnail={photo.thumbnail} photo={photo} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-bold truncate text-slate-100">{filename}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{photo.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded uppercase text-[9px] font-mono border border-white/5">
                    {photo.category || 'Uncategorized'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] w-16">
                    {sizeMb} MB
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      );
    }

    if (viewLayout === 'details') {
      return (
        <div className="overflow-x-auto bg-slate-950/20 rounded-xl border border-white/5 shadow-2xl">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-md">
                <th className="p-3 w-14 text-center">Preview</th>
                <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  if (viewSortBy === 'name') setViewSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  else { setViewSortBy('name'); setViewSortOrder('asc'); }
                }}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ko' ? '파일명' : 'File Name'}</span>
                    {viewSortBy === 'name' && (viewSortOrder === 'asc' ? <ArrowUp size={11} className="text-indigo-400" /> : <ArrowDown size={11} className="text-indigo-400" />)}
                  </div>
                </th>
                <th className="p-3 min-w-[200px]">{language === 'ko' ? '폴더 위치' : 'Folder Path'}</th>
                <th className="p-3">{language === 'ko' ? '카테고리' : 'Category'}</th>
                <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  if (viewSortBy === 'dateTaken') setViewSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  else { setViewSortBy('dateTaken'); setViewSortOrder('desc'); }
                }}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ko' ? '촬영일' : 'Date Taken'}</span>
                    {viewSortBy === 'dateTaken' && (viewSortOrder === 'asc' ? <ArrowUp size={11} className="text-indigo-400" /> : <ArrowDown size={11} className="text-indigo-400" />)}
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  if (viewSortBy === 'size') setViewSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  else { setViewSortBy('size'); setViewSortOrder('desc'); }
                }}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ko' ? '크기' : 'Size'}</span>
                    {viewSortBy === 'size' && (viewSortOrder === 'asc' ? <ArrowUp size={11} className="text-indigo-400" /> : <ArrowDown size={11} className="text-indigo-400" />)}
                  </div>
                </th>
                <th className="p-3">{language === 'ko' ? '유형' : 'Type'}</th>
                <th className="p-3 text-right">{language === 'ko' ? '해상도' : 'Dimension'}</th>
                <th className="p-3 w-16 text-right pr-4">{language === 'ko' ? '열기' : 'Open'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {slicedPhotos.map((photo, idx) => {
                const isSelected = isMultiSelectMode || selectedPhotoIds.length > 0 ? selectedPhotoIds.includes(photo.id!) : selectedPhotoId === photo.id;
                const filename = photo.path.split('/').pop()?.split('\\').pop() || 'document';
                const folderPath = photo.path.includes('\\') 
                  ? photo.path.substring(0, photo.path.lastIndexOf('\\') + 1)
                  : photo.path.substring(0, photo.path.lastIndexOf('/') + 1) || '/';
                const sizeMb = (photo.size / (1024 * 1024)).toFixed(2);
                const dateTakenStr = photo.dateTaken ? new Date(photo.dateTaken).toLocaleString() : '-';
                const ext = photo.path.split('.').pop()?.toUpperCase() || 'UNKNOWN';
                const dimensions = photo.width && photo.height ? `${photo.width} x ${photo.height}` : '-';

                const isAudio = photo.type?.startsWith('audio/') || photo.path?.toLowerCase().match(/\.(mp3|wav|ogg|m4a|flac)$/);
                const isVideo = photo.type?.startsWith('video/') || photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
                const isPdf = photo.type === 'application/pdf' || photo.path?.toLowerCase().endsWith('.pdf');
                const isDocText = photo.path?.toLowerCase().match(/\.(txt|csv|json|md)$/);

                return (
                  <motion.tr 
                    key={`details-row-${filterSortAnimationKey}-${prefix}-${photo.id}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min((idx % 30) * 0.015, 0.25),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={() => {
                      if (isMultiSelectMode || selectedPhotoIds.length > 0) {
                        setSelectedPhotoIds(prev => 
                          prev.includes(photo.id!) ? prev.filter(id => id !== photo.id) : [...prev, photo.id!]
                        );
                      } else {
                        setSelectedPhotoId(photo.id || null);
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, photo)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      SystemAPI.openInDefaultApp(photo, addNotification);
                    }}
                    className={`cursor-pointer transition-colors group cv-row ${
                      isSelected 
                        ? 'bg-indigo-600/20 text-white ring-1 ring-inset ring-indigo-500' 
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <td className="p-2 flex justify-center">
                      <div className="w-10 h-10 rounded bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                        {isAudio ? (
                          <Music size={14} className="text-fuchsia-400" />
                        ) : isPdf ? (
                          <FileText size={14} className="text-blue-400" />
                        ) : isVideo ? (
                          <Video size={14} className="text-sky-400" />
                        ) : isDocText ? (
                          <FileText size={14} className="text-emerald-400" />
                        ) : (
                          <LibMiniThumbnail thumbnail={photo.thumbnail} photo={photo} />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold truncate max-w-[200px]" title={filename}>{filename}</td>
                    <td className="p-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 max-w-[240px] truncate">
                        <Folder size={11} className="shrink-0 text-amber-400/80" />
                        <span className="truncate" title={folderPath}>{folderPath}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(photo.path);
                            addNotification(
                              language === 'ko' ? '경로 복사 완료' : 'Path Copied',
                              photo.path,
                              'info'
                            );
                          }}
                          className="p-0.5 text-slate-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                          title={language === 'ko' ? '전체 경로 복사' : 'Copy path'}
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded uppercase text-[9px] font-mono border border-white/5">
                        {photo.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px] font-mono">{dateTakenStr}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{sizeMb} MB</td>
                    <td className="p-3 text-slate-400 font-mono text-[10px] font-black">{ext}</td>
                    <td className="p-3 text-right text-slate-400 font-mono text-[11px]">{dimensions}</td>
                    <td className="p-3 text-right pr-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          SystemAPI.openInDefaultApp(photo, addNotification);
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-white/5"
                        title={
                          language === 'ko'
                            ? 'Windows 연결 프로그램으로 열기 (더블클릭 가능)'
                            : 'Open with Windows default application'
                        }
                      >
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Grid modes
    let gridClass = 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4';
    if (viewLayout === 'extra-large') {
      gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    } else if (viewLayout === 'large') {
      gridClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';
    } else if (viewLayout === 'medium') {
      gridClass = 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3';
    } else if (viewLayout === 'small') {
      gridClass = 'grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5';
    }

    let estimatedItemHeight = 220;
    let estimatedCols = 4;
    if (viewLayout === 'extra-large') {
      estimatedItemHeight = 360;
      estimatedCols = 2;
    } else if (viewLayout === 'large') {
      estimatedItemHeight = 280;
      estimatedCols = 4;
    } else if (viewLayout === 'medium') {
      estimatedItemHeight = 200;
      estimatedCols = 6;
    } else if (viewLayout === 'small') {
      estimatedItemHeight = 130;
      estimatedCols = 8;
    }

    return (
      <VirtualGrid
        items={slicedPhotos}
        itemHeight={estimatedItemHeight}
        columns={estimatedCols}
        overscan={2}
        gridClassName={`grid ${gridClass}`}
        renderItem={(photo, idx) => (
          <motion.div
            key={`grid-photo-${filterSortAnimationKey}-${prefix}-${photo.id}-${idx}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.28,
              delay: Math.min((idx % 30) * 0.025, 0.35),
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full h-full"
          >
            <PhotoCard 
              photo={photo} 
              selected={isMultiSelectMode || selectedPhotoIds.length > 0 ? selectedPhotoIds.includes(photo.id!) : selectedPhotoId === photo.id}
              onClick={() => {
                if (isMultiSelectMode || selectedPhotoIds.length > 0) {
                  setSelectedPhotoIds(prev => 
                    prev.includes(photo.id!) ? prev.filter(id => id !== photo.id) : [...prev, photo.id!]
                  );
                } else {
                  setSelectedPhotoId(photo.id || null);
                }
              }}
              onEnhance={handleEnhance} 
              onAnimate={onAnimatePhoto}
              onContextMenu={handleContextMenu}
              addNotification={addNotification}
              onDoubleClick={(p) => {
                SystemAPI.openInDefaultApp(p, addNotification);
              }}
            />
          </motion.div>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all"
              title={language === 'ko' ? "검색어 비우기" : "Clear Search"}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isAiConfigured && (
          <button 
            onClick={() => {
              setShowDistributionChart(true);
              handleSmartSearch();
            }}
            disabled={isProcessingSmartQuery || !searchQuery.trim()}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 rounded-2xl transition-all text-sm font-bold disabled:opacity-40 cursor-pointer shadow-md shadow-purple-500/10 shrink-0"
            title={language === 'ko' ? "Gemini AI 자연어 문맥 분석 검색" : "Gemini AI Semantic Search"}
          >
            <Sparkles size={16} className={isProcessingSmartQuery ? 'animate-spin text-purple-300' : 'text-purple-400'} />
            <span>{isProcessingSmartQuery ? (language === 'ko' ? 'AI 분석 중...' : 'AI Searching...') : (language === 'ko' ? 'AI 스마트 검색' : 'AI Search')}</span>
          </button>
        )}

        <button 
          onClick={handleSyncLibrary}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl border border-white/10 transition-all text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? t('syncing') : t('syncDisk')}
        </button>

        {/* 'Select by Category' Header Filter Dropdown */}
        <div className="relative shrink-0" ref={headerCategoryDropdownRef}>
          <button
            type="button"
            onClick={() => setShowHeaderCategoryDropdown(!showHeaderCategoryDropdown)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-sm font-bold cursor-pointer shadow-md ${
              selectedCategories.length > 0
                ? 'bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-purple-500/20 ring-1 ring-purple-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title={language === 'ko' ? '카테고리별 사진 필터링 선택' : 'Select by Category filter'}
          >
            <Filter size={16} className={selectedCategories.length > 0 ? 'text-purple-300 animate-pulse' : 'text-purple-400'} />
            <span className="truncate max-w-[130px] sm:max-w-[180px]">
              {selectedCategories.length === 0
                ? (language === 'ko' ? '카테고리 선택' : 'Select by Category')
                : selectedCategories.length === 1
                ? `${getCategoryIcon(selectedCategories[0])} ${getLocalizedCategory(selectedCategories[0], t)}`
                : `${language === 'ko' ? '카테고리 ' : 'Categories '}(${selectedCategories.length})`}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showHeaderCategoryDropdown ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          <AnimatePresence>
            {showHeaderCategoryDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-[#0f172a]/95 border border-purple-500/30 rounded-2xl shadow-2xl backdrop-blur-xl z-[500] p-2 space-y-1 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Filter size={12} className="text-purple-400" />
                    {language === 'ko' ? '카테고리 필터' : 'Select Category'}
                  </span>
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategories([]);
                        setShowHeaderCategoryDropdown(false);
                      }}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                    >
                      {language === 'ko' ? '전체 초기화' : 'Reset'}
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto no-scrollbar space-y-0.5 py-1">
                  {/* All Categories option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategories([]);
                      setShowHeaderCategoryDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedCategories.length === 0
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🖼️</span>
                      <span>{language === 'ko' ? '전체 (All)' : 'All Categories'}</span>
                    </div>
                    <span className="text-[10px] opacity-70 font-mono">({libraryPhotos.length})</span>
                  </button>

                  <div className="h-px bg-white/5 my-1" />

                  {/* List of preset & detected categories */}
                  {categoryDropdownOptions.map(catOption => {
                    const isSelected = selectedCategories.some(c => c.toLowerCase() === catOption.name.toLowerCase());
                    return (
                      <button
                        key={catOption.name}
                        type="button"
                        onClick={() => {
                          const nameLower = catOption.name.toLowerCase();
                          if (nameLower === 'nature' || nameLower === 'landscape') {
                            handleToggleNatureFilter();
                          } else if (nameLower === 'people' || nameLower === 'portrait') {
                            handleTogglePeopleFilter();
                          } else if (nameLower === 'travel') {
                            handleToggleTravelFilter();
                          } else {
                            setSelectedCategories(prev => {
                              const exists = prev.some(c => c.toLowerCase() === catOption.name.toLowerCase());
                              if (exists) {
                                return prev.filter(c => c.toLowerCase() !== catOption.name.toLowerCase());
                              } else {
                                return [...prev, catOption.name];
                              }
                            });
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{getCategoryIcon(catOption.name)}</span>
                          <span className="truncate">{getLocalizedCategory(catOption.name, t)}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                          {catOption.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 'Sort By' Header Dropdown */}
        <div className="relative shrink-0" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-sm font-bold cursor-pointer shadow-md ${
              showSortDropdown 
                ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title={language === 'ko' ? '정렬 기준 선택' : 'Sort photos by'}
          >
            <ArrowUpDown size={16} className="text-indigo-400" />
            <span className="truncate max-w-[100px] sm:max-w-[140px]">
              {viewSortBy === 'dateTaken' ? (language === 'ko' ? '촬영 날짜' : 'Date Taken') :
               viewSortBy === 'size' ? (language === 'ko' ? '파일 크기' : 'File Size') :
               viewSortBy === 'name' ? (language === 'ko' ? '파일명' : 'File Name') :
               viewSortBy === 'category' ? (language === 'ko' ? '카테고리' : 'Category') :
               viewSortBy === 'qualityScore' ? (language === 'ko' ? '품질 점수' : 'Quality Score') :
               (language === 'ko' ? 'AI 미적 점수' : 'AI Score')}
              {` (${viewSortOrder === 'desc' ? (language === 'ko' ? '내림' : 'Desc') : (language === 'ko' ? '올림' : 'Asc')})`}
            </span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showSortDropdown ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          <AnimatePresence>
            {showSortDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-[#0f172a]/95 border border-indigo-500/30 rounded-2xl shadow-2xl backdrop-blur-xl z-[500] p-2 space-y-1"
              >
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <ArrowUpDown size={12} className="text-indigo-400" />
                    {language === 'ko' ? '정렬 기준' : 'Sort By'}
                  </span>
                </div>

                <div className="space-y-0.5 py-1">
                  {[
                    { id: 'dateTaken', label: language === 'ko' ? '촬영 날짜' : 'Date Taken', icon: <Clock size={14} /> },
                    { id: 'size', label: language === 'ko' ? '파일 크기' : 'File Size', icon: <HardDrive size={14} /> },
                    { id: 'name', label: language === 'ko' ? '파일명' : 'File Name', icon: <Type size={14} /> },
                    { id: 'category', label: language === 'ko' ? '카테고리' : 'Category', icon: <Filter size={14} /> },
                    { id: 'qualityScore', label: language === 'ko' ? '품질 점수' : 'Quality Score', icon: <Zap size={14} /> },
                    { id: 'aiScore', label: language === 'ko' ? 'AI 미적 점수' : 'AI Score', icon: <Sparkles size={14} /> },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setViewSortBy(option.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewSortBy === option.id 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="opacity-70">{option.icon}</span>
                        <span>{option.label}</span>
                      </div>
                      {viewSortBy === option.id && <Check size={12} />}
                    </button>
                  ))}

                  <div className="h-px bg-white/5 my-1" />

                  {/* Sort Order Toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1">
                    <button
                      onClick={() => setViewSortOrder('asc')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                        viewSortOrder === 'asc' 
                          ? 'bg-indigo-500/30 border border-indigo-400/50 text-white' 
                          : 'bg-white/5 text-slate-500 hover:text-white border border-transparent'
                      }`}
                    >
                      <ArrowUp size={12} />
                      {language === 'ko' ? '오름차순' : 'Asc'}
                    </button>
                    <button
                      onClick={() => setViewSortOrder('desc')}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                        viewSortOrder === 'desc' 
                          ? 'bg-indigo-500/30 border border-indigo-400/50 text-white' 
                          : 'bg-white/5 text-slate-500 hover:text-white border border-transparent'
                      }`}
                    >
                      <ArrowDown size={12} />
                      {language === 'ko' ? '내림차순' : 'Desc'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 mb-6">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
          <button 
            onClick={() => setSelectedCategories([])}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedCategories.length === 0 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            {t('aiAll')}
          </button>

          <Tooltip
            title={language === 'ko' ? '자연 및 풍경 필터' : 'Nature & Landscape Filter'}
            content={language === 'ko' ? "'nature' 및 'landscape' 카테고리를 필터에 추가하여 자연·풍경 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'nature' and 'landscape' to quickly isolate nature-themed photos."}
          >
            <button
              onClick={handleToggleNatureFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isNatureFilterActive
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:text-white'
              }`}
            >
              <span>🌿</span>
              <span>{language === 'ko' ? '자연 (Nature)' : 'Nature'}</span>
              {naturePhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isNatureFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {naturePhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '풍경 및 자연 필터' : 'Landscape & Nature Filter'}
            content={language === 'ko' ? "'nature' 및 'landscape' 카테고리를 필터에 추가하여 풍경·자연 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'nature' and 'landscape' to quickly isolate landscape and nature photos."}
          >
            <button
              onClick={handleToggleLandscapeFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isLandscapeFilterActive
                  ? 'bg-teal-600 border-teal-400 text-white shadow-teal-600/30 ring-1 ring-teal-400'
                  : 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30 text-teal-300 hover:text-white'
              }`}
            >
              <span>🏞️</span>
              <span>{language === 'ko' ? '풍경 (Landscape)' : 'Landscape'}</span>
              {naturePhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isLandscapeFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-500/20 text-teal-300'
                }`}>
                  {naturePhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '인물 및 포트레이트 필터' : 'People & Portrait Filter'}
            content={language === 'ko' ? "'people' 및 'portrait' 카테고리를 필터에 추가하여 인물·포트레이트 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'people' and 'portrait' to quickly isolate photos featuring people."}
          >
            <button
              onClick={handleTogglePeopleFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isPeopleFilterActive
                  ? 'bg-blue-600 border-blue-400 text-white shadow-blue-600/30 ring-1 ring-blue-400'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span>{language === 'ko' ? '인물 (People)' : 'People'}</span>
              {peoplePhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isPeopleFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {peoplePhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '여행 및 도시 필터' : 'Travel & Urban Filter'}
            content={language === 'ko' ? "'travel' 및 'urban' 카테고리를 필터에 추가하여 여행·도시 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'travel' and 'urban' to quickly isolate travel-themed photos."}
          >
            <button
              onClick={handleToggleTravelFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isTravelFilterActive
                  ? 'bg-amber-600 border-amber-400 text-white shadow-amber-600/30 ring-1 ring-amber-400'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 hover:text-white'
              }`}
            >
              <span>✈️</span>
              <span>{language === 'ko' ? '여행 (Travel)' : 'Travel'}</span>
              {travelPhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isTravelFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {travelPhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '도시 및 건축 필터' : 'Urban & Architecture Filter'}
            content={language === 'ko' ? "'urban' 및 'architecture' 카테고리를 필터에 추가하여 도시·건축 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'urban' and 'architecture' to quickly isolate city-themed photos."}
          >
            <button
              onClick={handleToggleUrbanFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isUrbanFilterActive
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-600/30 ring-1 ring-cyan-400'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:text-white'
              }`}
            >
              <span>🏙️</span>
              <span>{language === 'ko' ? '도시 (Urban)' : 'Urban'}</span>
              {urbanPhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isUrbanFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {urbanPhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '업무 및 문서 필터' : 'Work & Document Filter'}
            content={language === 'ko' ? "'work' 및 'document' 카테고리를 필터에 추가하여 업무·영수증·텍스트 테마 사진만 즉시 분리 표시합니다." : "Updates selectedCategories to include 'work' and 'document' to quickly isolate business-related photos."}
          >
            <button
              onClick={handleToggleWorkFilter}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border shadow-sm ${
                isWorkFilterActive
                  ? 'bg-slate-600 border-slate-400 text-white shadow-slate-600/30 ring-1 ring-slate-400'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30 text-slate-300 hover:text-white'
              }`}
            >
              <span>💼</span>
              <span>{language === 'ko' ? '업무 (Work)' : 'Work'}</span>
              {workPhotosCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isWorkFilterActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-500/20 text-slate-300'
                }`}>
                  {workPhotosCount}
                </span>
              )}
            </button>
          </Tooltip>

          {(Object.entries(categoryStats) as [string, { count: number, size: number }][]).map(([cat, data], idx) => {
            const isCatSelected = selectedCategories.some(c => c.toLowerCase() === cat.toLowerCase());
            return (
              <button
                key={`${cat}-${idx}`}
                onClick={() => setSelectedCategories(prev => {
                  const exists = prev.some(c => c.toLowerCase() === cat.toLowerCase());
                  return exists ? prev.filter(c => c.toLowerCase() !== cat.toLowerCase()) : [...prev, cat];
                })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${isCatSelected ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                {getLocalizedCategory(cat, t)} ({data.count})
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetAllFilters}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title={language === 'ko' ? '모든 필터 초기화' : 'Reset all filters'}
            >
              <RotateCcw size={11} />
              <span>{language === 'ko' ? '필터 초기화' : 'Reset'}</span>
            </button>
          )}

          <Tooltip
            title={language === 'ko' ? '카테고리별 사진 선택' : 'Select by Category'}
            content={language === 'ko' ? 'AI가 감지한 카테고리(자연, 인물 등)의 모든 사진을 즉시 일괄 하이라이트 선택합니다.' : 'Instantly select and highlight all photos in a specific category.'}
          >
            <button
              type="button"
              onClick={() => setShowCategorySelectMenu(true)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Sparkles size={11} className="text-purple-400" />
              <span>{language === 'ko' ? '카테고리별 선택' : 'Select by Category'}</span>
            </button>
          </Tooltip>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 cursor-pointer flex-1 sm:flex-initial justify-center ${showAdvancedFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
          >
            <SlidersHorizontal size={12} />
            <span>{language === 'ko' ? '상세 필터' : 'Advanced Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mr-1">
            {language === 'ko' ? '적용된 필터:' : 'Active Filters:'}
          </span>
          <AnimatePresence mode="popLayout">
            {selectedCategories.map(cat => (
              <motion.span 
                key={`cat-${cat}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 shadow-sm"
              >
                <span className="opacity-80">{getCategoryIcon(cat)}</span>
                <span>{getLocalizedCategory(cat, t)}</span>
                <button 
                  onClick={() => setSelectedCategories(prev => prev.filter(c => c !== cat))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedQualityTags.map(q => (
              <motion.span 
                key={`q-${q}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/30 shadow-sm"
              >
                <span>{t(q.toLowerCase() as any)}</span>
                <button 
                  onClick={() => setSelectedQualityTags(prev => prev.filter(item => item !== q))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedSizes.map(s => (
              <motion.span 
                key={`s-${s}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-600/30 text-fuchsia-200 border border-fuchsia-500/30 shadow-sm"
              >
                <span>{t(s.includes("Large") ? "largeSize" : s.includes("Medium") ? "mediumSize" : "smallSize" as any)}</span>
                <button 
                  onClick={() => setSelectedSizes(prev => prev.filter(item => item !== s))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedOrientations.map(o => (
              <motion.span 
                key={`o-${o}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-600/30 text-cyan-200 border border-cyan-500/30 shadow-sm"
              >
                <span>{t(o.toLowerCase() as any)}</span>
                <button 
                  onClick={() => setSelectedOrientations(prev => prev.filter(item => item !== o))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedFormats.map(f => (
              <motion.span 
                key={`f-${f}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700/60 text-slate-200 border border-slate-600/40 shadow-sm"
              >
                <span>{f}</span>
                <button 
                  onClick={() => setSelectedFormats(prev => prev.filter(item => item !== f))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedYears.map(y => (
              <motion.span 
                key={`y-${y}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600/30 text-rose-200 border border-rose-500/30 shadow-sm"
              >
                <span>{y}</span>
                <button 
                  onClick={() => setSelectedYears(prev => prev.filter(item => item !== y))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedLocations.map(loc => (
              <motion.span 
                key={`loc-${loc}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/30 text-orange-200 border border-orange-500/30 shadow-sm"
              >
                <MapPin size={10} className="opacity-70" />
                <span>{loc}</span>
                <button 
                  onClick={() => handleSelectLocation(loc)} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {selectedCameras.map(c => (
              <motion.span 
                key={`cam-${c}`} 
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                layout
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 shadow-sm"
              >
                <span>{c}</span>
                <button 
                  onClick={() => setSelectedCameras(prev => prev.filter(item => item !== c))} 
                  className="hover:text-white cursor-pointer ml-0.5 transition-colors p-0.5 rounded-full hover:bg-white/10"
                  title={language === 'ko' ? '필터 제거' : 'Clear filter'}
                >
                  <X size={10} />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <SlidersHorizontal size={14} className="text-indigo-400" />
                  <span>{language === 'ko' ? '상세 필터 설정' : 'Advanced Filters'}</span>
                  {activeFiltersCount > 0 && (
                    <span className="text-[10px] text-indigo-400 font-normal">
                      ({activeFiltersCount}{language === 'ko' ? '개 적용됨' : ' active'})
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetAllFilters}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  >
                    <RotateCcw size={11} />
                    <span>{language === 'ko' ? '필터 전체 초기화' : 'Reset All'}</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Quality Filters */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('quality')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Blurry', 'Dark', 'Bright'].map((q, idx) => (
                      <button
                        key={`${q}-${idx}`}
                        onClick={() => setSelectedQualityTags(prev => prev.includes(q) ? prev.filter(item => item !== q) : [...prev, q])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${selectedQualityTags.includes(q) ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >{t(q.toLowerCase() as any)}</button>
                    ))}
                  </div>
                </div>

                {/* Sizes Filters */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('size')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Large (>5MB)', 'Medium (1-5MB)', 'Small (<1MB)'].map((s, idx) => (
                      <button
                        key={`${s}-${idx}`}
                        onClick={() => setSelectedSizes(prev => prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedSizes.includes(s) ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >{t(s.includes("Large") ? "largeSize" : s.includes("Medium") ? "mediumSize" : "smallSize" as any)}</button>
                    ))}
                  </div>
                </div>

                {/* Orientations Filters */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('orientation')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Landscape', 'Portrait', 'Square'].map((o, idx) => (
                      <button
                        key={`${o}-${idx}`}
                        onClick={() => setSelectedOrientations(prev => prev.includes(o) ? prev.filter(item => item !== o) : [...prev, o])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedOrientations.includes(o) ? 'bg-cyan-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >{t(o.toLowerCase() as any)}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-white/5" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Format Filters */}
                <div className="space-y-1.5 md:col-span-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('format')}</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {['JPG', 'PNG', 'GIF', 'HEIC', 'PDF', 'MP4', 'MP3', 'WAV', 'TXT', 'JSON', 'CSV', 'MD', 'RAW', 'DNG'].map((f, idx) => (
                      <button
                        key={`${f}-${idx}`}
                        onClick={() => setSelectedFormats(prev => prev.includes(f) ? prev.filter(item => item !== f) : [...prev, f])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${selectedFormats.includes(f) ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Years Filters */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('year')}</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {Object.keys(dateStats).sort().reverse().map((y, idx) => (
                      <button
                        key={`${y}-${idx}`}
                        onClick={() => setSelectedYears(prev => prev.includes(y) ? prev.filter(item => item !== y) : [...prev, y])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedYears.includes(y) ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic location/camera metrics */}
              {(locations.length > 0 || cameraModels.length > 0) && (
                <>
                  <div className="h-[1px] bg-white/5" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('location')}</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                          {locations.map((loc, idx) => (
                            <button
                              key={`${loc.id}-${idx}`}
                              onClick={() => handleSelectLocation(loc.name)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedLocations.includes(loc.name) ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                            >
                              {loc.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {cameraModels.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('camera')}</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                          {cameraModels.map((c, idx) => (
                            <button
                              key={`${c}-${idx}`}
                              onClick={() => setSelectedCameras(prev => prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c])}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${selectedCameras.includes(c) ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2 mb-8 items-center">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-2">Try searching:</span>
        {['Sunset', 'Family', 'Nature', 'Travel', 'Receipt', 'Portrait'].map((tag, idx) => (
          <button 
            key={`${tag}-${idx}`}
            onClick={() => setSearchQuery(tag)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[10px] text-slate-400 transition-colors cursor-pointer border border-white/5"
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {filteredLibraryPhotos.length} {t('photosFound')}
            </div>
            {selectedPhotoIds.length > 0 && (
              <div className="text-[9px] text-indigo-400 font-bold uppercase mt-1">
                {selectedPhotoIds.length} {t('assetsSelectedForBatch')}
              </div>
            )}
          </div>

          {/* FastView Dual-Mode Status Badge */}
          <Tooltip
            title={language === 'ko' ? 'FastView 이원화 엔진 상태' : 'FastView Dual-Engine Status'}
            content={
              fastViewProfile.mode === 'pc'
                ? (language === 'ko' ? 'PC 초고성능 모드: L1 800개 캐시, 8쓰레드, 320px 썸네일, Hover Zoom 동작' : 'PC High Performance: L1 800 cache, 8 threads, 320px WebP, Hover Zoom')
                : (language === 'ko' ? '모바일 최적화 모드: L1 160개 캐시, 2쓰레드, 220px 썸네일, Touch Swipe & 저전력' : 'Mobile Optimized: L1 160 cache, 2 threads, 220px WebP, Touch Swipe & Low Power')
            }
          >
            <button
              onClick={() => setShowViewMenu(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                fastViewProfile.mode === 'pc'
                  ? 'bg-blue-950/80 border-blue-500/40 text-blue-300 hover:bg-blue-900/80'
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
              }`}
            >
              <Zap size={10} className={fastViewProfile.mode === 'pc' ? 'text-blue-400' : 'text-emerald-400'} />
              <span>
                FastView: {fastViewProfile.mode === 'pc' ? 'PC (High-Perf)' : 'Mobile (Low-Power)'}
              </span>
              {fastViewProfile.lowPowerSaverActive && (
                <span className="bg-amber-500/30 text-amber-300 px-1 rounded text-[8px]">
                  🔋 PowerSaver
                </span>
              )}
            </button>
          </Tooltip>
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Tooltip
            title={language === 'ko' ? '검색 분포 차트 시각화' : 'Distribution Bar Chart'}
            content={language === 'ko' ? '스마트 검색된 사진들의 카테고리 및 연도별 분포를 막대 차트(recharts)로 시각화합니다.' : 'Visualize photo distribution across categories and years using recharts.'}
          >
            <button 
              onClick={() => setShowDistributionChart(!showDistributionChart)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                showDistributionChart 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 size={14} className={showDistributionChart ? 'text-white' : 'text-indigo-400'} />
              <span>{language === 'ko' ? '데이터 시각화 뷰' : 'Chart View'}</span>
              {filteredLibraryPhotos.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  showDistributionChart ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300'
                }`}>
                  {filteredLibraryPhotos.length}
                </span>
              )}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '카테고리 요약 통계' : 'Category Summary'}
            content={language === 'ko' ? '전체 라이브러리의 카테고리별 사진 분포를 파이 차트와 요약 목록으로 확인합니다.' : 'Visual breakdown of photos by category using pie charts and summaries.'}
          >
            <button 
              onClick={() => setShowCategorySummary(!showCategorySummary)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${showCategorySummary ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              <BarChart3 size={14} className={showCategorySummary ? 'scale-110' : ''} />
              {language === 'ko' ? '카테고리 요약' : 'Category Summary'}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '탐색기 보기 설정' : 'View Options'}
            content={language === 'ko' ? '그리드 크기, 정렬 기준, 그룹화 방식(카테고리/연도/확장자)을 설정합니다.' : 'Configure grid thumbnail size, sorting criteria, and grouping modes.'}
          >
            <button 
              onClick={() => setShowViewMenu(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border bg-slate-900 border-white/10 text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer shadow-md"
            >
              <SlidersHorizontal size={14} />
              {language === 'ko' ? '탐색기 보기 설정' : 'View Options'}
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '지도 위치 뷰' : 'Photo Map View'}
            content={language === 'ko' ? 'GPS EXIF 좌표가 포함된 사진들의 전 세계 촬영 위치를 인터랙티브 지도로 확인합니다.' : 'Interactive world map visualizing photo GPS coordinates.'}
          >
            <button 
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${showMap ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              <MapPin size={14} className={showMap ? 'animate-bounce' : ''} />
              {showMap ? t('hideMap') : t('showMap')}
            </button>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence>
        {showDistributionChart && (
          <SearchDistributionChart
            photos={filteredLibraryPhotos}
            searchQuery={searchQuery}
            smartQuery={smartQuery}
            isProcessingSmartQuery={isProcessingSmartQuery}
            onSelectCategory={(cat) => {
              setSelectedCategories(prev => 
                prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
              );
            }}
            onSelectYear={(yr) => {
              setSelectedYears(prev => 
                prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr]
              );
            }}
            onClose={() => setShowDistributionChart(false)}
            selectedCategories={selectedCategories}
            selectedYears={selectedYears}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCategorySummary && (
          <CategorySummaryChart categoryStats={categoryStats} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMap && (
          <motion.div 
            key="photo-map-container"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <PhotoMap 
              photos={libraryPhotos} 
              onSelectLocation={handleSelectLocation}
              selectedLocations={selectedLocations}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Header Bar when photos are selected */}
      <BulkActionHeaderBar
        selectedPhotoIds={selectedPhotoIds}
        allPhotos={libraryPhotos}
        filteredPhotos={filteredLibraryPhotos}
        onClearSelection={() => {
          setSelectedPhotoIds([]);
        }}
        onSelectAllFiltered={() => {
          setIsMultiSelectMode(true);
          setSelectedPhotoIds(filteredLibraryPhotos.filter(p => p.id).map(p => p.id!));
        }}
        addNotification={addNotification}
      />

      {filteredLibraryPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:flex sm:flex-row flex-wrap gap-2 w-full">
          <Tooltip
            title={language === 'ko' ? '필터 기준 파일 물리적 정리' : 'Organize Files'}
            content={language === 'ko' ? '현재 필터링된 사진들을 카테고리, 연도, 카메라별 하위 폴더로 자동 이동/복사합니다.' : 'Physically organize files into structured subfolders by category, date, or camera.'}
          >
            <button 
              onClick={() => setModal({
                type: 'organize',
                title: language === 'ko' ? '필터 및 카테고리별 파일 정리' : 'Organize Files by Filter',
                message: language === 'ko'
                  ? '선택한 사진들을 분류 기준에 맞는 하위 폴더로 자동 구성하여 정리합니다. 원하시는 폴더 구조를 선택하세요:'
                  : 'This will physically move or copy the files into categorized subfolders. Choose how you want to structure them:',
                options: ['Category', 'Year', 'Camera', 'Format'],
                onConfirm: (option: string, mode: 'copy' | 'move') => {
                  if (option) handleOrganize(filteredLibraryPhotos, option, mode);
                }
              })} 
              className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-indigo-500/50 shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Layers size={14} />
              <span className="truncate">{t('organizeFiles')}</span>
            </button>
          </Tooltip>

          <Tooltip
            title={language === 'ko' ? '다중 선택 모드' : 'Multi-Select Mode'}
            content={language === 'ko' ? '여러 사진을 한 번에 선택하여 일괄 이름 변경 또는 삭제를 실행합니다.' : 'Toggle multi-selection to batch rename or manage selected photos.'}
          >
            <button 
              onClick={() => {
                if (isMultiSelectMode) setSelectedPhotoIds([]);
                setIsMultiSelectMode(!isMultiSelectMode);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${isMultiSelectMode ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            >
              {isMultiSelectMode ? <CheckCircle2 size={14} /> : <Zap size={14} />}
              <span>{isMultiSelectMode ? t('cancel') : t('select')}</span>
            </button>
          </Tooltip>

          {/* Select by Category Popover */}
          <div className="relative" ref={categorySelectMenuRef}>
            <Tooltip
              title={language === 'ko' ? '카테고리별 사진 선택' : 'Select by Category'}
              content={language === 'ko' ? 'AI가 감지한 카테고리(자연, 인물, 음식 등)에 속한 모든 사진을 한 번에 하이라이트 선택합니다.' : 'Instantly highlight and select all photos in a specific AI-detected category like Nature or People.'}
            >
              <button 
                type="button"
                onClick={() => setShowCategorySelectMenu(!showCategorySelectMenu)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer shadow-md ${
                  showCategorySelectMenu
                    ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/30 ring-1 ring-purple-400'
                    : 'bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-blue-600/20 hover:from-purple-600/35 hover:via-indigo-600/35 hover:to-blue-600/35 border-purple-500/40 text-purple-300 hover:text-white'
                }`}
              >
                <Sparkles size={13} className="text-purple-400" />
                <span className="truncate">{language === 'ko' ? '카테고리별 선택' : 'Select by Category'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showCategorySelectMenu ? 'rotate-180 text-white' : 'text-purple-400'}`} />
              </button>
            </Tooltip>

            {/* Dropdown Popover */}
            <AnimatePresence>
              {showCategorySelectMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl z-[600] space-y-3 ring-1 ring-purple-500/20 max-h-[80vh] overflow-y-auto no-scrollbar"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-purple-400" />
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          {language === 'ko' ? 'AI 카테고리별 사진 선택' : 'Select Photos by Category'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {language === 'ko' ? '클릭 시 해당 카테고리 사진이 즉시 하이라이트됩니다.' : 'Click any category to highlight all its matching photos.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCategorySelectMenu(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Fast One-Click Shortcuts for Key Categories (e.g. Nature, People) */}
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      ⚡ {language === 'ko' ? '빠른 추천 선택:' : 'Quick Shortcuts:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Nature', 'People', 'Food', 'Travel'].map(shortcut => {
                        const item = aiCategoryItems.find(c => c.name.toLowerCase() === shortcut.toLowerCase());
                        const count = item ? item.count : 0;
                        const isAll = item ? item.isAllSelected : false;
                        return (
                          <button
                            type="button"
                            key={shortcut}
                            onClick={() => {
                              handleSelectByCategory(shortcut, isAll ? 'remove' : 'replace');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                              isAll
                                ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            <span>{getCategoryIcon(shortcut)}</span>
                            <span>{getLocalizedCategory(shortcut, t)}</span>
                            <span className="text-[9px] opacity-70 font-mono">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Complete Category List with detailed actions */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {aiCategoryItems.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        {language === 'ko' ? '감지된 카테고리가 없습니다.' : 'No detected categories available.'}
                      </div>
                    ) : (
                      aiCategoryItems.map((cat) => {
                        return (
                          <div
                            key={cat.name}
                            className={`group flex items-center justify-between p-2 rounded-xl border transition-all ${
                              cat.isAllSelected
                                ? 'bg-purple-950/40 border-purple-500/50 text-white ring-1 ring-purple-500/30'
                                : cat.isPartiallySelected
                                  ? 'bg-amber-950/30 border-amber-500/40 text-slate-200'
                                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
                            }`}
                          >
                            {/* Main clickable area to replace selection */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectByCategory(cat.name, cat.isAllSelected ? 'remove' : 'replace');
                              }}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <span className="text-base shrink-0">{cat.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">
                                    {cat.localizedName}
                                  </span>
                                  {cat.name !== cat.localizedName && (
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      ({cat.name})
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  {cat.count} {language === 'ko' ? '장' : 'photos'} · {(cat.size / 1024 / 1024).toFixed(1)} MB
                                </div>
                              </div>
                            </button>

                            {/* Status badge & Quick secondary actions */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {cat.isAllSelected ? (
                                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Check size={10} className="stroke-[3]" />
                                  {language === 'ko' ? '선택됨' : 'Selected'}
                                </span>
                              ) : cat.isPartiallySelected ? (
                                <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                  {cat.selectedCount}/{cat.count}
                                </span>
                              ) : null}

                              {/* Plus button to append to selection */}
                              <Tooltip
                                title={language === 'ko' ? '선택에 추가' : 'Add to Selection'}
                                content={language === 'ko' ? '현재 선택을 유지하고 이 카테고리의 사진들을 추가합니다.' : 'Append photos from this category to active selection.'}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectByCategory(cat.name, 'add');
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600 text-slate-400 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Add"
                                >
                                  +
                                </button>
                              </Tooltip>

                              {/* Minus button to remove from selection */}
                              {cat.selectedCount > 0 && (
                                <Tooltip
                                  title={language === 'ko' ? '선택에서 제외' : 'Remove from Selection'}
                                  content={language === 'ko' ? '현재 선택에서 이 카테고리의 사진들을 제외합니다.' : 'Remove photos from this category from active selection.'}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectByCategory(cat.name, 'remove');
                                    }}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Deselect"
                                  >
                                    -
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === 'ko' ? '총 선택:' : 'Selected:'} <strong className="text-white">{selectedPhotoIds.length}</strong> {language === 'ko' ? '장' : 'items'}
                    </span>
                    {selectedPhotoIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhotoIds([]);
                          addNotification(
                            language === 'ko' ? '선택 초기화' : 'Selection Cleared',
                            language === 'ko' ? '모든 사진 선택을 해제했습니다.' : 'Cleared all selected photos.',
                            'info'
                          );
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw size={10} />
                        <span>{language === 'ko' ? '선택 전체 해제' : 'Clear Selection'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isMultiSelectMode && selectedPhotoIds.length > 0 && handleBatchRename && (
            <Tooltip
              title={language === 'ko' ? '일괄 이름 변경' : 'Batch Rename'}
              content={language === 'ko' ? '선택한 모든 사진의 파일명을 날짜, 장소, 일련번호 규칙에 맞춰 일괄 변경합니다.' : 'Batch rename selected files with patterned placeholders.'}
            >
              <button 
                onClick={() => setShowBatchRenameModal(true)}
                className="px-3 sm:px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-pink-500/50 shadow-lg shadow-pink-500/20 cursor-pointer"
              >
                <Edit2 size={14} />
                <span className="truncate">Batch Rename ({selectedPhotoIds.length})</span>
              </button>
            </Tooltip>
          )}

          {isMultiSelectMode && selectedPhotoIds.length > 0 && (
            <button 
              onClick={() => setSelectedPhotoIds([])}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
            >
              {t('clear')} ({selectedPhotoIds.length})
            </button>
          )}
        </div>
      )}
      {/* Advanced Explorer View Grid/List/Group Render Section */}
      {viewGroupBy !== 'none' && groupedPhotosMap ? (
        <div className="space-y-6">
          {Object.entries(groupedPhotosMap as Record<string, PhotoRecord[]>).map(([groupTitle, photosInGroup]) => {
            const isCollapsed = collapsedGroups[groupTitle];
            return (
              <div 
                key={groupTitle} 
                className="space-y-3 bg-white/[0.01] p-3.5 rounded-2xl border border-white/5"
              >
                <button
                  onClick={() => toggleGroupCollapse(groupTitle)}
                  className="flex items-center gap-2 group cursor-pointer text-left w-full focus:outline-hidden"
                >
                  <span className={`text-[9px] text-slate-500 group-hover:text-white transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                    ▶
                  </span>
                  <span className="text-[10px] font-black text-indigo-400 tracking-wider uppercase bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {groupTitle} ({photosInGroup.length})
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </button>

                {!isCollapsed && (
                  <div className="pt-1.5">
                    {renderPhotosListOrGrid(photosInGroup, groupTitle)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        renderPhotosListOrGrid(sortedPhotos)
      )}

      {/* Scroll load trigger sentinel */}
      {filteredLibraryPhotos.length > visibleCount && (
        <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center text-slate-500 font-mono text-xs opacity-60">
          ─── {language === 'ko' ? '추가 파일 목록 로딩 중...' : 'Loading additional assets...'} ───
        </div>
      )}

      {/* Explorer Mode View Settings Modal Dialog */}
      <AnimatePresence>
        {showViewMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="text-indigo-400" size={18} />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {language === 'ko' ? '탐색기 보기 설정' : 'Explorer View Settings'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowViewMenu(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Layout Modes */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {language === 'ko' ? '보기 방식' : 'View Mode'}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'extra-large', label_ko: '아주 크게', label_en: 'Extra Large' },
                    { key: 'large', label_ko: '크게', label_en: 'Large' },
                    { key: 'medium', label_ko: '보통', label_en: 'Medium' },
                    { key: 'small', label_ko: '작게', label_en: 'Small' },
                    { key: 'list', label_ko: '목록', label_en: 'List' },
                    { key: 'details', label_ko: '자세히', label_en: 'Details' },
                  ].map(option => {
                    const isSelected = viewLayout === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => setViewLayout(option.key as any)}
                        className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-md'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {option.key === 'list' ? (
                          <List size={14} />
                        ) : option.key === 'details' ? (
                          <LayoutGrid size={14} />
                        ) : (
                          <Grid size={14} className={option.key === 'extra-large' ? 'scale-125 text-indigo-400' : option.key === 'small' ? 'scale-90 text-slate-500' : ''} />
                        )}
                        <span>{language === 'ko' ? option.label_ko : option.label_en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sorting options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === 'ko' ? '정렬 기준' : 'Sort By'}
                  </span>
                  <select
                    value={viewSortBy}
                    onChange={(e) => setViewSortBy(e.target.value as any)}
                    className="w-full bg-slate-950/60 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-hidden ring-1 ring-white/10 cursor-pointer"
                  >
                    <option value="dateTaken" className="bg-slate-900 text-white">{language === 'ko' ? '촬영 날짜' : 'Date Taken'}</option>
                    <option value="size" className="bg-slate-900 text-white">{language === 'ko' ? '파일 크기' : 'File Size'}</option>
                    <option value="name" className="bg-slate-900 text-white">{language === 'ko' ? '파일명' : 'File Name'}</option>
                    <option value="category" className="bg-slate-900 text-white">{language === 'ko' ? '카테고리' : 'Category'}</option>
                    <option value="qualityScore" className="bg-slate-900 text-white">{language === 'ko' ? '품질 점수' : 'Quality Score'}</option>
                    <option value="aiScore" className="bg-slate-900 text-white">{language === 'ko' ? 'AI 미적 점수' : 'AI Score'}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === 'ko' ? '정렬 방향' : 'Sort Order'}
                  </span>
                  <div className="flex rounded-xl bg-slate-950/60 p-1 border border-white/10 gap-1 select-none">
                    <button
                      onClick={() => setViewSortOrder('asc')}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black text-center cursor-pointer transition-all ${
                        viewSortOrder === 'asc' ? 'bg-indigo-600/90 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'ko' ? '오름차순' : 'Ascending'}
                    </button>
                    <button
                      onClick={() => setViewSortOrder('desc')}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black text-center cursor-pointer transition-all ${
                        viewSortOrder === 'desc' ? 'bg-indigo-600/90 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'ko' ? '내림차순' : 'Descending'}
                    </button>
                  </div>
                </div>
              </div>

              {/* FastView Dual-Mode Engine Configuration */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={12} className="text-amber-400" />
                    {language === 'ko' ? 'FastView 초고속 표시 엔진 모드' : 'FastView Engine Profile'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    L1: {fastViewProfile.maxCacheSize}개 / {fastViewProfile.concurrencyLimit}쓰레드
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'pc', label_ko: '⚡ PC (고성능)', label_en: '⚡ PC High-Perf', desc_ko: '8쓰레드 / L1 800개 / Hover Zoom', desc_en: '8 threads / 800 L1 / Hover Zoom' },
                    { key: 'mobile', label_ko: '📱 모바일 (저전력)', label_en: '📱 Mobile Low-Power', desc_ko: '2쓰레드 / L1 160개 / Swipe & Haptics', desc_en: '2 threads / 160 L1 / Swipe' },
                    { key: 'auto', label_ko: '🔄 자동 감지', label_en: '🔄 Auto Detect', desc_ko: '기기 특성 자동 식별', desc_en: 'Auto identify device' },
                  ].map(p => {
                    const isSelected = fastViewProfile.userPreference === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => fastViewEngine.setMode(p.key as any)}
                        className={`p-2 rounded-xl border text-[9px] font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/30'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={language === 'ko' ? p.desc_ko : p.desc_en}
                      >
                        <span>{language === 'ko' ? p.label_ko : p.label_en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grouping options */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {language === 'ko' ? '분류 방법 (Group By)' : 'Group By'}
                </span>
                <div className="grid grid-cols-5 gap-1 shadow-sm">
                  {[
                    { key: 'none', ko: '없음', en: 'None' },
                    { key: 'category', ko: '카테고리', en: 'Category' },
                    { key: 'type', ko: '확장자', en: 'Format' },
                    { key: 'year', ko: '연도', en: 'Year' },
                    { key: 'size', ko: '크기', en: 'Size' },
                  ].map(option => {
                    const isSelected = viewGroupBy === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => setViewGroupBy(option.key as any)}
                        className={`py-2 px-1 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-md'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={option.en}
                      >
                        {language === 'ko' ? option.ko : option.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Close Action Button */}
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowViewMenu(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                >
                  {language === 'ko' ? '설정 완료' : 'Done'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Rename Modal */}
      <AnimatePresence>
        {showBatchRenameModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-[#1e293b]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
            >
              <div className="h-9 bg-white/5 border-b border-white/5 flex items-center px-4 justify-between bg-slate-900/50">
                <div className="flex gap-1.5 grayscale opacity-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{language === 'ko' ? '일괄 이름 변경' : 'Batch Rename'}</span>
                <div className="w-12" />
              </div>

              <div className="p-6 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-400">
                    <Edit2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{language === 'ko' ? '일괄 이름 변경' : 'Batch Rename Files'}</h3>
                    <div className="text-[10px] text-slate-500 font-mono">FILES: {selectedPhotoIds.length}</div>
                  </div>
                </div>

                <p className="text-slate-400 text-xs mb-6 leading-relaxed font-medium">
                  {language === 'ko' ? '새로운 파일 이름의 패턴을 지정하세요. [Date], [Location], [Sequence] 변수를 사용할 수 있습니다.' : 'Enter a naming pattern. Use [Date], [Location], and [Sequence] variables.'}
                </p>

                <input 
                  type="text"
                  value={renamePattern}
                  onChange={(e) => setRenamePattern(e.target.value)}
                  placeholder="[Date]-[Location]-[Sequence]"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-sm font-mono focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all mb-6"
                />

                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBatchRenameModal(false)}
                    className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      if (handleBatchRename && renamePattern) {
                        handleBatchRename(libraryPhotos.filter(p => selectedPhotoIds.includes(p.id!)), renamePattern);
                        setSelectedPhotoIds([]);
                        setIsMultiSelectMode(false);
                      }
                      setShowBatchRenameModal(false);
                    }}
                    className="flex-1 py-3 bg-pink-600 text-white rounded-xl text-xs font-black shadow-lg shadow-pink-600/20 hover:bg-pink-500 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    {t('apply')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
