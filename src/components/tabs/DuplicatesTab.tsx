import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Hash,
  Layers,
  Trash2,
  FolderPlus,
  Activity,
  ShieldCheck,
  ShieldAlert,
  FolderTree,
  FolderSearch,
  Compass,
  ArrowRight,
  AlertCircle,
  Search,
  X,
  ChevronDown,
  List,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Check,
  RefreshCw,
  Zap,
  Sparkles,
  Filter,
  Eye,
  Cpu,
  Clock,
  Maximize2,
  Copy,
  CheckCircle2,
  SlidersVertical,
  Gauge,
  Image as ImageIcon,
  Columns,
  SplitSquareVertical,
  CheckSquare,
  Square,
  Sparkle,
} from "lucide-react";
import { DedupeGroup } from "../../services/dedupeEngine";
import { useI18n } from "../../i18n/context";
import { DuplicateGroup, DuplicateViewMode } from "../DuplicateGroup";
import { PhotoInspectionModal } from "../PhotoInspectionModal";
import { Tooltip, InfoTooltip } from "../Tooltip";
import { VirtualGrid } from "../VirtualGrid";
import { AnimatePresence } from "motion/react";
import { DirectoryNode } from "../DirectoryTree";
import { SystemAPI } from "../../services/systemApi";
import {
  DedupeOptions,
  DEFAULT_DEDUPE_OPTIONS,
  DedupeRule,
} from "../../services/PhotoLibraryManager";

interface DuplicatesTabProps {
  type?: "exact" | "similar";
  sortedGroups: DedupeGroup[];
  autoResolveRule: DedupeRule;
  setAutoResolveRule: (rule: DedupeRule) => void;
  dupSortBy: string;
  setDupSortBy: (sortBy: string) => void;
  organizeDuplicates: (
    type: "exact" | "similar",
    folder?: string,
    simulate?: boolean,
    originalHandlingMode?: "keep" | "process",
  ) => Promise<void>;
  resolveAllGroups: (
    type: "exact" | "similar",
    originalHandlingMode?: "keep" | "process",
  ) => Promise<void>;
  resolveDuplicate: (
    groupId: string,
    keepPhotoId: number,
    customDeleteIds?: number[],
  ) => Promise<void>;
  selectedPhotoId: number | null;
  setSelectedPhotoId: (id: number | null) => void;
  orgTargetFolder: string | null;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  backupEnabled: boolean;
  setBackupEnabled: (enabled: boolean) => void;
  backupFolder: string;
  setBackupFolder: (folder: string) => void;
  directoryTree?: DirectoryNode;
  originalHandling?: "keep" | "process";
  setOriginalHandling?: (val: "keep" | "process") => void;
  isAiConfigured?: boolean;
  dedupeOptions?: DedupeOptions;
  setDedupeOptions?: React.Dispatch<React.SetStateAction<DedupeOptions>>;
  onRescanDuplicates?: (opts?: Partial<DedupeOptions>) => Promise<void>;
}

export const DuplicatesTab = ({
  type = "exact",
  sortedGroups,
  autoResolveRule,
  setAutoResolveRule,
  dupSortBy,
  setDupSortBy,
  organizeDuplicates,
  resolveAllGroups,
  resolveDuplicate,
  selectedPhotoId,
  setSelectedPhotoId,
  orgTargetFolder,
  addNotification,
  backupEnabled,
  setBackupEnabled,
  backupFolder,
  setBackupFolder,
  directoryTree,
  originalHandling = "keep",
  setOriginalHandling,
  isAiConfigured = false,
  dedupeOptions,
  setDedupeOptions,
  onRescanDuplicates,
}: DuplicatesTabProps) => {
  const { t, language } = useI18n();
  const [localOriginalHandling, setLocalOriginalHandling] = useState<
    "keep" | "process"
  >(() => {
    return (
      (localStorage.getItem("snapclean_original_handling") as
        | "keep"
        | "process") || "keep"
    );
  });

  const currentOriginalHandling = originalHandling || localOriginalHandling;
  const changeOriginalHandling = (val: "keep" | "process") => {
    if (setOriginalHandling) {
      setOriginalHandling(val);
    } else {
      setLocalOriginalHandling(val);
      localStorage.setItem("snapclean_original_handling", val);
    }
  };

  const [currentType, setCurrentType] = useState<"exact" | "similar">(type);
  const [showPrincipleInfo, setShowPrincipleInfo] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [subTypeFilter, setSubTypeFilter] = useState<
    "all" | "exact" | "visual" | "burst" | "resized" | "filename_copy" | "cross_folder"
  >("all");
  const [inspectingGroup, setInspectingGroup] = useState<DedupeGroup | null>(null);
  const [inspectingGroupIndex, setInspectingGroupIndex] = useState<number>(0);

  const [localDedupeOptions, setLocalDedupeOptions] = useState<DedupeOptions>(() => {
    const saved = localStorage.getItem("snapclean_dedupe_options");
    if (saved) {
      try {
        return { ...DEFAULT_DEDUPE_OPTIONS, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return DEFAULT_DEDUPE_OPTIONS;
  });

  const activeDedupeOptions = dedupeOptions || localDedupeOptions;
  const updateDedupeOptions = (
    updater: Partial<DedupeOptions> | ((prev: DedupeOptions) => DedupeOptions),
  ) => {
    if (setDedupeOptions) {
      if (typeof updater === "function") {
        setDedupeOptions(updater);
      } else {
        setDedupeOptions((prev) => ({ ...prev, ...updater }));
      }
    } else {
      setLocalDedupeOptions((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        localStorage.setItem("snapclean_dedupe_options", JSON.stringify(next));
        return next;
      });
    }
  };

  const applyPreset = (
    preset:
      | "balanced"
      | "exact_only"
      | "burst_only"
      | "resized_only"
      | "loose_creative",
  ) => {
    let next: Partial<DedupeOptions> = {};
    if (preset === "balanced") {
      next = {
        matchExactBytes: true,
        matchVisualSimilarity: true,
        matchTemporalBurst: true,
        matchResizedCopies: true,
        matchFilenamePatterns: true,
        matchCrossFolder: true,
        visualThreshold: 6,
        burstWindowMs: 30000,
        folderScope: "all",
        mediaType: "all",
      };
    } else if (preset === "exact_only") {
      next = {
        matchExactBytes: true,
        matchVisualSimilarity: false,
        matchTemporalBurst: false,
        matchResizedCopies: false,
        matchFilenamePatterns: true,
        matchCrossFolder: true,
        folderScope: "all",
      };
    } else if (preset === "burst_only") {
      next = {
        matchExactBytes: false,
        matchVisualSimilarity: true,
        matchTemporalBurst: true,
        matchResizedCopies: false,
        matchFilenamePatterns: false,
        visualThreshold: 4,
        burstWindowMs: 3000,
        folderScope: "all",
      };
    } else if (preset === "resized_only") {
      next = {
        matchExactBytes: false,
        matchVisualSimilarity: true,
        matchTemporalBurst: false,
        matchResizedCopies: true,
        matchFilenamePatterns: true,
        visualThreshold: 5,
        burstWindowMs: -1,
        folderScope: "all",
      };
    } else if (preset === "loose_creative") {
      next = {
        matchExactBytes: true,
        matchVisualSimilarity: true,
        matchTemporalBurst: true,
        matchResizedCopies: true,
        matchFilenamePatterns: true,
        visualThreshold: 10,
        burstWindowMs: -1,
        folderScope: "all",
      };
    }
    updateDedupeOptions(next);
    addNotification(
      language === "ko" ? "탐지 프리셋 적용됨" : "Preset Applied",
      language === "ko"
        ? "선택한 설정으로 탐지 조건이 업데이트되었습니다."
        : "Detection parameters have been updated.",
      "info",
    );
  };

  const handleRescanWithActiveOptions = async () => {
    if (!onRescanDuplicates) return;
    setIsRescanning(true);
    try {
      await onRescanDuplicates(activeDedupeOptions);
      addNotification(
        language === "ko" ? "중복 재탐지 완료" : "Re-scan Complete",
        language === "ko"
          ? "새로운 감지 조건으로 중복 데이터가 갱신되었습니다."
          : "Duplicate index refreshed with new criteria.",
        "success",
      );
    } catch (e) {
      addNotification(
        language === "ko" ? "재탐지 오류" : "Re-scan Error",
        language === "ko" ? "중복 재탐지 중 오류가 발생했습니다." : "Failed to re-scan.",
        "error",
      );
    } finally {
      setIsRescanning(false);
    }
  };

  const counts = useMemo(() => {
    let exact = 0;
    let visual = 0;
    let burst = 0;
    let resized = 0;
    let filenameCopy = 0;
    let crossFolder = 0;

    sortedGroups.forEach((g) => {
      if (g.type === "exact" || g.subType === "exact_byte") exact++;
      if (g.subType === "visual_similar" || (!g.subType && g.type === "similar"))
        visual++;
      if (
        g.subType === "burst" ||
        g.reasons?.includes("burst_sequence") ||
        g.reasons?.includes("burst")
      )
        burst++;
      if (g.subType === "resized" || g.reasons?.includes("resized_variant"))
        resized++;
      if (
        g.subType === "filename_copy" ||
        g.reasons?.includes("filename_copy_pattern")
      )
        filenameCopy++;
      if (g.reasons?.includes("cross_folder")) crossFolder++;
    });

    return {
      total: sortedGroups.length,
      exact,
      visual,
      burst,
      resized,
      filenameCopy,
      crossFolder,
    };
  }, [sortedGroups]);

  const [viewMode, setViewMode] = useState<DuplicateViewMode>(() => {
    return (
      (localStorage.getItem("snapclean_duplicates_view_mode") as DuplicateViewMode) ||
      "details"
    );
  });

  const handleViewModeChange = (mode: DuplicateViewMode) => {
    setViewMode(mode);
    localStorage.setItem("snapclean_duplicates_view_mode", mode);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(25);

  const filteredGroups = useMemo(() => {
    return sortedGroups.filter((g) => {
      if (subTypeFilter === "exact")
        return g.type === "exact" || g.subType === "exact_byte";
      if (subTypeFilter === "visual")
        return (
          g.subType === "visual_similar" || (!g.subType && g.type === "similar")
        );
      if (subTypeFilter === "burst")
        return (
          g.subType === "burst" ||
          g.reasons?.includes("burst_sequence") ||
          g.reasons?.includes("burst")
        );
      if (subTypeFilter === "resized")
        return (
          g.subType === "resized" || g.reasons?.includes("resized_variant")
        );
      if (subTypeFilter === "filename_copy")
        return (
          g.subType === "filename_copy" ||
          g.reasons?.includes("filename_copy_pattern")
        );
      if (subTypeFilter === "cross_folder")
        return g.reasons?.includes("cross_folder");

      return g.type === currentType;
    });
  }, [sortedGroups, currentType, subTypeFilter]);

  const searchedGroups = useMemo(() => {
    if (!searchQuery.trim()) return filteredGroups;
    const q = searchQuery.toLowerCase().trim();
    return filteredGroups.filter((g) =>
      g.photos.some(
        (p) =>
          p.path?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q),
      ),
    );
  }, [filteredGroups, searchQuery]);

  const visibleGroups = useMemo(
    () => searchedGroups.slice(0, displayCount),
    [searchedGroups, displayCount],
  );

  useEffect(() => {
    setDisplayCount(25);
  }, [currentType, dupSortBy, searchQuery]);

  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + 25, searchedGroups.length));
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [searchedGroups.length]);

  const redundantSize = filteredGroups.reduce(
    (acc, g) => acc + (g.redundantSize || 0),
    0,
  );

  const Icon = currentType === "exact" ? Hash : Layers;
  const iconColor =
    currentType === "exact" ? "text-emerald-500" : "text-amber-500";
  const title =
    currentType === "exact"
      ? (language === "ko" ? "정확한 중복 (용량/날짜/시간)" : "Exact Duplicates (Size/Date/Time)")
      : (language === "ko" ? "유사한 사진 및 동영상" : "Similar Photos & Videos");
  const desc =
    currentType === "exact"
      ? (language === "ko"
          ? "동일한 용량 및 날짜/시간을 가진 100% 일치하는 중복 사진과 동영상입니다."
          : "100% identical photo and video copies matching by file size and date/time.")
      : (language === "ko"
          ? "날짜, 시간대, 용량, 이미지/영상 유사성(pHash) 기준으로 탐지된 연사 및 유사 미디어입니다."
          : "Burst shots or similar photos/videos detected by date, time window, file size, and visual similarity.");
  const bulkLabel =
    currentType === "exact" ? t("bulkDeleteRedundant") : t("bulkDeleteSimilar");
  const accentColor = currentType === "exact" ? "indigo" : "amber";
  const emptyTitle =
    currentType === "exact" ? t("noIdenticalFiles") : t("noSimilarGroups");
  const emptyDesc =
    currentType === "exact" ? t("noDuplicatesFound") : t("clusteringUpToDate");

  return (
    <div className="space-y-6">
      {/* 4대 동작원리 안내 카드 (툴팁 기반 모듈) */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-300 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
            <Compass className="text-indigo-400 shrink-0" size={16} />
            <span>
              {language === "ko"
                ? "중복 탐지 4대 핵심 기준"
                : "4 Key Deduplication Principles"}
            </span>
            <InfoTooltip
              title={language === "ko" ? "4대 기준 동작 방식" : "4 Detection Principles"}
              content={
                language === "ko"
                  ? "날짜, 시간대, 바이트 용량, 지각 해시(pHash) 4가지 기준을 종합하여 100% 동일한 복사본부터 연사/리사이즈 미디어까지 정밀 분류합니다."
                  : "Combines date, time window, byte capacity, and perceptual hashes (pHash) for precision clustering."
              }
              size={13}
            />
          </div>
          <button
            onClick={() => setShowPrincipleInfo(!showPrincipleInfo)}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 shrink-0 ml-2"
          >
            {showPrincipleInfo ? (language === "ko" ? "접기 ▲" : "Collapse ▲") : (language === "ko" ? "상세 설명 ▼" : "Details ▼")}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Tooltip
            title={language === "ko" ? "기준 1: 날짜 (Date & EXIF)" : "Criteria 1: Date & EXIF"}
            content={
              language === "ko"
                ? "EXIF 촬영일자 및 파일 수정 일자를 대조하여 동일 날짜 또는 동일 이벤트 내 사진/동영상을 식별합니다."
                : "Analyzes EXIF date taken and file timestamps to identify photos and videos from the same day or event."
            }
          >
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-black">1</span>
                📅 {language === "ko" ? "날짜 대조" : "Date Match"}
              </div>
              <InfoTooltip
                title={language === "ko" ? "날짜 대조 상세" : "Date Match Info"}
                content={
                  language === "ko"
                    ? "EXIF 촬영일자 및 파일 수정 일자를 대조하여 동일 날짜 또는 동일 이벤트 내 사진/동영상을 식별합니다."
                    : "Analyzes EXIF date taken and file timestamps to identify photos and videos from the same day or event."
                }
                size={12}
              />
            </div>
          </Tooltip>

          <Tooltip
            title={language === "ko" ? "기준 2: 시간 (Time Window)" : "Criteria 2: Time Window"}
            content={
              language === "ko"
                ? "초/분 단위 시간대(Time window)를 정밀 분석하여 짧은 시간 내 연속 촬영된 연사(Burst)나 동시 캡처 항목을 묶어줍니다."
                : "Compares timestamp windows (seconds/minutes) to detect burst shots and simultaneous captures."
            }
          >
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between">
              <div className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-black">2</span>
                ⏰ {language === "ko" ? "시간대 분석" : "Time Window"}
              </div>
              <InfoTooltip
                title={language === "ko" ? "시간대 분석 상세" : "Time Window Info"}
                content={
                  language === "ko"
                    ? "초/분 단위 시간대(Time window)를 정밀 분석하여 짧은 시간 내 연속 촬영된 연사(Burst)나 동시 캡처 항목을 묶어줍니다."
                    : "Compares timestamp windows (seconds/minutes) to detect burst shots and simultaneous captures."
                }
                size={12}
              />
            </div>
          </Tooltip>

          <Tooltip
            title={language === "ko" ? "기준 3: 용량 (File Capacity)" : "Criteria 3: File Capacity"}
            content={
              language === "ko"
                ? "바이트(Byte) 단위의 용량을 대조합니다. 용량과 시간/날짜가 일치하면 해시 계산 전이라도 100% 일치하는 복사본으로 판별합니다."
                : "Compares exact byte sizes. Identical size combined with timestamp matching guarantees exact copy detection."
            }
          >
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-amber-500/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-black">3</span>
                💾 {language === "ko" ? "용량 일치" : "Exact Size"}
              </div>
              <InfoTooltip
                title={language === "ko" ? "용량 일치 상세" : "Size Match Info"}
                content={
                  language === "ko"
                    ? "바이트(Byte) 단위의 용량을 대조합니다. 용량과 시간/날짜가 일치하면 해시 계산 전이라도 100% 일치하는 복사본으로 판별합니다."
                    : "Compares exact byte sizes. Identical size combined with timestamp matching guarantees exact copy detection."
                }
                size={12}
              />
            </div>
          </Tooltip>

          <Tooltip
            title={language === "ko" ? "기준 4: 이미지/영상 유사성" : "Criteria 4: Visual & Video Hash"}
            content={
              language === "ko"
                ? "지각 해시(pHash)와 해밍 거리, 영상 길이/해상도를 비교하여 포맷이나 크기가 달라도 내용이 같은 화면과 영상을 찾아냅니다."
                : "Compares perceptual hashes (pHash), video durations, and visual fingerprints to find similar media across different formats."
            }
          >
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between">
              <div className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
                <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-black">4</span>
                👁️ {language === "ko" ? "시각 유사성" : "Visual Hash"}
              </div>
              <InfoTooltip
                title={language === "ko" ? "시각 유사성 상세" : "Visual Hash Info"}
                content={
                  language === "ko"
                    ? "지각 해시(pHash)와 해밍 거리, 영상 길이/해상도를 비교하여 포맷이나 크기가 달라도 내용이 같은 화면과 영상을 찾아냅니다."
                    : "Compares perceptual hashes (pHash), video durations, and visual fingerprints to find similar media across different formats."
                }
                size={12}
              />
            </div>
          </Tooltip>
        </div>

        {showPrincipleInfo && (
          <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl">
            <span className="font-bold text-indigo-300">💡 {language === "ko" ? "스냅클린(SnapClean) 중복 감지 엔진 요약:" : "SnapClean Deduplication Engine Summary:"} </span>
            {language === "ko"
              ? "복잡하고 모호한 알고리즘 대신, 사용자가 가장 직관적으로 판단할 수 있는 '날짜', '시간', '용량', '이미지/영상 유사성(pHash 및 재생 시간)' 4가지 기준을 핵심 지표로 사용합니다. 사진뿐만 아니라 동영상 또한 동일한 원리로 검사되며, 원본 보호를 위해 가장 선명하거나 용량이 큰 고화질 원본을 자동으로 유지(Keep)하도록 추천합니다."
              : "Instead of black-box clustering, SnapClean uses 4 intuitive criteria: Date, Time, Size, and Visual/Video Similarity (pHash and duration). Both photos and videos are analyzed with this unified logic, automatically recommending the sharpest or highest-quality file as the primary copy to preserve."}
          </div>
        )}
      </div>

      {/* 🚀 중복 사진 데이터 탐지 고도화 및 정밀 옵션 패널 (Advanced Deduplication Engine & Options) */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  {language === "ko"
                    ? "중복 사진 탐지 고도화 및 정밀 옵션 설정"
                    : "Advanced Duplicate Detection & Precision Options"}
                </h4>
                <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                  {language === "ko" ? "고도화 엔진 v2.4" : "ENGINE V2.4"}
                </span>
                <InfoTooltip
                  title={language === "ko" ? "정밀 옵션 안내" : "Precision Options Info"}
                  content={
                    language === "ko"
                      ? "완전 동일 파일, 시각적 유사도, 연사 시퀀스, 리사이즈/변환본, 파일명 복사 패턴을 맞춤 설정하여 정밀 탐지합니다."
                      : "Configure exact hash, visual similarity, burst windows, resized variants, and filename patterns."
                  }
                  size={14}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onRescanDuplicates && (
              <button
                onClick={handleRescanWithActiveOptions}
                disabled={isRescanning}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                title={language === "ko" ? "현재 옵션으로 중복 즉시 재탐지" : "Re-scan library with active options"}
              >
                <RefreshCw size={13} className={isRescanning ? "animate-spin" : ""} />
                <span>{isRescanning ? (language === "ko" ? "재탐지 중..." : "Scanning...") : (language === "ko" ? "새 조건으로 재탐지" : "Re-scan Library")}</span>
              </button>
            )}
            <button
              onClick={() => setShowOptionsPanel(!showOptionsPanel)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10 flex items-center gap-1.5"
            >
              <span>{showOptionsPanel ? (language === "ko" ? "설정 접기 ▲" : "Hide ▲") : (language === "ko" ? "정밀 옵션 열기 ▼" : "Options ▼")}</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles size={13} className="text-amber-400" />
            {language === "ko" ? "추천 프리셋:" : "Quick Presets:"}
          </span>
          <button
            onClick={() => applyPreset("balanced")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
          >
            ⚡ {language === "ko" ? "표준 균형 (권장)" : "Balanced"}
          </button>
          <button
            onClick={() => applyPreset("exact_only")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            🎯 {language === "ko" ? "100% 동일 복사본" : "Exact Only"}
          </button>
          <button
            onClick={() => applyPreset("burst_only")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            📸 {language === "ko" ? "연사 샷 집중" : "Burst Focus"}
          </button>
          <button
            onClick={() => applyPreset("resized_only")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            📐 {language === "ko" ? "리사이즈/변환본" : "Resized & Converted"}
          </button>
          <button
            onClick={() => applyPreset("loose_creative")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            🌐 {language === "ko" ? "광범위 유사도" : "Loose Creative"}
          </button>
        </div>

        {/* Detailed Options Form (Accordion) */}
        {showOptionsPanel && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-xs animate-fade-in">
            {/* Row 1: Detection switches */}
            <div>
              <div className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-indigo-400" />
                {language === "ko" ? "탐지 기준 활성화 / 비활성화" : "Matching Criteria Switches"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <Tooltip
                  title={language === "ko" ? "100% 바이트/해시 일치" : "Exact Byte/Hash Match"}
                  content={language === "ko" ? "MD5 및 12KB 희소 해시, 완전 동일 파일 크기를 대조합니다." : "MD5, sparse chunk hash, exact byte size."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchExactBytes}
                        onChange={(e) => updateDedupeOptions({ matchExactBytes: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">💯 {language === "ko" ? "100% 바이트/해시 일치" : "Exact Byte Match"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "해시 및 용량 일치" : "Exact Match"}
                      content={language === "ko" ? "MD5 / 12KB 희소 해시 및 완전 동일 크기 파일 검출" : "MD5, sparse chunk hash, exact byte size"}
                      size={12}
                    />
                  </label>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "시각적 유사도 (pHash)" : "Visual Similarity (pHash)"}
                  content={language === "ko" ? "외형 지각 해시 및 색상/구도 분석으로 비슷한 사진을 분류합니다." : "Perceptual hashing & visual composition analysis."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchVisualSimilarity}
                        onChange={(e) => updateDedupeOptions({ matchVisualSimilarity: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">👁️ {language === "ko" ? "시각적 유사도 (pHash)" : "Visual Similarity"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "시각적 유사도" : "Visual Hash"}
                      content={language === "ko" ? "외형 지각 해시 및 색상/구도 분석" : "Perceptual hashing & visual composition"}
                      size={12}
                    />
                  </label>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "연사 및 연속 촬영 시퀀스" : "Burst & Temporal Sequence"}
                  content={language === "ko" ? "지정 시간 윈도우 내 연속 촬영된 샷을 하나로 묶습니다." : "Consecutive shots in short time window."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchTemporalBurst}
                        onChange={(e) => updateDedupeOptions({ matchTemporalBurst: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">⚡ {language === "ko" ? "연사 시퀀스" : "Burst Sequence"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "연사 시퀀스" : "Burst Sequence"}
                      content={language === "ko" ? "지정 시간 윈도우 내 연속 촬영된 샷" : "Consecutive shots in short time window"}
                      size={12}
                    />
                  </label>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "리사이즈 & 포맷 변환본" : "Resized & Format Variants"}
                  content={language === "ko" ? "해상도 또는 확장자(WebP/JPEG/PNG)가 다른 동일 이미지 복사본을 찾습니다." : "Differing resolution or image formats."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchResizedCopies}
                        onChange={(e) => updateDedupeOptions({ matchResizedCopies: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">📐 {language === "ko" ? "리사이즈/변환본" : "Resized Variants"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "리사이즈 변환본" : "Resized Copies"}
                      content={language === "ko" ? "해상도 또는 확장자(WebP/JPEG) 다른 복사본" : "Differing resolution or image formats"}
                      size={12}
                    />
                  </label>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "파일명 복사 패턴" : "Filename Copy Patterns"}
                  content={language === "ko" ? "'- 복사본', ' (1)', '_copy' 등 운영체제 자동 중복 접미사를 검출합니다." : "Detect copy suffixes like (1), - Copy."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchFilenamePatterns}
                        onChange={(e) => updateDedupeOptions({ matchFilenamePatterns: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">📝 {language === "ko" ? "파일명 복사 패턴" : "Filename Pattern"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "파일명 복사본" : "Filename Suffix"}
                      content={language === "ko" ? "'- 복사본', ' (1)', '_copy' 등 접미사 검출" : "Detect copy suffixes like (1), - Copy"}
                      size={12}
                    />
                  </label>
                </Tooltip>

                <Tooltip
                  title={language === "ko" ? "폴더 간 중복 대조" : "Cross-Folder Match"}
                  content={language === "ko" ? "다운로드, 백업, 라이브러리 등 서로 다른 경로 디렉토리 간 중복을 대조합니다." : "Search across different directory trees."}
                >
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeDedupeOptions.matchCrossFolder}
                        onChange={(e) => updateDedupeOptions({ matchCrossFolder: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">📁 {language === "ko" ? "폴더 간 중복 대조" : "Cross-Folder"}</span>
                    </div>
                    <InfoTooltip
                      title={language === "ko" ? "폴더 간 대조" : "Cross-Folder"}
                      content={language === "ko" ? "다운로드/백업 등 서로 다른 폴더 간 중복" : "Search across different directory trees"}
                      size={12}
                    />
                  </label>
                </Tooltip>
              </div>
            </div>

            {/* Row 2: Precision Parameters & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1">
                    👁️ {language === "ko" ? "시각 유사도 감도" : "Visual Sensitivity"}
                  </label>
                  <InfoTooltip
                    title={language === "ko" ? "유사도 감도" : "Sensitivity"}
                    content={language === "ko" ? "낮을수록 거의 똑같은 사진만 검출합니다." : "Lower threshold detects only near-identical photos."}
                    size={11}
                  />
                </div>
                <select
                  value={activeDedupeOptions.visualThreshold}
                  onChange={(e) => updateDedupeOptions({ visualThreshold: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value={2}>{language === "ko" ? "매우 엄격 (97% 일치, pHash 2)" : "Ultra Strict (97%, dist <= 2)"}</option>
                  <option value={4}>{language === "ko" ? "엄격 (94% 일치, pHash 4)" : "Strict (94%, dist <= 4)"}</option>
                  <option value={6}>{language === "ko" ? "표준 (90% 일치, pHash 6 - 권장)" : "Balanced (90%, dist <= 6)"}</option>
                  <option value={8}>{language === "ko" ? "완화 (88% 일치, pHash 8)" : "Relaxed (88%, dist <= 8)"}</option>
                  <option value={10}>{language === "ko" ? "광범위 (84% 일치, pHash 10)" : "Loose (84%, dist <= 10)"}</option>
                  <option value={14}>{language === "ko" ? "매우 광범위 (78% 일치, pHash 14)" : "Very Loose (78%, dist <= 14)"}</option>
                </select>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1">
                    ⏰ {language === "ko" ? "시간 윈도우 허용치" : "Time Window"}
                  </label>
                  <InfoTooltip
                    title={language === "ko" ? "시간 윈도우" : "Time Window"}
                    content={language === "ko" ? "촬영 시간대 차이의 최대 허용 범위입니다." : "Maximum time gap between compared shots."}
                    size={11}
                  />
                </div>
                <select
                  value={activeDedupeOptions.burstWindowMs}
                  onChange={(e) => updateDedupeOptions({ burstWindowMs: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value={2000}>{language === "ko" ? "2초 (초고속 연사)" : "2s (Fast Burst)"}</option>
                  <option value={5000}>{language === "ko" ? "5초 (빠른 연속 촬영)" : "5s (Quick Sequence)"}</option>
                  <option value={30000}>{language === "ko" ? "30초 (동일 장면 연사 - 권장)" : "30s (Same Scene - Default)"}</option>
                  <option value={300000}>{language === "ko" ? "5분 (이벤트 세션)" : "5 min (Event Session)"}</option>
                  <option value={3600000}>{language === "ko" ? "1시간 (시간대별 촬영)" : "1 hour (Hourly Session)"}</option>
                  <option value={-1}>{language === "ko" ? "무제한 (시간 무관 전체 비교)" : "Unlimited (Cross-library)"}</option>
                </select>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1">
                    📁 {language === "ko" ? "폴더 비교 범위" : "Folder Scope"}
                  </label>
                  <InfoTooltip
                    title={language === "ko" ? "폴더 비교 범위" : "Folder Scope"}
                    content={language === "ko" ? "중복 파일의 폴더 위치 제한 여부입니다." : "Restrict matches by folder location."}
                    size={11}
                  />
                </div>
                <select
                  value={activeDedupeOptions.folderScope}
                  onChange={(e) => updateDedupeOptions({ folderScope: e.target.value as any })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">{language === "ko" ? "전체 (동일 + 폴더 간 모두)" : "All (Any folder)"}</option>
                  <option value="cross_folder">{language === "ko" ? "서로 다른 폴더 간만" : "Cross-Folder Only"}</option>
                  <option value="same_folder">{language === "ko" ? "동일 폴더 내만" : "Same Folder Only"}</option>
                </select>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-200 text-xs flex items-center gap-1">
                    🎬 {language === "ko" ? "미디어 유형 필터" : "Media Type Filter"}
                  </label>
                  <InfoTooltip
                    title={language === "ko" ? "미디어 유형" : "Media Type"}
                    content={language === "ko" ? "검사할 미디어 대상을 선택합니다." : "Target media category to deduplicate."}
                    size={11}
                  />
                </div>
                <select
                  value={activeDedupeOptions.mediaType}
                  onChange={(e) => updateDedupeOptions({ mediaType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">{language === "ko" ? "전체 (사진 + 동영상)" : "All (Photos & Videos)"}</option>
                  <option value="photos">{language === "ko" ? "사진만 (Photos Only)" : "Photos Only"}</option>
                  <option value="videos">{language === "ko" ? "동영상만 (Videos Only)" : "Videos Only"}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-type Quick Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <Tooltip
          title={language === "ko" ? "완전 일치 중복" : "Exact Duplicates"}
          content={
            language === "ko"
              ? "MD5 해시와 파일 크기가 100% 동일한 비트 단위 복제본입니다."
              : "Bit-level identical duplicates matching 100% in file size and hash."
          }
        >
          <button
            onClick={() => {
              setSubTypeFilter("all");
              setCurrentType("exact");
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTypeFilter === "all" && currentType === "exact"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Hash size={13} />
            <span>{language === "ko" ? "정확한 중복" : "Exact Duplicates"}</span>
            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {counts.exact}
            </span>
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "유사 및 연사 전체" : "Similar & Burst"}
          content={
            language === "ko"
              ? "지각적 시각 유사도(pHash) 및 짧은 시간 연속 촬영 샷 전체를 탐색합니다."
              : "Explore all visually similar photos (pHash) and temporal burst series."
          }
        >
          <button
            onClick={() => {
              setSubTypeFilter("all");
              setCurrentType("similar");
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTypeFilter === "all" && currentType === "similar"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers size={13} />
            <span>{language === "ko" ? "유사 / 연사 전체" : "Similar & Burst"}</span>
            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {counts.total - counts.exact}
            </span>
          </button>
        </Tooltip>

        <div className="w-[1px] h-4 bg-white/15 mx-1 hidden sm:block" />

        <Tooltip
          title={language === "ko" ? "시각적 유사 (pHash)" : "Visual Similarity"}
          content={
            language === "ko"
              ? "구도, 색감, 피사체 특징이 유사한 사진을 감지합니다."
              : "Matches photos sharing similar composition, color, and subject matter."
          }
        >
          <button
            onClick={() => setSubTypeFilter("visual")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              subTypeFilter === "visual"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            👁️ {language === "ko" ? "시각적 유사" : "Visual"} ({counts.visual})
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "연사 샷 (Burst)" : "Burst Sequence"}
          content={
            language === "ko"
              ? "수 초 내 연속 촬영된 셔터 시퀀스 사진들을 모아 최고의 1장을 추천합니다."
              : "Shots taken in quick succession within seconds; suggests best shot."
          }
        >
          <button
            onClick={() => setSubTypeFilter("burst")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              subTypeFilter === "burst"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ {language === "ko" ? "연사 샷" : "Burst"} ({counts.burst})
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "리사이즈 & 포맷 변환본" : "Resized & Format Variants"}
          content={
            language === "ko"
              ? "해상도가 다르거나 WebP/JPEG/PNG 등으로 변환된 동일 원본 복사본입니다."
              : "Different resolutions or converted formats (WebP, JPG, PNG) of the same photo."
          }
        >
          <button
            onClick={() => setSubTypeFilter("resized")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              subTypeFilter === "resized"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📐 {language === "ko" ? "리사이즈/변환" : "Resized"} ({counts.resized})
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "파일명 복사본 패턴" : "Filename Copy Suffix"}
          content={
            language === "ko"
              ? "'- 복사본', ' (1)', '_copy' 등 운영체제 자동 복사 접미사가 붙은 파일입니다."
              : "OS duplicated file copies containing suffixes like ' (1)', '- Copy', etc."
          }
        >
          <button
            onClick={() => setSubTypeFilter("filename_copy")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              subTypeFilter === "filename_copy"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📝 {language === "ko" ? "파일명 복사본" : "Filename Copy"} ({counts.filenameCopy})
          </button>
        </Tooltip>

        <Tooltip
          title={language === "ko" ? "폴더 간 중복 대조" : "Cross-Folder Match"}
          content={
            language === "ko"
              ? "다운로드, 사진 보관함, 백업 폴더 등 서로 다른 경로에 분산된 중복입니다."
              : "Duplicates distributed across separate directories (Downloads, DCIM, Backups)."
          }
        >
          <button
            onClick={() => setSubTypeFilter("cross_folder")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              subTypeFilter === "cross_folder"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📁 {language === "ko" ? "폴더 간 중복" : "Cross-Folder"} ({counts.crossFolder})
          </button>
        </Tooltip>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white italic uppercase tracking-tight flex items-center gap-3">
            <Icon className={iconColor} />
            {title}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {desc}{" "}
            <span className="text-white font-bold">
              {(redundantSize / 1024 / 1024).toFixed(1)} MB
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto justify-between sm:justify-start">
            <Tooltip
              title="Dry Run (모의 실행)"
              content={
                language === "ko"
                  ? "디스크 파일을 실제로 삭제하거나 이동하지 않고, 정리 대상과 절약 용량을 안전하게 사전 점검합니다."
                  : "Simulate duplicate resolution safely without modifying or moving any files on disk."
              }
            >
              <button
                onClick={() =>
                  organizeDuplicates(
                    currentType,
                    undefined,
                    true,
                    currentOriginalHandling,
                  )
                }
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg text-slate-500 hover:text-${accentColor}-400 transition-all flex items-center gap-1.5 cursor-pointer`}
              >
                <Activity size={10} /> Dry Run
              </button>
            </Tooltip>
            <div className="w-[1px] h-4 bg-white/10 self-center" />
            <Tooltip
              title={language === "ko" ? "낭비 용량 / 유사도 순 정렬" : "Sort by Waste / Match"}
              content={
                language === "ko"
                  ? currentType === "exact"
                    ? "가장 많은 저장 공간을 차지하는 중복 그룹 순서로 정렬합니다."
                    : "시각적 유사도가 가장 높은 중복 그룹 순서로 정렬합니다."
                  : "Sort groups by storage impact or similarity confidence."
              }
            >
              <button
                onClick={() =>
                  setDupSortBy(currentType === "exact" ? "size" : "confidence")
                }
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${dupSortBy === (currentType === "exact" ? "size" : "confidence") ? `bg-${accentColor}-600 text-white` : "text-slate-500 hover:text-slate-300"}`}
              >
                {currentType === "exact" ? t("waste") : t("match")}
              </button>
            </Tooltip>
            <Tooltip
              title={language === "ko" ? "촬영 날짜 순 정렬" : "Sort by Date"}
              content={
                language === "ko"
                  ? "최신 촬영 날짜 순서대로 중복 그룹을 정렬합니다."
                  : "Sort duplicate groups chronologically by date taken."
              }
            >
              <button
                onClick={() => setDupSortBy("date")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${dupSortBy === "date" ? `bg-${accentColor}-600 text-white` : "text-slate-500 hover:text-slate-300"}`}
              >
                {t("date")}
              </button>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto items-center">
            <Tooltip
              title={language === "ko" ? "스마트 원본 보존 규칙" : "Smart Auto-Resolve Rule"}
              content={
                language === "ko"
                  ? "그룹 내에서 자동으로 '유지할 1장의 최고 원본'을 선정하는 알고리즘 기준입니다 (선명도, 해상도, 용량, 날짜, EXIF)."
                  : "Rule to select the best primary photo to preserve (sharpness, resolution, file size, date, or metadata)."
              }
            >
              <select
                value={autoResolveRule}
                onChange={(e) => setAutoResolveRule(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden w-full sm:w-auto font-bold cursor-pointer"
              >
                <option value="sharpest" className="bg-slate-900">
                  {t("keepSharpest")}
                </option>
                <option value="largest" className="bg-slate-900">
                  {t("keepLargest")}
                </option>
                <option value="highest_res" className="bg-slate-900">
                  {language === "ko" ? "최고 해상도 (픽셀수)" : "Highest Resolution"}
                </option>
                <option value="newest" className="bg-slate-900">
                  {t("keepNewest")}
                </option>
                <option value="oldest" className="bg-slate-900">
                  {t("keepOldest")}
                </option>
                <option value="rich_exif" className="bg-slate-900">
                  {language === "ko" ? "EXIF 메타데이터 보존" : "Rich EXIF Metadata"}
                </option>
              </select>
            </Tooltip>
            <button
              onClick={() =>
                organizeDuplicates(
                  currentType,
                  undefined,
                  false,
                  currentOriginalHandling,
                )
              }
              className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400 transition-all cursor-pointer flex items-center gap-1.5 justify-center w-full sm:w-auto"
              title={orgTargetFolder || t("selectTargetFolder")}
            >
              <FolderPlus size={14} />
              <span className="truncate">
                {orgTargetFolder
                  ? `Organize to ${orgTargetFolder.split("/").pop()}`
                  : "Organize"}
              </span>
            </button>
          </div>
          <button
            onClick={() =>
              resolveAllGroups(currentType, currentOriginalHandling)
            }
            className={`px-4 py-2 bg-${accentColor}-600 hover:bg-${accentColor}-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-${accentColor}-600/20 flex items-center justify-center gap-1.5 w-full sm:w-auto`}
          >
            <Trash2 size={14} /> {bulkLabel}
          </button>
        </div>
      </div>

      {/* Safe Backup Options Row */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/20 text-indigo-400">
              {backupEnabled ? (
                <ShieldCheck
                  size={20}
                  className="text-emerald-400 animate-pulse"
                />
              ) : (
                <ShieldAlert size={20} className="text-rose-400" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {language === "ko"
                  ? "정리 전 안전 백업"
                  : "Safe Backup Before Cleaning"}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  {t("recommended") || "RECOMMENDED"}
                </span>
                <InfoTooltip
                  title={language === "ko" ? "안전 백업 안내" : "Safe Backup Info"}
                  content={
                    language === "ko"
                      ? "중복 파일을 일괄 정리하거나 삭제하기 전, 원본 파일을 안전한 수동 백업 디렉토리에 복사해 놓습니다."
                      : "Safely copies redundant items to a dedicated backup folder before they are moved or purged."
                  }
                  size={13}
                />
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
            {/* Toggle button */}
            <button
              onClick={() => setBackupEnabled(!backupEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border flex items-center gap-2 cursor-pointer ${
                backupEnabled
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${backupEnabled ? "bg-emerald-400 animate-ping" : "bg-rose-400"}`}
              />
              <span>
                {backupEnabled
                  ? language === "ko"
                    ? "백업 활성화됨"
                    : "Backup Enabled"
                  : language === "ko"
                    ? "백업 비활성화"
                    : "Backup Disabled"}
              </span>
            </button>

            {backupEnabled && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 w-full md:w-64">
                  <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">
                    Backup:
                  </span>
                  <input
                    type="text"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                    placeholder="/safe_backups"
                    className="bg-transparent border-none text-xs text-slate-200 focus:outline-hidden font-mono w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const selected = await SystemAPI.selectDirectory();
                    if (selected) {
                      const folderPath = Array.isArray(selected) ? selected[0] : selected;
                      if (folderPath) {
                        setBackupFolder(folderPath);
                        addNotification(
                          "Backup Target Selected",
                          `Device folder linked: ${folderPath}`,
                          "success"
                        );
                      }
                    }
                  }}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
                  title={
                    language === "ko"
                      ? "장치 폴더 실제 선택"
                      : "Select Device Folder"
                  }
                >
                  <FolderSearch size={15} />
                  <span className="hidden sm:inline">
                    {language === "ko" ? "장치 폴더 선택" : "Select Device Folder"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Original conservation control panel */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400">
              {currentOriginalHandling === "keep" ? (
                <ShieldCheck size={20} className="text-emerald-400" />
              ) : (
                <AlertCircle
                  size={20}
                  className="text-rose-400 animate-pulse"
                />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {language === "ko"
                  ? "정리 시 원본 파일 처리 정책"
                  : "Original File Cleaning Policy"}
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    currentOriginalHandling === "keep"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                  }`}
                >
                  {currentOriginalHandling === "keep"
                    ? language === "ko"
                      ? "안전 보존"
                      : "SAFE PRESERVATION"
                    : language === "ko"
                      ? "전체 제거-이동"
                      : "TOTAL PURGE-MOVE"}
                </span>
                <InfoTooltip
                  title={language === "ko" ? "원본 처리 정책 안내" : "Original Policy Info"}
                  content={
                    language === "ko"
                      ? "중복 처리 시 각 중복 그룹 내의 원본(선택된 핵심 파일)을 유지할지, 아니면 일체 전부 처리할지 지정합니다."
                      : "Designate whether to keep the key original files in place or process/remove all files including originals."
                  }
                  size={13}
                />
              </h4>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                changeOriginalHandling("keep");
                addNotification(
                  language === "ko"
                    ? "원본 파일 보존 설정"
                    : "Original Preservation Engaged",
                  language === "ko"
                    ? "각 그룹에서 대표 원본 1개는 그대로 남겨두고 중복 복사본만 청소합니다."
                    : "Perfectly preserves 1 primary original while removing redundant duplicates.",
                  "success",
                );
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentOriginalHandling === "keep"
                  ? "bg-emerald-600/25 border border-emerald-500/30 text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck size={14} />
              <span>
                {language === "ko" ? "원본파일 보관" : "Preserve Originals"}
              </span>
            </button>
            <button
              onClick={() => {
                changeOriginalHandling("process");
                addNotification(
                  language === "ko"
                    ? "원본 포함 전체 정리 활성화"
                    : "Processing All Assets Enabled",
                  language === "ko"
                    ? "원본을 보관하지 않으며, 작업 시 원본파일까지 함께 정리/삭제됩니다. 각별히 유의해 주세요!"
                    : "WARNING: Will delete or relocate even representative originals. Perform with caution!",
                  "warning",
                );
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                currentOriginalHandling === "process"
                  ? "bg-rose-600/25 border border-rose-500/30 text-rose-400 animate-pulse"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertCircle size={14} />
              <span>
                {language === "ko" ? "원본파일도 삭제" : "Delete/Process All"}
              </span>
            </button>
          </div>
        </div>

        {currentOriginalHandling === "process" && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5 animate-fade-in">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 leading-relaxed">
              <span className="font-extrabold block mb-1">
                {language === "ko"
                  ? "⚠️ 치명적 데이터 삭제 위험 경고"
                  : "⚠️ CRITICAL DATA LOSS RISK WARNING"}
              </span>
              {language === "ko"
                ? "원본 보존 정책이 해제되었습니다! 일괄 정리나 일괄 영구 삭제 시 대표본을 제외한 중복 항목뿐만 아니라, 대표 원본 파일까지 통째로 손실될 수 있습니다. 예기치 못한 데이터 손상이나 삭제 실수를 원천 차단하기 위해, 반드시 상단의 [안전 백업 활성화]를 켜고 안전한 다른 백업 디렉터리(/safe_backups 등)로 사본을 미리 복사 완료 하신 후 진행할 것을 강력히 안내합니다!"
                : "Original Preservation option is disabled! Execution will delete or relocate all files including key originals. To guarantee against irrevocable data loss, please ensure Auto-Backup is absolutely active with an independent safety directory (/safe_backups) configured before executing bulk cleaning."}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Guidance Section */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-2">
              {language === "ko"
                ? "정리 작업 가이드 & 데이터 안전 안내"
                : "Cleaning Guide & Data Safety"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Tooltip
                title={language === "ko" ? "일괄 삭제 (Delete)" : "Bulk Delete"}
                content={
                  language === "ko"
                    ? "선택된 모든 중복 파일을 앱 내 휴지통으로 이동합니다. 디스크 공간을 즉시 확보하고 싶을 때 적합하며, 실수 방지를 위해 백업 활성화를 권장합니다."
                    : "Moves all redundant duplicates to the trash. Ideal for immediate space recovery."
                }
              >
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-400 uppercase">
                    <Trash2 size={13} />
                    <span>{language === "ko" ? "일괄 삭제 (Delete)" : "Bulk Delete"}</span>
                  </div>
                  <InfoTooltip
                    title={language === "ko" ? "일괄 삭제 안내" : "Bulk Delete Info"}
                    content={
                      language === "ko"
                        ? "선택된 모든 중복 파일을 휴지통으로 이동합니다. 즉시 용량을 확보할 때 유용합니다."
                        : "Moves all redundant duplicates to trash for immediate capacity recovery."
                    }
                    size={12}
                  />
                </div>
              </Tooltip>

              <Tooltip
                title={language === "ko" ? "외부 폴더로 이동 (Organize/Move)" : "Organize to Folder"}
                content={
                  language === "ko"
                    ? "삭제하지 않고 별도의 특정 폴더(외장 하드 등)로 중복 자료를 모두 옮깁니다. 나중에 수동으로 검토하고 싶거나 원본을 유지하고 싶을 때 가장 안전한 방법입니다."
                    : "Relocates duplicates to a specific external folder instead of deleting them."
                }
              >
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase">
                    <FolderTree size={13} />
                    <span>{language === "ko" ? "외부 폴더 이동 (Organize)" : "Organize to Folder"}</span>
                  </div>
                  <InfoTooltip
                    title={language === "ko" ? "외부 폴더 이동 안내" : "Organize Info"}
                    content={
                      language === "ko"
                        ? "삭제하지 않고 별도 특정 폴더로 이동하여 안전하게 보존 및 검토합니다."
                        : "Relocates duplicates to an external directory for safe review."
                    }
                    size={12}
                  />
                </div>
              </Tooltip>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {language === "ko"
                  ? "모든 작업 전 자동 백업이 활성화되어 있는지 확인하세요."
                  : "Always verify Auto-Backup status before performing bulk actions."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Header + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* View Mode Toggle: Details (Explorer) vs List vs Grid */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => handleViewModeChange("details")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "details"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
              title={
                language === "ko"
                  ? "자세히 보기 (탐색기형 테이블: 파일명, 폴더경로, 크기, 수정/촬영일자, 해상도 컬럼 정렬)"
                  : "Details View (Explorer Data Grid: sortable columns for name, path, size, date, specs)"
              }
            >
              <TableIcon size={14} />
              <span>{language === "ko" ? "자세히 보기" : "Details"}</span>
              <span className="text-[9px] px-1 py-0.2 bg-white/20 rounded-md font-mono uppercase text-white/90">
                {language === "ko" ? "탐색기" : "EXP"}
              </span>
            </button>
            <button
              onClick={() => handleViewModeChange("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
              title={
                language === "ko"
                  ? "리스트 뷰 (카드형 비교 목록)"
                  : "List View (Comparison Cards)"
              }
            >
              <List size={14} />
              <span>{language === "ko" ? "리스트 뷰" : "List View"}</span>
            </button>
            <button
              onClick={() => handleViewModeChange("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
              title={
                language === "ko"
                  ? "그리드 뷰 (카드형 레이아웃)"
                  : "Grid View (Visual cards)"
              }
            >
              <LayoutGrid size={14} />
              <span>{language === "ko" ? "그리드 뷰" : "Grid View"}</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === "ko"
                  ? "파일명, 폴더 경로 검색..."
                  : "Search filename, folder path..."
              }
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-bold self-end sm:self-auto flex items-center gap-2">
          <span>
            {language === "ko"
              ? `총 ${searchedGroups.length}개 그룹 중 ${Math.min(visibleGroups.length, searchedGroups.length)}개 표시`
              : `Showing ${Math.min(visibleGroups.length, searchedGroups.length)} of ${searchedGroups.length} groups`}
          </span>
          {searchedGroups.length > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              {searchedGroups.reduce((acc, g) => acc + g.photos.length, 0)} {language === "ko" ? "개 파일" : "files"}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {visibleGroups.length > 0 ? (
          <div className="space-y-6">
            <VirtualGrid<DedupeGroup>
              items={visibleGroups}
              itemHeight={viewMode === "list" ? 160 : 380}
              columns={1}
              overscan={2}
              gridClassName="space-y-6"
              renderItem={(group, idx) => (
                <DuplicateGroup
                  key={`${group.id}-${idx}`}
                  group={group}
                  rule={autoResolveRule}
                  viewMode={viewMode}
                  onResolve={(g, delIds) => {
                    const keep = g.photos.find((p) => !delIds?.includes(p.id!));
                    if (keep?.id) resolveDuplicate(g.id, keep.id, delIds);
                  }}
                  selectedPhotoId={selectedPhotoId}
                  onSelect={setSelectedPhotoId}
                  addNotification={addNotification}
                />
              )}
            />

            {visibleGroups.length < searchedGroups.length && (
              <div className="flex flex-col items-center justify-center pt-4 pb-8 space-y-3">
                <div ref={loadMoreSentinelRef} className="h-4 w-full" />
                <button
                  onClick={() =>
                    setDisplayCount((prev) => Math.min(prev + 50, searchedGroups.length))
                  }
                  className="px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <ChevronDown size={16} />
                  <span>
                    {language === "ko"
                      ? `더보기 (${searchedGroups.length - visibleGroups.length}개 남음)`
                      : `Load More (${searchedGroups.length - visibleGroups.length} remaining)`}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass p-20 rounded-3xl border-dashed border-white/10 flex flex-col items-center gap-6">
            <div className="p-6 bg-slate-800 rounded-full text-slate-500">
              <Icon size={48} />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-xl font-bold text-white">
                {searchQuery
                  ? (language === "ko" ? "검색 결과 없음" : "No Matching Results")
                  : emptyTitle}
              </h4>
              <p className="text-slate-400 max-w-xs">
                {searchQuery
                  ? (language === "ko" ? "입력하신 검색어와 일치하는 중복 항목이 없습니다." : "No duplicate groups match your search filter.")
                  : emptyDesc}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectingGroup && (
          <PhotoInspectionModal
            photos={inspectingGroup.photos}
            initialIndex={inspectingGroupIndex}
            bestPhotoId={inspectingGroup.photos[0]?.id}
            toKeepIds={inspectingGroup.photos[0]?.id ? [inspectingGroup.photos[0].id] : []}
            onToggleKeep={() => {}}
            onKeepOnlyThis={(keepId) => {
              const delIds = inspectingGroup.photos
                .filter((p) => p.id !== keepId)
                .map((p) => p.id!)
                .filter(Boolean);
              resolveDuplicate(inspectingGroup.id, keepId, delIds);
              setInspectingGroup(null);
            }}
            onClose={() => setInspectingGroup(null)}
            addNotification={addNotification}
            language={language}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
