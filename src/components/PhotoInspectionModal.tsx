import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Copy,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  Camera,
  Calendar,
  HardDrive,
  Eye,
  Check,
  CheckCircle2,
  SplitSquareVertical,
  Columns,
  Layers,
  FileText,
  Video,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  Tag,
  HelpCircle,
  Sun,
  Contrast,
  Sparkle
} from "lucide-react";
import { PhotoRecord } from "../services/db";
import { SystemAPI } from "../services/systemApi";
import { libraryManager } from "../services/PhotoLibraryManager";
import { fastViewEngine } from "../services/fastViewEngine";
import { blobRegistry } from "../utils/blobRegistry";
import { Tooltip, InfoTooltip } from "./Tooltip";

export interface PhotoInspectionModalProps {
  photos: PhotoRecord[];
  initialIndex?: number;
  bestPhotoId?: number;
  toKeepIds: number[];
  onToggleKeep: (id: number) => void;
  onKeepOnlyThis: (id: number) => void;
  onClose: () => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  language: string;
  onAnimatePhoto?: (photo: PhotoRecord) => void;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getFileName(filePath?: string): string {
  if (!filePath) return "Asset";
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.split("/").pop() || filePath;
}

export const PhotoInspectionModal: React.FC<PhotoInspectionModalProps> = ({
  photos,
  initialIndex = 0,
  bestPhotoId,
  toKeepIds,
  onToggleKeep,
  onKeepOnlyThis,
  onClose,
  addNotification,
  language,
  onAnimatePhoto,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, photos.length - 1)),
  );
  const [compareIndex, setCompareIndex] = useState<number | null>(
    photos.length > 1 ? (currentIndex === 0 ? 1 : 0) : null,
  );
  const [viewMode, setViewMode] = useState<"focus" | "split" | "overlay">("focus");
  const [showMetadata, setShowMetadata] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [filterMode, setFilterMode] = useState<'normal' | 'sharpen' | 'contrast' | 'monochrome' | 'invert'>('normal');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sliderPos, setSliderPos] = useState(50); // For curtain/overlay comparison (0 to 100%)
  const [isCopied, setIsCopied] = useState(false);
  const [currentImageError, setCurrentImageError] = useState(false);
  const [compareImageError, setCompareImageError] = useState(false);

  const currentPhoto = photos[currentIndex];
  const comparePhoto = compareIndex !== null ? photos[compareIndex] : null;

  // Reset zoom, pan, and rotation when current photo changes
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCurrentImageError(false);
  }, [currentIndex]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === " " || e.key === "Enter") {
        if (currentPhoto?.id) {
          onToggleKeep(currentPhoto.id);
        }
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((z) => Math.min(8, z + 0.5));
      } else if (e.key === "-" || e.key === "_") {
        setZoomLevel((z) => {
          const next = Math.max(0.5, z - 0.5);
          if (next <= 1) setPanPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === "0") {
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
      } else if (e.key.toLowerCase() === "r") {
        setRotation((r) => (r + 90) % 360);
      } else if (e.key.toLowerCase() === "f") {
        const modes: Array<'normal' | 'sharpen' | 'contrast' | 'monochrome' | 'invert'> = ['normal', 'sharpen', 'contrast', 'monochrome', 'invert'];
        setFilterMode((prev) => {
          const idx = modes.indexOf(prev);
          return modes[(idx + 1) % modes.length];
        });
      } else if (e.key.toLowerCase() === "h") {
        setShowShortcuts((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, currentPhoto, onToggleKeep, onClose]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomLevel((prev) => {
      const next = Math.max(0.5, Math.min(8, prev + delta));
      if (next <= 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getFilterCss = useCallback(() => {
    switch (filterMode) {
      case 'sharpen':
        return 'contrast(130%) brightness(105%) saturate(120%)';
      case 'contrast':
        return 'contrast(160%) saturate(140%)';
      case 'monochrome':
        return 'grayscale(100%) contrast(140%)';
      case 'invert':
        return 'invert(100%) hue-rotate(180deg)';
      default:
        return 'none';
    }
  }, [filterMode]);

  const getTransformCss = useCallback(() => {
    const scaleX = flipH ? -1 : 1;
    const scaleY = flipV ? -1 : 1;
    return `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
  }, [panPosition, zoomLevel, rotation, flipH, flipV]);

  const [asyncCurrentUrl, setAsyncCurrentUrl] = useState<string>("");
  const [asyncCompareUrl, setAsyncCompareUrl] = useState<string>("");

  // Reset zoom and error states on photo change
  useEffect(() => {
    setZoomLevel(1);
    setCurrentImageError(false);
  }, [currentIndex]);

  useEffect(() => {
    setCompareImageError(false);
  }, [compareIndex]);

  const checkIsVideo = (photo?: PhotoRecord | null): boolean => {
    if (!photo) return false;
    return Boolean(
      photo.type?.startsWith("video/") ||
      photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/)
    );
  };

  const getMediaUrl = (photo?: PhotoRecord | null): string => {
    if (!photo) return "";
    if (photo.blob && photo.blob.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () =>
        URL.createObjectURL(photo.blob!),
      );
    }
    if (photo.thumbnail && photo.thumbnail.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () =>
        URL.createObjectURL(photo.thumbnail!),
      );
    }
    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) return instant;

    const sysUrl = SystemAPI.getImageUrl(photo.path, "full");
    if (sysUrl) return sysUrl;

    return SystemAPI.getImageUrl(photo.path, "thumbnail") || "";
  };

  // Asynchronous image acquisition guarantee via FastView multi-tiered pipeline
  useEffect(() => {
    if (!currentPhoto) {
      setAsyncCurrentUrl("");
      return;
    }
    let active = true;
    const syncUrl = getMediaUrl(currentPhoto);
    if (syncUrl) {
      setAsyncCurrentUrl(syncUrl);
    }

    fastViewEngine.getFastThumbnail(currentPhoto)
      .then((res) => {
        if (active && res.url) {
          setAsyncCurrentUrl(res.url);
          setCurrentImageError(false);
        }
      })
      .catch(() => {
        // Fallback already assigned via syncUrl
      });

    return () => {
      active = false;
    };
  }, [currentPhoto]);

  useEffect(() => {
    if (!comparePhoto) {
      setAsyncCompareUrl("");
      return;
    }
    let active = true;
    const syncUrl = getMediaUrl(comparePhoto);
    if (syncUrl) setAsyncCompareUrl(syncUrl);

    fastViewEngine.getFastThumbnail(comparePhoto)
      .then((res) => {
        if (active && res.url) {
          setAsyncCompareUrl(res.url);
          setCompareImageError(false);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [comparePhoto]);

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setIsCopied(true);
    addNotification(
      language === "ko" ? "경로 복사 완료" : "Path Copied",
      path,
      "info",
    );
    setTimeout(() => setIsCopied(false), 2000);
  };

  const currentIsKept = currentPhoto?.id ? toKeepIds.includes(currentPhoto.id) : false;
  const currentIsBest = currentPhoto?.id === bestPhotoId;

  const currentDisplayUrl = asyncCurrentUrl || getMediaUrl(currentPhoto);
  const compareDisplayUrl = asyncCompareUrl || getMediaUrl(comparePhoto);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col select-none overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="h-14 bg-slate-950/80 border-b border-white/10 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {language === "ko" ? "정밀 사진 분석 뷰어" : "Forensic Photo Inspector"}
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Quick mode switches */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <Tooltip
              title={language === "ko" ? "단일 집중 뷰어" : "Focus Mode"}
              content={language === "ko" ? "단일 사진을 화면 가득 채워 최대 400% 줌인 및 디테일을 검사합니다." : "Inspect single photo in high resolution with up to 400% zoom."}
            >
              <button
                onClick={() => setViewMode("focus")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "focus"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Maximize2 size={13} />
                <span>{language === "ko" ? "단일 집중" : "Focus"}</span>
              </button>
            </Tooltip>
            {photos.length > 1 && (
              <>
                <Tooltip
                  title={language === "ko" ? "양옆 나란히 비교" : "Side-by-Side Comparison"}
                  content={language === "ko" ? "두 사진을 좌우에 나란히 배치하여 크기, 해상도, 날짜를 동시 비교합니다." : "Place two photos side-by-side to compare pixel clarity and EXIF data."}
                >
                  <button
                    onClick={() => setViewMode("split")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === "split"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Columns size={13} />
                    <span>{language === "ko" ? "양옆 나란히 비교" : "Side-by-Side"}</span>
                  </button>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "슬라이더 커튼 비교" : "Curtain Slider Overlay"}
                  content={language === "ko" ? "두 사진을 겹쳐 놓고 실시간 슬라이더를 드래그하여 미세한 차이를 대조합니다." : "Drag curtain divider across overlaid photos to check subtle differences."}
                >
                  <button
                    onClick={() => setViewMode("overlay")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === "overlay"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <SplitSquareVertical size={13} />
                    <span>{language === "ko" ? "슬라이더 커튼 비교" : "Curtain Slider"}</span>
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10 text-xs">
            <Tooltip content={language === "ko" ? "축소 (-)" : "Zoom Out (-)"}>
              <button
                onClick={() =>
                  setZoomLevel((z) => {
                    const next = Math.max(0.5, z - 0.25);
                    if (next <= 1) setPanPosition({ x: 0, y: 0 });
                    return next;
                  })
                }
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>
            </Tooltip>
            <span className="font-mono text-[11px] text-slate-300 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Tooltip content={language === "ko" ? "확대 (+)" : "Zoom In (+)"}>
              <button
                onClick={() => setZoomLevel((z) => Math.min(8, z + 0.25))}
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
            </Tooltip>

            {/* Quick Zoom Presets */}
            <button
              onClick={() => {
                setZoomLevel(zoomLevel === 2 ? 1 : 2);
                if (zoomLevel === 2) setPanPosition({ x: 0, y: 0 });
              }}
              className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-indigo-300 rounded ml-1 cursor-pointer"
              title="Toggle 2x Zoom"
            >
              2x
            </button>
            <button
              onClick={() => {
                setZoomLevel(zoomLevel === 4 ? 1 : 4);
                if (zoomLevel === 4) setPanPosition({ x: 0, y: 0 });
              }}
              className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-indigo-300 rounded cursor-pointer"
              title="Toggle 4x Zoom"
            >
              4x
            </button>

            <Tooltip content={language === "ko" ? "원본 배율 및 위치 리셋 (0)" : "Reset View (0)"}>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                  setRotation(0);
                  setFlipH(false);
                  setFlipV(false);
                }}
                className="p-1 hover:text-white text-slate-400 cursor-pointer border-l border-white/10 ml-1 pl-1.5"
              >
                <RotateCcw size={12} />
              </button>
            </Tooltip>
          </div>

          {/* Rotate & Flip Controls */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <Tooltip title={language === "ko" ? "시계방향 90° 회전 (R)" : "Rotate 90° Clockwise (R)"}>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw size={14} />
              </button>
            </Tooltip>
            <Tooltip title={language === "ko" ? "좌우 반전" : "Flip Horizontal"}>
              <button
                onClick={() => setFlipH((f) => !f)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  flipH ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-slate-300 hover:text-white"
                }`}
              >
                <FlipHorizontal size={14} />
              </button>
            </Tooltip>
          </div>

          {/* Filter Modes Toggle */}
          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1 uppercase flex items-center gap-1">
              <SlidersHorizontal size={12} className="text-amber-400" />
              <span>{language === "ko" ? "필터" : "Filter"}:</span>
            </span>
            {[
              { id: "normal", labelKo: "원본", labelEn: "Normal" },
              { id: "sharpen", labelKo: "선명도", labelEn: "Sharpen" },
              { id: "contrast", labelKo: "대비", labelEn: "Contrast" },
              { id: "monochrome", labelKo: "흑백", labelEn: "B&W" },
              { id: "invert", labelKo: "반전", labelEn: "Invert" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  filterMode === f.id
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {language === "ko" ? f.labelKo : f.labelEn}
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts Help Button */}
          <Tooltip title={language === "ko" ? "단축키 안내 (H)" : "Keyboard Shortcuts (H)"}>
            <button
              onClick={() => setShowShortcuts((s) => !s)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showShortcuts
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <HelpCircle size={16} />
            </button>
          </Tooltip>

          <Tooltip
            title={language === "ko" ? "메타데이터 정보창" : "Metadata Panel"}
            content={language === "ko" ? "사진의 해상도, 촬영일, 카메라 모델, pHash 지문 등 포렌식 정보를 확인합니다." : "Toggle right sidebar showing forensic EXIF metadata."}
          >
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showMetadata
                  ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Info size={16} />
            </button>
          </Tooltip>

          <Tooltip
            title={language === "ko" ? "닫기" : "Close Viewer"}
            content="단축키: ESC"
          >
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main Body Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Arrows */}
        <button
          onClick={() =>
            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
          }
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-2xl"
          title="Previous (Left Arrow)"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={() =>
            setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
          }
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-2xl"
          style={{ right: showMetadata ? "380px" : "16px" }}
          title="Next (Right Arrow)"
        >
          <ChevronRight size={24} />
        </button>

        {/* Photo Display Canvas Area */}
        <div
          className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Shortcuts Overlay Popup */}
          <AnimatePresence>
            {showShortcuts && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-4 right-4 z-[400] w-80 bg-slate-900/95 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10 font-bold text-white">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <HelpCircle size={14} />
                    {language === "ko" ? "단축키 안내" : "Keyboard Shortcuts"}
                  </span>
                  <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>
                <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                  <div className="flex justify-between"><span>← / → Arrow</span><span className="text-indigo-400 font-bold">이전 / 다음 사진</span></div>
                  <div className="flex justify-between"><span>Wheel / (+ / -)</span><span className="text-indigo-400 font-bold">휠 확대 / 축소</span></div>
                  <div className="flex justify-between"><span>Drag (Zoomed)</span><span className="text-indigo-400 font-bold">드래그 이동</span></div>
                  <div className="flex justify-between"><span>Space / Enter</span><span className="text-indigo-400 font-bold">보존 / 삭제 토글</span></div>
                  <div className="flex justify-between"><span>R</span><span className="text-indigo-400 font-bold">90° 회전</span></div>
                  <div className="flex justify-between"><span>F</span><span className="text-indigo-400 font-bold">필터 모드 순환</span></div>
                  <div className="flex justify-between"><span>0</span><span className="text-indigo-400 font-bold">뷰 리셋 (100%)</span></div>
                  <div className="flex justify-between"><span>ESC</span><span className="text-indigo-400 font-bold">뷰어 닫기</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {viewMode === "focus" && currentPhoto && (
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden">
              {checkIsVideo(currentPhoto) ? (
                <video
                  src={currentDisplayUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
                  style={{
                    transform: getTransformCss(),
                    filter: getFilterCss(),
                    transition: isDragging ? "none" : "transform 0.15s ease-out"
                  }}
                />
              ) : currentImageError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/90 rounded-2xl border border-white/10 max-w-md shadow-2xl">
                  <AlertCircle size={44} className="text-amber-400 mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">
                    {language === "ko" ? "미리보기를 표시할 수 없습니다" : "Preview Unavailable"}
                  </h4>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    {language === "ko"
                      ? "브라우저 샌드박스 보안 제약이거나 특수 포맷입니다. 메타데이터와 용량 정보는 우측 패널에서 확인하실 수 있습니다."
                      : "Sandbox restriction or unsupported format. Metadata & size can be inspected on the right panel."}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentImageError(false);
                        const renewed = SystemAPI.getImageUrl(currentPhoto.path, "full", true);
                        if (renewed) setAsyncCurrentUrl(renewed);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {language === "ko" ? "다시 시도" : "Retry"}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentImageError(false);
                        fastViewEngine.getFastThumbnail(currentPhoto).then(res => {
                          if (res.url) setAsyncCurrentUrl(res.url);
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      {language === "ko" ? "고속 썸네일로 보기" : "Fast Thumbnail"}
                    </button>
                  </div>
                </div>
              ) : (
                <img
                  src={currentDisplayUrl || ""}
                  alt={getFileName(currentPhoto.path)}
                  className="max-h-[82vh] max-w-full object-contain shadow-2xl rounded-lg"
                  style={{
                    transform: getTransformCss(),
                    filter: getFilterCss(),
                    transition: isDragging ? "none" : "transform 0.15s ease-out",
                    cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default"
                  }}
                  onDoubleClick={() => {
                    if (zoomLevel === 1) {
                      setZoomLevel(2.5);
                    } else {
                      setZoomLevel(1);
                      setPanPosition({ x: 0, y: 0 });
                    }
                  }}
                  onError={() => {
                    fastViewEngine.getFastThumbnail(currentPhoto)
                      .then((res) => {
                        if (res.url && res.url !== asyncCurrentUrl) {
                          setAsyncCurrentUrl(res.url);
                        } else {
                          setCurrentImageError(true);
                        }
                      })
                      .catch(() => setCurrentImageError(true));
                  }}
                />
              )}
              {currentIsBest && (
                <div className="absolute top-4 left-4 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 border border-emerald-300">
                  <Sparkles size={14} /> {language === "ko" ? "추천 최고 화질 원본" : "AI BEST SHOT"}
                </div>
              )}
            </div>
          )}

          {viewMode === "split" && currentPhoto && comparePhoto && (
            <div className="grid grid-cols-2 gap-4 w-full h-full max-h-[82vh]">
              {/* Left Photo (Target) */}
              <div className="flex flex-col items-center justify-center bg-black/40 rounded-2xl p-2 border border-white/10 relative overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-lg border border-white/10">
                  {language === "ko" ? "현재 선택 파일" : "Current Photo"} ({currentIndex + 1})
                </div>
                {checkIsVideo(currentPhoto) ? (
                  <video
                    src={currentDisplayUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-[75vh] max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={currentDisplayUrl || ""}
                    alt=""
                    className="max-h-[75vh] max-w-full object-contain rounded-lg"
                    style={{ transform: `scale(${zoomLevel})` }}
                    onError={() => {
                      fastViewEngine.getFastThumbnail(currentPhoto)
                        .then((res) => {
                          if (res.url) setAsyncCurrentUrl(res.url);
                          else setCurrentImageError(true);
                        })
                        .catch(() => setCurrentImageError(true));
                    }}
                  />
                )}
                <div className="absolute bottom-3 inset-x-3 bg-black/70 backdrop-blur-md p-2 rounded-xl text-center text-xs text-slate-300 font-mono">
                  {currentPhoto.width}x{currentPhoto.height} • {formatBytes(currentPhoto.size)} • {formatDate(currentPhoto.dateTaken || currentPhoto.lastModified)}
                </div>
              </div>

              {/* Right Photo (Compare) */}
              <div className="flex flex-col items-center justify-center bg-black/40 rounded-2xl p-2 border border-white/10 relative overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                  <span>{language === "ko" ? "비교 대상" : "Compare Photo"}:</span>
                  <select
                    value={compareIndex !== null ? compareIndex : 0}
                    onChange={(e) => setCompareIndex(Number(e.target.value))}
                    className="bg-slate-800 text-white border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono cursor-pointer"
                  >
                    {photos.map((p, idx) => (
                      <option key={idx} value={idx}>
                        #{idx + 1} - {getFileName(p.path)}
                      </option>
                    ))}
                  </select>
                </div>
                {checkIsVideo(comparePhoto) ? (
                  <video
                    src={compareDisplayUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-[75vh] max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={compareDisplayUrl || ""}
                    alt=""
                    className="max-h-[75vh] max-w-full object-contain rounded-lg"
                    style={{ transform: `scale(${zoomLevel})` }}
                    onError={() => {
                      fastViewEngine.getFastThumbnail(comparePhoto)
                        .then((res) => {
                          if (res.url) setAsyncCompareUrl(res.url);
                          else setCompareImageError(true);
                        })
                        .catch(() => setCompareImageError(true));
                    }}
                  />
                )}
                <div className="absolute bottom-3 inset-x-3 bg-black/70 backdrop-blur-md p-2 rounded-xl text-center text-xs text-slate-300 font-mono">
                  {comparePhoto.width}x{comparePhoto.height} • {formatBytes(comparePhoto.size)} • {formatDate(comparePhoto.dateTaken || comparePhoto.lastModified)}
                </div>
              </div>
            </div>
          )}

          {viewMode === "overlay" && currentPhoto && comparePhoto && (
            <div className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                {/* Background Image (Compare) */}
                {checkIsVideo(comparePhoto) ? (
                  <video
                    src={compareDisplayUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-[78vh] max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={compareDisplayUrl || ""}
                    alt=""
                    className="max-h-[78vh] max-w-full object-contain rounded-lg"
                  />
                )}

                {/* Foreground Image with clip-path (Current) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  {checkIsVideo(currentPhoto) ? (
                    <video
                      src={currentDisplayUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-h-[78vh] max-w-full object-contain rounded-lg mx-auto"
                    />
                  ) : (
                    <img
                      src={currentDisplayUrl || ""}
                      alt=""
                      className="max-h-[78vh] max-w-full object-contain rounded-lg mx-auto"
                    />
                  )}
                </div>

                {/* Vertical Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] cursor-ew-resize z-20 flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <SplitSquareVertical size={14} />
                  </div>
                </div>

                {/* Slider Input range overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-x-0 bottom-4 w-64 mx-auto z-30 opacity-75 hover:opacity-100 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Forensic Metadata Inspector Sidebar */}
        {showMetadata && currentPhoto && (
          <div className="w-[360px] bg-slate-900/95 border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto shrink-0 z-20 backdrop-blur-xl">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    {language === "ko" ? "미디어 상세 정보" : "METADATA PROFILE"}
                  </span>
                  {currentIsBest && (
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                      BEST SHOT
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white break-all mt-1 font-mono">
                  {getFileName(currentPhoto.path)}
                </h4>
              </div>

              {/* Status Action Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  currentIsKept
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentIsKept ? (
                    <ShieldCheck size={20} className="text-emerald-400" />
                  ) : (
                    <Trash2 size={20} className="text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-black uppercase">
                      {currentIsKept
                        ? language === "ko"
                          ? "보존 대상 (유지)"
                          : "PRESERVE COPY"
                        : language === "ko"
                          ? "정리 대상 (삭제)"
                          : "PURGE REDUNDANT"}
                    </div>
                    <div className="text-[10px] opacity-75">
                      {currentIsKept
                        ? language === "ko"
                          ? "작업 시 디스크에 남겨집니다."
                          : "Will be kept on disk."
                        : language === "ko"
                          ? "작업 시 정리/삭제됩니다."
                          : "Redundant copy to purge."}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => currentPhoto.id && onToggleKeep(currentPhoto.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentIsKept
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-rose-600 text-white hover:bg-rose-500"
                  }`}
                >
                  {currentIsKept
                    ? language === "ko"
                      ? "상태 변경"
                      : "Change"
                    : language === "ko"
                      ? "보존으로 변경"
                      : "Keep this"}
                </button>
              </div>

              {/* Forensic Metric Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1 font-bold">
                    <HardDrive size={11} className="text-indigo-400" />
                    {language === "ko" ? "파일 용량" : "File Size"}
                  </div>
                  <div className="font-mono font-bold text-white text-sm">
                    {formatBytes(currentPhoto.size)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1 font-bold">
                    <Eye size={11} className="text-cyan-400" />
                    {language === "ko" ? "해상도 (화소)" : "Resolution"}
                  </div>
                  <div className="font-mono font-bold text-white text-sm flex items-center justify-between">
                    <span>
                      {currentPhoto.width && currentPhoto.height
                        ? `${currentPhoto.width} × ${currentPhoto.height}`
                        : "-"}
                    </span>
                    {currentPhoto.width && currentPhoto.height && (
                      <span className="text-[10px] text-indigo-300 font-normal">
                        {((currentPhoto.width * currentPhoto.height) / 1000000).toFixed(1)}MP
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Aesthetic Score */}
                {(currentPhoto.aestheticScore !== undefined || currentPhoto.aiScore !== undefined) && (
                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <div className="text-[10px] text-amber-400 flex items-center gap-1 mb-1 font-bold">
                      <Sparkles size={11} className="text-amber-400" />
                      {language === "ko" ? "AI 미적 점수" : "Aesthetic Score"}
                    </div>
                    <div className="font-mono font-black text-amber-300 text-sm">
                      {(currentPhoto.aestheticScore || currentPhoto.aiScore || 0).toFixed(1)} / 10.0
                    </div>
                  </div>
                )}

                {/* Blur / Sharpness Score */}
                {currentPhoto.blurScore !== undefined && (
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mb-1 font-bold">
                      <Eye size={11} className="text-emerald-400" />
                      {language === "ko" ? "선명도 (선명도 점수)" : "Blur/Sharpness"}
                    </div>
                    <div className="font-mono font-black text-emerald-300 text-sm">
                      {currentPhoto.blurScore.toFixed(0)} Score
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1 font-bold">
                    <Calendar size={11} className="text-amber-400" />
                    {language === "ko" ? "촬영 일시" : "Date Taken"}
                  </div>
                  <div className="font-mono text-[11px] text-white">
                    {formatDate(currentPhoto.dateTaken || currentPhoto.lastModified)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1 font-bold">
                    <Camera size={11} className="text-purple-400" />
                    {language === "ko" ? "카메라 / 장치" : "Camera / Model"}
                  </div>
                  <div className="font-mono text-[11px] text-white truncate" title={currentPhoto.cameraModel || "Standard"}>
                    {currentPhoto.cameraModel || "Standard"}
                  </div>
                </div>
              </div>

              {/* Advanced EXIF Parameters */}
              {(currentPhoto.iso || currentPhoto.fNumber || currentPhoto.exposureTime) && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Camera size={11} className="text-indigo-400" />
                    <span>{language === "ko" ? "EXIF 노출 정보" : "EXIF Exposure Parameters"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5">
                    <div>ISO: <span className="font-bold text-amber-300">{currentPhoto.iso || "-"}</span></div>
                    <div>f/: <span className="font-bold text-amber-300">{currentPhoto.fNumber ? `f/${currentPhoto.fNumber}` : "-"}</span></div>
                    <div>Exp: <span className="font-bold text-amber-300">{currentPhoto.exposureTime ? `${currentPhoto.exposureTime}s` : "-"}</span></div>
                  </div>
                </div>
              )}

              {/* Location & GPS Info */}
              {(currentPhoto.locationName || (currentPhoto.latitude && currentPhoto.longitude)) && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1 text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <MapPin size={11} className="text-rose-400" />
                    <span>{language === "ko" ? "위치 및 GPS" : "Location & GPS"}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5 space-y-0.5">
                    {currentPhoto.locationName && <div className="font-bold text-rose-300 truncate">{currentPhoto.locationName}</div>}
                    {currentPhoto.latitude && currentPhoto.longitude && (
                      <div className="text-[10px] text-slate-400">
                        GPS: {currentPhoto.latitude.toFixed(5)}, {currentPhoto.longitude.toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags & ML Concepts */}
              {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Tag size={11} className="text-cyan-400" />
                    <span>{language === "ko" ? "AI 자동 태그" : "AI Detected Tags"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentPhoto.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-md text-[10px] font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full File Path with Copy Button */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>{language === "ko" ? "전체 파일 경로" : "Full File Path"}</span>
                  <button
                    onClick={() => handleCopyPath(currentPhoto.path)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{isCopied ? (language === "ko" ? "복사됨" : "Copied") : (language === "ko" ? "복사" : "Copy")}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-300 break-all bg-black/40 p-2 rounded-lg border border-white/5">
                  {currentPhoto.path}
                </div>
              </div>

              {/* Perceptual Hash Details */}
              {currentPhoto.pHash && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1 text-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    {language === "ko" ? "지각 해시 지문 (pHash)" : "Perceptual Hash"}
                  </div>
                  <div className="font-mono text-[10px] text-indigo-300 break-all bg-black/40 p-2 rounded-lg">
                    {currentPhoto.pHash}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions inside Inspector */}
            <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
              {onAnimatePhoto && currentPhoto && !checkIsVideo(currentPhoto) && currentPhoto.type !== "application/pdf" && (
                <button
                  type="button"
                  onClick={() => onAnimatePhoto(currentPhoto)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-violet-600/30"
                >
                  <Video size={14} className="text-violet-200" />
                  <span>{language === "ko" ? "AI 모션 영상 생성 (5초 비디오)" : "Generate AI Motion Video (5s)"}</span>
                </button>
              )}

              <button
                onClick={() => currentPhoto.id && onKeepOnlyThis(currentPhoto.id)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <CheckCircle2 size={14} />
                <span>{language === "ko" ? "이 사진만 단독 보존 (Keep Only This)" : "Keep Only This Asset"}</span>
              </button>

              <button
                onClick={() => SystemAPI.openInDefaultApp(currentPhoto, addNotification)}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
              >
                <ExternalLink size={13} />
                <span>{language === "ko" ? "Windows 기본 앱으로 열기" : "Open in Default App"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Filmstrip Thumbnail Carousel Bar */}
      <div className="h-24 bg-slate-950/90 border-t border-white/10 px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar z-20 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          {language === "ko" ? "중복 그룹 썸네일:" : "Group Assets:"}
        </span>
        {photos.map((p, idx) => (
          <FilmstripItem
            key={`filmstrip-${p.id || idx}`}
            photo={p}
            isSelected={idx === currentIndex}
            isKept={p.id ? toKeepIds.includes(p.id) : false}
            isBest={p.id === bestPhotoId}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </motion.div>
  );
};

const FilmstripItem: React.FC<{
  photo: PhotoRecord;
  isSelected: boolean;
  isKept: boolean;
  isBest: boolean;
  onClick: () => void;
}> = ({ photo, isSelected, isKept, isBest, onClick }) => {
  const [thumbSrc, setThumbSrc] = useState<string | null>(() => {
    return fastViewEngine.getInstantThumbnail(photo.path) || null;
  });

  const isPdf = photo.type === "application/pdf" || photo.path?.toLowerCase().endsWith(".pdf");
  const isVideo = photo.type?.startsWith("video/") || photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);

  useEffect(() => {
    if (isPdf || isVideo) return;
    let active = true;

    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const url = blobRegistry.create(photo.thumbnail);
      setThumbSrc(url);
      return () => { blobRegistry.revoke(url); };
    }

    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) {
      setThumbSrc(instant);
      return;
    }

    fastViewEngine.getFastThumbnail(photo)
      .then((res) => {
        if (active && res.url) setThumbSrc(res.url);
      })
      .catch(() => {
        if (active) {
          const sys = SystemAPI.getImageUrl(photo.path, "thumbnail");
          setThumbSrc(sys);
        }
      });

    return () => { active = false; };
  }, [photo.path, photo.thumbnail, photo.blob, isPdf, isVideo]);

  return (
    <div
      onClick={onClick}
      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/50 scale-105"
          : isKept
            ? "border-emerald-500/60 opacity-80 hover:opacity-100"
            : "border-white/10 opacity-50 hover:opacity-100"
      }`}
      style={{ backgroundColor: fastViewEngine.getInstantDominantColor(photo.path) }}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : isPdf ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <FileText size={20} className="text-red-400" />
        </div>
      ) : isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <Video size={20} className="text-sky-400" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon size={18} className="text-slate-500/60" />
        </div>
      )}
      {isBest && (
        <div
          className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-black shadow"
          title="Best shot"
        />
      )}
      <div
        className={`absolute bottom-0 inset-x-0 text-[8px] font-mono text-center text-white py-0.5 ${
          isKept ? "bg-emerald-600/90" : "bg-rose-900/90"
        }`}
      >
        {isKept ? "KEEP" : "PURGE"}
      </div>
    </div>
  );
};
