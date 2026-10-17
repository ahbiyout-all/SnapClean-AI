import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Video,
  Zap,
  Layers,
  Image as ImageIcon,
  Trash2,
  ChevronUp,
  Sparkles,
  FileText,
  Folder,
  Copy,
  Check,
  Calendar,
  Clock,
  HardDrive,
  ExternalLink,
  CheckCircle2,
  List,
  LayoutGrid,
  Camera,
  Star,
  Table as TableIcon,
  Maximize2,
} from "lucide-react";
import { PhotoRecord, db } from "../services/db";
import { DedupeEngine, DedupeGroup } from "../services/dedupeEngine";
import { useI18n } from "../i18n/context";
import { PhotoCard } from "./PhotoCard";
import { SystemAPI } from "../services/systemApi";
import { libraryManager, DedupeRule } from "../services/PhotoLibraryManager";
import { MotionCreatorModal } from "./MotionCreatorModal";
import { blobRegistry } from "../utils/blobRegistry";
import { DuplicateExplorerTable } from "./DuplicateExplorerTable";
import { PhotoInspectionModal } from "./PhotoInspectionModal";
import { fastViewEngine } from "../services/fastViewEngine";
import { Tooltip, InfoTooltip } from "./Tooltip";

export type DuplicateViewMode = "details" | "list" | "grid";

interface DuplicateGroupProps {
  key?: string;
  group: DedupeGroup;
  rule?: DedupeRule;
  onResolve: (g: DedupeGroup, deleteIds?: number[]) => void;
  selectedPhotoId?: number | null;
  onSelect?: (id: number | null) => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  viewMode?: DuplicateViewMode;
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

function getFolderPath(filePath?: string): string {
  if (!filePath) return "/";
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) return "/";
  return normalized.substring(0, lastSlash + 1);
}

function getFileName(filePath?: string): string {
  if (!filePath) return "Asset";
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.split("/").pop() || filePath;
}

function getFileExtension(filePath?: string): string {
  if (!filePath) return "";
  const name = getFileName(filePath);
  const dot = name.lastIndexOf(".");
  return dot !== -1 ? name.substring(dot + 1).toUpperCase() : "";
}

const GroupHeaderMiniThumb: React.FC<{
  photo: PhotoRecord;
  title: string;
  isBest: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = ({ photo, title, isBest, onClick }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    return fastViewEngine.getInstantThumbnail(photo.path) || null;
  });
  const [hasError, setHasError] = useState(false);

  const isPdf =
    photo.type === "application/pdf" ||
    photo.path?.toLowerCase().endsWith(".pdf");
  const isVideo =
    photo.type?.startsWith("video/") ||
    photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);

  useEffect(() => {
    if (isPdf || isVideo) return;
    let active = true;

    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const url = blobRegistry.create(photo.thumbnail);
      setImgSrc(url);
      return () => {
        blobRegistry.revoke(url);
      };
    }

    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) {
      setImgSrc(instant);
      return;
    }

    fastViewEngine.getFastThumbnail(photo)
      .then((res) => {
        if (active && res.url) setImgSrc(res.url);
      })
      .catch(() => {
        if (active) {
          const sys = SystemAPI.getImageUrl(photo.path, "thumbnail");
          setImgSrc(sys);
        }
      });

    return () => {
      active = false;
    };
  }, [photo.path, photo.thumbnail, photo.blob, isPdf, isVideo]);

  return (
    <div
      onClick={onClick}
      title={title}
      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 border-2 border-slate-900 overflow-hidden shadow-2xl relative transition-transform hover:z-50 hover:scale-110 flex items-center justify-center shrink-0 cursor-pointer"
      style={{ backgroundColor: fastViewEngine.getInstantDominantColor(photo.path) }}
    >
      {imgSrc && !hasError ? (
        <img
          src={imgSrc}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          alt=""
          onError={() => setHasError(true)}
        />
      ) : isPdf ? (
        <FileText size={14} className="text-red-400" />
      ) : isVideo ? (
        <Video size={14} className="text-sky-400" />
      ) : (
        <ImageIcon size={14} className="text-slate-500/60" />
      )}

      {isBest && (
        <div
          className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 z-20"
          title="AI Best Shot"
        />
      )}
    </div>
  );
};

export const EventImage = ({ photoId }: { photoId?: number }) => {
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (photoId) {
      db.photos.get(photoId).then((res) => {
        if (isMounted) setPhoto(res || null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [photoId]);

  useEffect(() => {
    if (!photo) return;
    setHasError(false);
    let active = true;

    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const objectUrl = blobRegistry.create(photo.thumbnail);
      setImgSrc(objectUrl);
      return () => {
        blobRegistry.revoke(objectUrl);
      };
    }

    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) {
      setImgSrc(instant);
      return;
    }

    fastViewEngine.getFastThumbnail(photo)
      .then((res) => {
        if (active && res.url) {
          setImgSrc(res.url);
        }
      })
      .catch(() => {
        if (active) {
          const sysUrl = SystemAPI.getImageUrl(photo.path, "thumbnail");
          setImgSrc(sysUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [photo]);

  const isPdf = photo
    ? photo.type === "application/pdf" ||
      photo.path?.toLowerCase().endsWith(".pdf")
    : false;
  const isVideo = photo
    ? photo.type?.startsWith("video/") ||
      photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/)
    : false;

  if (!photo)
    return <div className="w-full h-full bg-slate-900 animate-pulse" />;

  if (isPdf) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <FileText size={24} className="text-red-500/80" />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <Video size={24} className="text-sky-400" />
      </div>
    );
  }

  return (
    imgSrc && !hasError ? (
      <img
        src={imgSrc}
        alt=""
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    ) : (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <ImageIcon size={24} className="text-slate-700" />
      </div>
    )
  );
};

interface DuplicateListRowProps {
  photo: PhotoRecord;
  isBest: boolean;
  isKept: boolean;
  onToggleKeep: () => void;
  onKeepOnlyThis: () => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  language: string;
  isMultiFolder: boolean;
  folderIndex: number;
  bestSize: number;
  isAllSameSize: boolean;
  onInspect?: () => void;
}

const DuplicateListRow: React.FC<DuplicateListRowProps> = ({
  photo,
  isBest,
  isKept,
  onToggleKeep,
  onKeepOnlyThis,
  addNotification,
  language,
  isMultiFolder,
  folderIndex,
  bestSize,
  isAllSameSize,
  onInspect,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const isPdf =
    photo.type === "application/pdf" ||
    photo.path?.toLowerCase().endsWith(".pdf");
  const isVideo =
    photo.type?.startsWith("video/") ||
    photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
  const ext = getFileExtension(photo.path);
  const fileName = getFileName(photo.path);
  const folderPath = getFolderPath(photo.path);

  const [asyncThumb, setAsyncThumb] = useState<string | null>(() => {
    return fastViewEngine.getInstantThumbnail(photo.path) || null;
  });

  useEffect(() => {
    if (isPdf || isVideo) return;
    let active = true;

    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const url = blobRegistry.create(photo.thumbnail);
      setAsyncThumb(url);
      return () => {
        blobRegistry.revoke(url);
      };
    }

    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) {
      setAsyncThumb(instant);
      return;
    }

    fastViewEngine.getFastThumbnail(photo)
      .then((res) => {
        if (active && res.url) setAsyncThumb(res.url);
      })
      .catch(() => {
        if (active) {
          const sys = SystemAPI.getImageUrl(photo.path, "thumbnail");
          setAsyncThumb(sys);
        }
      });

    return () => {
      active = false;
    };
  }, [photo.path, photo.thumbnail, photo.blob, isPdf, isVideo]);

  const thumbUrl = useMemo(() => {
    if (isPdf || isVideo) return null;
    if (asyncThumb) return asyncThumb;
    const instant = fastViewEngine.getInstantThumbnail(photo.path);
    if (instant) return instant;
    if (photo.thumbnail && photo.thumbnail.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () =>
        URL.createObjectURL(photo.thumbnail!),
      );
    }
    if (photo.blob && photo.blob.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () =>
        URL.createObjectURL(photo.blob!),
      );
    }
    return SystemAPI.getImageUrl(photo.path, "thumbnail");
  }, [photo, isPdf, isVideo, asyncThumb]);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(photo.path);
    setCopied(true);
    addNotification(
      language === "ko" ? "경로 복사 완료" : "Path Copied",
      photo.path,
      "info",
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWithApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    SystemAPI.openInDefaultApp(photo, addNotification);
  };

  // Folder badge colors for visual comparison
  const folderColorClasses = [
    "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    "bg-amber-500/10 text-amber-300 border-amber-500/20",
    "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  ];
  const currentFolderColor =
    folderColorClasses[folderIndex % folderColorClasses.length];

  const sizeDiff = photo.size - bestSize;

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        onInspect();
      }}
      className={`group/row relative flex flex-col xl:flex-row xl:items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 gap-4 ${
        isKept
          ? "bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30 ring-1 ring-emerald-500/30"
          : "bg-rose-950/15 border-rose-500/25 hover:bg-rose-950/25 opacity-85 hover:opacity-100"
      }`}
    >
      {/* Left: Checkbox + Thumbnail + Best Badge */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        {/* Toggle checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleKeep();
          }}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
            isKept
              ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/30"
              : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
          }`}
          title={isKept ? "유지 해제 (삭제 대상)" : "유지 대상으로 선택"}
        >
          {isKept && <Check size={14} className="stroke-[3]" />}
        </button>

        {/* Thumbnail with overlay preview */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer shadow-lg group-hover/row:border-white/30"
          title={
            language === "ko"
              ? "클릭하여 사진 정밀 미리보기 / 비교"
              : "Click to preview / inspect photo in full viewer"
          }
        >
          {thumbUrl && !imgLoadError ? (
            <img
              src={thumbUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform group-hover/row:scale-105"
              onError={() => setImgLoadError(true)}
            />
          ) : isPdf ? (
            <FileText size={24} className="text-red-400" />
          ) : isVideo ? (
            <Video size={24} className="text-sky-400" />
          ) : (
            <ImageIcon size={24} className="text-slate-600" />
          )}

          {/* Extension badge */}
          {ext && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-[8px] font-black text-slate-300 rounded-sm uppercase tracking-wider backdrop-blur-xs">
              {ext}
            </span>
          )}

          {/* AI Best badge */}
          {isBest && (
            <div
              className="absolute top-1 left-1 bg-amber-500 text-black px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-md"
              title={
                language === "ko"
                  ? "AI 추천 최적 원본 (품질/해상도/규격 기준)"
                  : "AI Recommended Best Shot"
              }
            >
              <Star size={8} className="fill-black" />
              <span>{language === "ko" ? "추천" : "BEST"}</span>
            </div>
          )}

          {/* Hover zoom overlay indicator */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Maximize2 size={16} />
          </div>
        </div>

        {/* File Name & Path info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              className="font-bold text-sm sm:text-base text-white hover:text-indigo-300 transition-colors cursor-pointer truncate max-w-xs sm:max-w-md"
              title={fileName}
            >
              {fileName}
            </span>
            {isBest && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center gap-1">
                <Sparkles size={10} className="text-emerald-400" />
                {language === "ko" ? "추천 원본" : "Original Best"}
              </span>
            )}
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                isKept
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}
            >
              {isKept
                ? language === "ko"
                  ? "보존 (KEEP)"
                  : "KEEP"
                : language === "ko"
                  ? "삭제 (PURGE)"
                  : "DELETE"}
            </span>
          </div>

          {/* Folder & Full Path */}
          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono truncate max-w-full ${currentFolderColor}`}
              title={photo.path}
            >
              <Folder size={12} className="shrink-0" />
              <span className="truncate">{folderPath}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyPath}
              className="p-1 text-slate-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title={language === "ko" ? "전체 경로 복사" : "Copy full path"}
            >
              {copied ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center/Right: Comparison Columns (Size, Date, Dimensions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 xl:gap-6 bg-black/30 p-3 rounded-xl border border-white/5 text-xs shrink-0 items-center">
        {/* Column 1: Size (용량) */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <HardDrive size={11} className="text-indigo-400" />
            <span>{language === "ko" ? "용량" : "File Size"}</span>
          </div>
          <div className="font-mono font-bold text-white text-xs sm:text-sm mt-0.5 flex items-baseline gap-1.5">
            <span>{formatBytes(photo.size)}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({photo.size.toLocaleString()} B)
            </span>
          </div>
          <div className="text-[10px] mt-0.5">
            {isAllSameSize ? (
              <span className="text-slate-400">
                {language === "ko" ? "동일 용량" : "Identical"}
              </span>
            ) : sizeDiff === 0 ? (
              <span className="text-emerald-400 font-bold">
                {language === "ko" ? "기준 용량" : "Base Size"}
              </span>
            ) : sizeDiff > 0 ? (
              <span className="text-amber-400 font-bold">
                +{formatBytes(sizeDiff)} ({language === "ko" ? "더 큼" : "larger"})
              </span>
            ) : (
              <span className="text-slate-400">
                -{formatBytes(Math.abs(sizeDiff))} ({language === "ko" ? "더 작음" : "smaller"})
              </span>
            )}
          </div>
        </div>

        {/* Column 2: Date Taken & Modified (날짜/시간) */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <Calendar size={11} className="text-amber-400" />
            <span>{language === "ko" ? "촬영/수정일자" : "Date / Time"}</span>
          </div>
          <div className="font-mono text-white text-[11px] sm:text-xs mt-0.5 flex items-center gap-1 truncate">
            <span title={formatDate(photo.dateTaken || photo.lastModified)}>
              {formatDate(photo.dateTaken || photo.lastModified)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Clock size={10} />
            <span>
              {photo.dateTaken
                ? language === "ko"
                  ? "EXIF 촬영일"
                  : "EXIF Date"
                : language === "ko"
                  ? "파일 수정일"
                  : "Modified"}
            </span>
          </div>
        </div>

        {/* Column 3: Dimensions & Specs (해상도/기종) */}
        <div className="flex flex-col col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <Camera size={11} className="text-cyan-400" />
            <span>{language === "ko" ? "해상도 / 스펙" : "Dimensions / Specs"}</span>
          </div>
          <div className="font-mono font-bold text-white text-[11px] sm:text-xs mt-0.5">
            {photo.width && photo.height ? (
              <span>
                {photo.width} × {photo.height}{" "}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({((photo.width * photo.height) / 1000000).toFixed(1)} MP)
                </span>
              </span>
            ) : photo.durationMs ? (
              <span>
                {Math.round(photo.durationMs / 1000)}s Video ({ext})
              </span>
            ) : (
              <span className="text-slate-400">{ext || "Media"}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={photo.cameraModel || "Standard"}>
            {photo.cameraModel || "Standard File"}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 justify-end shrink-0 border-t xl:border-t-0 border-white/5 pt-2 xl:pt-0">
        {onInspect && (
          <Tooltip
            title={language === "ko" ? "정밀 사진 분석" : "Inspect Photo"}
            content={
              language === "ko"
                ? "전체화면에서 줌인/비교/EXIF 정보를 분석합니다."
                : "Open forensic photo inspector for zoom and EXIF details."
            }
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-500/30"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">
                {language === "ko" ? "정밀 보기" : "Inspect"}
              </span>
            </button>
          </Tooltip>
        )}

        <Tooltip
          title={language === "ko" ? "기본 뷰어로 열기" : "Open in Default App"}
          content={
            language === "ko"
              ? "Windows 사진 뷰어 또는 기본 연결 프로그램으로 원본을 엽니다."
              : "Launch in default Windows Photo Viewer or media app."
          }
        >
          <button
            type="button"
            onClick={handleOpenWithApp}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">
              {language === "ko" ? "열기" : "Open"}
            </span>
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "이 파일만 보존" : "Keep Only This"}
          content={
            language === "ko"
              ? "이 사진만 디스크에 보존하고, 그룹의 다른 모든 사진을 정리(삭제) 대상으로 지정합니다."
              : "Keep this single asset and mark all other duplicate copies for deletion."
          }
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onKeepOnlyThis();
            }}
            className="px-3 py-2 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={13} />
            <span>{language === "ko" ? "이 파일만 유지" : "Keep Only"}</span>
          </button>
        </Tooltip>

        <Tooltip
          title={isKept ? (language === "ko" ? "보존 상태" : "Marked to Keep") : (language === "ko" ? "삭제 상태" : "Marked to Purge")}
          content={
            isKept
              ? (language === "ko" ? "클릭 시 삭제 대상(DELETE)으로 전환합니다." : "Click to mark this file for deletion.")
              : (language === "ko" ? "클릭 시 보존 대상(KEEP)으로 전환합니다." : "Click to keep this file on disk.")
          }
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleKeep();
            }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isKept
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                : "bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white"
            }`}
          >
            {isKept ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>{language === "ko" ? "보존 중" : "KEEP"}</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>{language === "ko" ? "삭제 대상" : "DELETE"}</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export const DuplicateGroup = ({
  group,
  rule = "sharpest",
  onResolve,
  selectedPhotoId,
  onSelect,
  addNotification,
  viewMode = "details",
}: DuplicateGroupProps) => {
  const { t, language } = useI18n();
  const [openMotionCreator, setOpenMotionCreator] = useState(false);
  const [inspectingPhotoIndex, setInspectingPhotoIndex] = useState<number | null>(null);
  const uniqueGroupId = React.useId();
  const [isExpanded, setIsExpanded] = useState(true);
  const [localViewMode, setLocalViewMode] = useState<DuplicateViewMode>(viewMode);

  useEffect(() => {
    setLocalViewMode(viewMode);
  }, [viewMode]);

  const bestPhoto = useMemo(
    () => DedupeEngine.getBestPhoto(group.photos, rule),
    [group.photos, rule],
  );
  const [toKeepIds, setToKeepIds] = useState<number[]>([]);

  useEffect(() => {
    // Auto-select the best photo to keep
    if (bestPhoto.id) {
      setToKeepIds([bestPhoto.id]);
    }
  }, [group, bestPhoto]);

  const handleToggleKeep = (id: number) => {
    setToKeepIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleKeepOnly = (id: number) => {
    setToKeepIds([id]);
    addNotification(
      language === "ko" ? "유지 파일 설정" : "Selection Updated",
      language === "ko"
        ? "선택한 파일만 유지 대상으로 지정되었습니다."
        : "Only this file will be kept.",
      "info",
    );
  };

  const toDeleteIds = useMemo(() => {
    return group.photos
      .filter((p) => p.id && !toKeepIds.includes(p.id))
      .map((p) => p.id!);
  }, [toKeepIds, group.photos]);

  const deleteSize = useMemo(() => {
    return group.photos
      .filter((p) => p.id && toDeleteIds.includes(p.id))
      .reduce((acc, p) => acc + p.size, 0);
  }, [toDeleteIds, group.photos]);

  const isVideoGroup = useMemo(
    () => group.photos.some((p) => p.type?.startsWith("video/")),
    [group.photos],
  );

  // Calculate comparison insights for the duplicate group
  const groupComparison = useMemo(() => {
    const folders = Array.from(
      new Set(group.photos.map((p) => getFolderPath(p.path))),
    );
    const sizes = group.photos.map((p) => p.size);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const isAllSameSize = minSize === maxSize;

    const dates = group.photos.map((p) => p.dateTaken || p.lastModified);
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const isAllSameDate = minDate === maxDate;

    const resolutions = group.photos.map(
      (p) => `${p.width || 0}x${p.height || 0}`,
    );
    const isAllSameResolution = new Set(resolutions).size === 1;

    return {
      folders,
      isMultiFolder: folders.length > 1,
      isAllSameSize,
      minSize,
      maxSize,
      isAllSameDate,
      isAllSameResolution,
    };
  }, [group.photos]);

  const groupInfo = useMemo(() => {
    const reasons = group.reasons || [];
    if (reasons.includes("exact") || group.subType === "exact_byte")
      return {
        label: t("exactMatch"),
        icon: <ShieldCheck size={24} />,
        color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        sub: language === "ko" ? "100% 바이트/해시 일치 원본 및 복사본" : t("verifiedHash"),
      };
    if (group.subType === "resized" || reasons.includes("resized_variant"))
      return {
        label: language === "ko" ? "리사이즈 / 포맷 변환 복사본" : "Resized / Converted Copy",
        icon: <ImageIcon size={24} />,
        color: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        sub: language === "ko" ? "동일한 장면이지만 해상도나 파일 포맷이 다름" : "Identical scene with different resolution/format",
      };
    if (group.subType === "filename_copy" || reasons.includes("filename_copy_pattern"))
      return {
        label: language === "ko" ? "파일명 복사 패턴 (1)" : "Filename Copy Pattern",
        icon: <Copy size={24} />,
        color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
        sub: language === "ko" ? "복사본 명명 규칙 검출 (예: - 복사본, (1))" : "Detected copy naming pattern",
      };
    if (reasons.includes("video") || group.photos.some((p) => p.type?.startsWith("video/")))
      return {
        label: t("videoDuplicate"),
        icon: <Video size={24} />,
        color: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
        sub: t("videoAnalysis"),
      };
    if (reasons.includes("burst") || group.subType === "burst")
      return {
        label: language === "ko" ? "연사 및 연속 촬영 샷" : t("burstShot"),
        icon: <Zap size={24} />,
        color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        sub: language === "ko" ? "연속 셔터로 촬영된 동일 구도 연사 시퀀스" : t("burstClustering"),
      };
    return {
      label: language === "ko" ? `시각적 유사 사진 (${group.similarityPercent || 88}%)` : t("similarMatch"),
      icon: <Layers size={24} />,
      color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      sub: t("detectedPhash"),
    };
  }, [group, t, language]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass rounded-[2rem] border-white/5 group relative overflow-hidden transition-all duration-300 cv-group gpu-accelerated ${
        isExpanded
          ? "p-4 sm:p-7 ring-2 ring-blue-500/30 bg-blue-500/5"
          : "p-4 sm:p-6 hover:bg-white/5 cursor-pointer shadow-xl"
      }`}
      onClick={() => {
        if (!isExpanded) setIsExpanded(true);
      }}
    >
      {isExpanded && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles size={200} />
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center relative z-10 gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div
            className={`p-2.5 sm:p-3.5 rounded-2xl shrink-0 ${groupInfo.color} shadow-2xl transition-transform group-hover:scale-105`}
          >
            {React.cloneElement(groupInfo.icon as React.ReactElement, {
              size: 20,
            })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-base sm:text-xl text-white uppercase italic tracking-tight truncate">
                {groupInfo.label}
              </h4>
              {isVideoGroup && (
                <span className="bg-sky-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1 shadow-lg italic shrink-0">
                  <Video size={10} /> {t("video")}
                </span>
              )}
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase italic shrink-0">
                {group.confidence !== undefined ? (group.confidence <= 1 ? Math.round(group.confidence * 100) : group.confidence) : 90}% {t("confidence")}
              </span>
              {groupComparison.isMultiFolder && (
                <span className="bg-amber-500/15 text-amber-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase italic shrink-0">
                  📁 {language === "ko" ? "폴더 간 중복" : "Cross-Folder"}
                </span>
              )}
              {group.matchDetails?.resolutionDifferent && (
                <span className="bg-purple-500/15 text-purple-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-purple-500/30 uppercase italic shrink-0">
                  📐 {language === "ko" ? "해상도 차이" : "Diff Res"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
              <span className="font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon size={12} className="text-slate-400" /> {group.photos.length} {t("assets")}
              </span>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <Trash2 size={12} />
                {(deleteSize / 1024 / 1024).toFixed(2)} MB {language === "ko" ? "정리 가능" : "WASTE"}
              </span>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-slate-400 font-mono text-[10px]">
                {groupInfo.sub}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto border-t border-white/5 lg:border-t-0 pt-3 lg:pt-0">
          {!isExpanded && (
            <div className="flex -space-x-3 group-hover:-space-x-1.5 transition-all mr-4 self-center scale-90 sm:scale-100 origin-left">
              {group.photos.slice(0, 4).map((p, pIdx) => (
                <GroupHeaderMiniThumb
                  key={`preview-${uniqueGroupId}-${p.id || p.originalId || "none"}-${pIdx}`}
                  photo={p}
                  isBest={p.id === bestPhoto.id}
                  title={language === "ko" ? `${getFileName(p.path)} 클릭하여 정밀 미리보기` : `Click to preview ${getFileName(p.path)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectingPhotoIndex(pIdx);
                  }}
                />
              ))}
            </div>
          )}

          {isExpanded ? (
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              {/* Group View Switcher (Details vs List vs Grid) */}
              <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10 shrink-0">
                <Tooltip
                  title={language === "ko" ? "자세히 보기" : "Details View"}
                  content={
                    language === "ko"
                      ? "파일 크기, 해상도, 촬영일, 폴더 경로 등을 테이블로 정밀 비교합니다."
                      : "Forensic table showing file size, dimensions, EXIF date, and folder path."
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalViewMode("details");
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      localViewMode === "details"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <TableIcon size={14} />
                    <span className="text-[10px] hidden sm:inline">
                      {language === "ko" ? "자세히" : "Details"}
                    </span>
                  </button>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "리스트 뷰" : "List View"}
                  content={
                    language === "ko"
                      ? "확대된 썸네일과 개별 보존/삭제 버튼이 포함된 카드 리스트입니다."
                      : "Horizontal cards with larger preview and quick action buttons."
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalViewMode("list");
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      localViewMode === "list"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <List size={14} />
                    <span className="text-[10px] hidden sm:inline">
                      {language === "ko" ? "리스트" : "List"}
                    </span>
                  </button>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "그리드 뷰" : "Grid View"}
                  content={
                    language === "ko"
                      ? "사진 썸네일을 격자 형태로 묶어 시각적 비교에 집중합니다."
                      : "Compact photo grid focused on visual comparison."
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalViewMode("grid");
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      localViewMode === "grid"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span className="text-[10px] hidden sm:inline">
                      {language === "ko" ? "그리드" : "Grid"}
                    </span>
                  </button>
                </Tooltip>
              </div>

              {group.photos.length >= 2 && (
                <Tooltip
                  title={language === "ko" ? "정밀 비교 뷰어" : "Forensic Compare Viewer"}
                  content={
                    language === "ko"
                      ? "전체화면에서 줌인, 좌우 분할 대조, 커튼 슬라이더 오버레이로 픽셀을 정밀 분석합니다."
                      : "Open fullscreen forensic viewer for zoom, side-by-side, and curtain slider comparison."
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingPhotoIndex(0);
                    }}
                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Maximize2 size={13} className="text-indigo-400" />
                    <span>
                      {language === "ko" ? "정밀 비교 뷰어" : "Compare Viewer"}
                    </span>
                  </button>
                </Tooltip>
              )}

              {group.photos.length >= 2 && (
                <Tooltip
                  title={language === "ko" ? "모션 영상 생성" : "Create Motion Clip"}
                  content={
                    language === "ko"
                      ? "그룹 내 연속된 사진들을 프레임으로 결합하여 움직이는 GIF / WebM 모션 영상을 생성합니다."
                      : "Combine burst/consecutive photos into an animated GIF or motion video."
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMotionCreator(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600 hover:to-indigo-600 border border-indigo-500/30 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles size={13} className="text-amber-400 animate-pulse" />
                    <span>
                      {language === "ko" ? "모션 영상 생성" : "Create Motion"}
                    </span>
                  </button>
                </Tooltip>
              )}

              <Tooltip
                title={language === "ko" ? "중복 정리 실행" : "Execute Duplicate Resolution"}
                content={
                  language === "ko"
                    ? `선택한 ${toKeepIds.length}개 파일만 보존하고 나머지 ${toDeleteIds.length}개 파일은 정리합니다.`
                    : `Preserve ${toKeepIds.length} selected files and purge ${toDeleteIds.length} redundant files.`
                }
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(group, toDeleteIds);
                  }}
                  disabled={toKeepIds.length === 0 && toDeleteIds.length === 0}
                  className={`px-4 sm:px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-2xl transition-all cursor-pointer flex items-center gap-2 italic flex-1 lg:flex-initial justify-center ${
                    toDeleteIds.length === 0
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/40"
                  }`}
                >
                  {toDeleteIds.length === 0 ? (
                    <>
                      <ShieldCheck size={14} /> {t("optimizeAll")}
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> {language === "ko" ? `보존 ${toKeepIds.length} • 삭제 ${toDeleteIds.length}` : `KEEP ${toKeepIds.length} • PURGE ${toDeleteIds.length}`}
                    </>
                  )}
                </button>
              </Tooltip>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors shadow-lg cursor-pointer"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          ) : (
            <div className="p-2 bg-white/5 group-hover:bg-blue-500 group-hover:text-white rounded-xl text-slate-500 transition-all shadow-lg">
              <ChevronUp className="rotate-180" size={16} />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6 border-t border-white/5 mt-6 relative z-10 space-y-4">
              {/* Group Comparison Overview Bar */}
              <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Layers size={13} />
                    {language === "ko" ? "비교 요약:" : "Comparison:"}
                  </span>

                  {/* Folder comparison badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border text-[11px] ${
                      groupComparison.isMultiFolder
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    <Folder size={12} />
                    {groupComparison.isMultiFolder
                      ? language === "ko"
                        ? `${groupComparison.folders.length}개 서로 다른 폴더에 분산됨`
                        : `Stored in ${groupComparison.folders.length} different folders`
                      : language === "ko"
                        ? "동일 폴더 내 중복 파일"
                        : "Same folder duplicates"}
                  </span>

                  {/* Size comparison badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border text-[11px] ${
                      groupComparison.isAllSameSize
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                    }`}
                  >
                    <HardDrive size={12} />
                    {groupComparison.isAllSameSize
                      ? language === "ko"
                        ? `모두 동일 용량 (${formatBytes(groupComparison.minSize)})`
                        : `100% Identical Size (${formatBytes(groupComparison.minSize)})`
                      : language === "ko"
                        ? `용량 차이 (${formatBytes(groupComparison.minSize)} ~ ${formatBytes(groupComparison.maxSize)})`
                        : `Size differs (${formatBytes(groupComparison.minSize)} ~ ${formatBytes(groupComparison.maxSize)})`}
                  </span>

                  {/* Date comparison badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border text-[11px] ${
                      groupComparison.isAllSameDate
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-slate-800 border-white/10 text-slate-300"
                    }`}
                  >
                    <Calendar size={12} />
                    {groupComparison.isAllSameDate
                      ? language === "ko"
                        ? "촬영/수정일자 일치"
                        : "Same Timestamp"
                      : language === "ko"
                        ? "일자/시간 차이 감지"
                        : "Different Timestamps"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  {language === "ko"
                    ? "💡 더블클릭 시 Windows 연결 프로그램으로 직접 열립니다."
                    : "💡 Double-click any item to open in default Windows app."}
                </div>
              </div>

              {/* View Content: Details (Explorer Table) vs List (Cards) vs Grid (Cards) */}
              {localViewMode === "details" ? (
                <DuplicateExplorerTable
                  photos={group.photos}
                  bestPhotoId={bestPhoto.id}
                  bestSize={bestPhoto.size || 0}
                  toKeepIds={toKeepIds}
                  onToggleKeep={handleToggleKeep}
                  onKeepOnlyThis={handleKeepOnly}
                  onSelectPhoto={(id) => onSelect?.(id)}
                  selectedPhotoId={selectedPhotoId}
                  addNotification={addNotification}
                  language={language}
                  foldersList={groupComparison.folders}
                  isMultiFolder={groupComparison.isMultiFolder}
                  onInspect={(p) => {
                    const idx = group.photos.findIndex((item) => item.id === p.id);
                    setInspectingPhotoIndex(idx >= 0 ? idx : 0);
                  }}
                />
              ) : localViewMode === "list" ? (
                <div className="space-y-3">
                  {group.photos.map((p, pIdx) => {
                    const isKept = toKeepIds.includes(p.id!);
                    const pFolder = getFolderPath(p.path);
                    const folderIndex = groupComparison.folders.indexOf(pFolder);

                    return (
                      <DuplicateListRow
                        key={`list-row-${uniqueGroupId}-${p.id || p.originalId || "none"}-${pIdx}`}
                        photo={p}
                        isBest={p.id === bestPhoto.id}
                        isKept={isKept}
                        onToggleKeep={() => handleToggleKeep(p.id!)}
                        onKeepOnlyThis={() => handleKeepOnly(p.id!)}
                        addNotification={addNotification}
                        language={language}
                        isMultiFolder={groupComparison.isMultiFolder}
                        folderIndex={folderIndex >= 0 ? folderIndex : 0}
                        bestSize={bestPhoto.size || 0}
                        isAllSameSize={groupComparison.isAllSameSize}
                        onInspect={() => setInspectingPhotoIndex(pIdx)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {group.photos.map((p, pIdx) => (
                    <PhotoCard
                      key={`detail-${uniqueGroupId}-${p.id || p.originalId || "none"}-${pIdx}`}
                      photo={p}
                      selected={selectedPhotoId === p.id}
                      selectionMode={
                        toKeepIds.includes(p.id!) ? "keep" : "delete"
                      }
                      onClick={() => {
                        handleToggleKeep(p.id!);
                        onSelect?.(p.id || null);
                      }}
                      onSwipe={(direction) => {
                        if (direction === "right" && !toKeepIds.includes(p.id!)) {
                          handleToggleKeep(p.id!);
                        } else if (
                          direction === "left" &&
                          toKeepIds.includes(p.id!)
                        ) {
                          handleToggleKeep(p.id!);
                        }
                        onSelect?.(p.id || null);
                      }}
                      isBest={p.id === bestPhoto.id}
                      similarity={
                        group.type === "similar"
                          ? DedupeEngine.calculateSimilarity(
                              p.pHash || "",
                              bestPhoto.pHash || "",
                            )
                          : undefined
                      }
                      addNotification={addNotification}
                      onDoubleClick={(p) => {
                        SystemAPI.openInDefaultApp(p, addNotification);
                      }}
                      onInspect={() => setInspectingPhotoIndex(pIdx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectingPhotoIndex !== null && (
          <PhotoInspectionModal
            photos={group.photos}
            initialIndex={inspectingPhotoIndex}
            bestPhotoId={bestPhoto.id}
            toKeepIds={toKeepIds}
            onToggleKeep={handleToggleKeep}
            onKeepOnlyThis={handleKeepOnly}
            onClose={() => setInspectingPhotoIndex(null)}
            addNotification={addNotification}
            language={language}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openMotionCreator && (
          <MotionCreatorModal
            photos={group.photos}
            onClose={() => setOpenMotionCreator(false)}
            addNotification={addNotification}
            language={language}
            onMerged={() => {
              window.dispatchEvent(new CustomEvent("photos-updated"));
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
