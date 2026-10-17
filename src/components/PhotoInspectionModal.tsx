import React, { useState, useEffect } from "react";
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
  Sparkles,
  Sliders,
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
  const [sliderPos, setSliderPos] = useState(50); // For curtain/overlay comparison (0 to 100%)
  const [isCopied, setIsCopied] = useState(false);
  const [currentImageError, setCurrentImageError] = useState(false);
  const [compareImageError, setCompareImageError] = useState(false);

  const currentPhoto = photos[currentIndex];
  const comparePhoto = compareIndex !== null ? photos[compareIndex] : null;

  // Key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, currentPhoto, onToggleKeep, onClose]);

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
            <Tooltip content={language === "ko" ? "축소" : "Zoom Out"}>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>
            </Tooltip>
            <span className="font-mono text-[11px] text-slate-300 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Tooltip content={language === "ko" ? "확대" : "Zoom In"}>
              <button
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
            </Tooltip>
            <Tooltip content={language === "ko" ? "100% 원본 배율로 리셋" : "Reset Zoom (100%)"}>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 hover:text-white text-slate-400 cursor-pointer border-l border-white/10 ml-1 pl-1.5"
              >
                <RotateCcw size={12} />
              </button>
            </Tooltip>
          </div>

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
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
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
                        // Force renewal of transient URL
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
                  className="max-h-[82vh] max-w-full object-contain transition-transform duration-200 shadow-2xl rounded-lg"
                  style={{ transform: `scale(${zoomLevel})` }}
                  onError={() => {
                    // Try fast thumbnail fallback first
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
                    {language === "ko" ? "해상도 (픽셀)" : "Resolution"}
                  </div>
                  <div className="font-mono font-bold text-white text-sm">
                    {currentPhoto.width && currentPhoto.height
                      ? `${currentPhoto.width} × ${currentPhoto.height}`
                      : "-"}
                  </div>
                </div>

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
