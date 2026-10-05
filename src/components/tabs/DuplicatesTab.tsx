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
} from "lucide-react";
import { DedupeGroup } from "../../services/dedupeEngine";
import { useI18n } from "../../i18n/context";
import { DuplicateGroup, DuplicateViewMode } from "../DuplicateGroup";
import { AnimatePresence } from "motion/react";
import { DirectoryNode } from "../DirectoryTree";
import { SystemAPI } from "../../services/systemApi";

interface DuplicatesTabProps {
  type?: "exact" | "similar";
  sortedGroups: DedupeGroup[];
  autoResolveRule: "sharpest" | "largest" | "newest" | "oldest";
  setAutoResolveRule: (
    rule: "sharpest" | "largest" | "newest" | "oldest",
  ) => void;
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

  const filteredGroups = useMemo(
    () => sortedGroups.filter((g) => g.type === currentType),
    [sortedGroups, currentType],
  );

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
      {/* 4대 동작원리 안내 카드 */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-slate-300 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-sm sm:text-base">
            <Compass className="text-indigo-400 shrink-0" size={18} />
            {language === "ko"
              ? "중복 사진 및 동영상 탐지 동작원리 (4대 기준)"
              : "Duplicate Photo & Video Detection Principles"}
          </div>
          <button
            onClick={() => setShowPrincipleInfo(!showPrincipleInfo)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 shrink-0 ml-2"
          >
            {showPrincipleInfo ? (language === "ko" ? "간략히 보기 ▲" : "Collapse ▲") : (language === "ko" ? "자세히 보기 ▼" : "Learn More ▼")}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1 text-xs">
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-black">기준 1</span>
              📅 {language === "ko" ? "날짜 (Date & EXIF)" : "Date (Taken & Modified)"}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === "ko"
                ? "EXIF 촬영일자 및 파일 수정 일자를 대조하여 동일 날짜 또는 동일 이벤트 내에서 촬영된 사진과 동영상을 식별합니다."
                : "Analyzes EXIF date taken and file timestamps to identify photos and videos from the same day or event."}
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="font-bold text-blue-400 flex items-center gap-1.5 mb-1 text-xs">
              <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-black">기준 2</span>
              ⏰ {language === "ko" ? "시간 (Time Window)" : "Time (Window & Burst)"}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === "ko"
                ? "초/분 단위 시간대(Time window)를 정밀 분석하여 짧은 시간 내 연속 촬영된 연사(Burst)나 동시 캡처 항목을 묶어줍니다."
                : "Compares timestamp windows (seconds/minutes) to detect burst shots and simultaneous captures."}
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1 text-xs">
              <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-black">기준 3</span>
              💾 {language === "ko" ? "용량 (File Capacity)" : "Size (File Capacity)"}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === "ko"
                ? "바이트(Byte) 단위의 용량을 대조합니다. 용량과 시간/날짜가 일치하면 해시 계산 전이라도 100% 일치하는 복사본으로 판별합니다."
                : "Compares exact byte sizes. Identical size combined with timestamp matching guarantees exact copy detection."}
            </p>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="font-bold text-purple-400 flex items-center gap-1.5 mb-1 text-xs">
              <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-black">기준 4</span>
              👁️ {language === "ko" ? "이미지/영상 유사성" : "Visual & Video Hash"}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {language === "ko"
                ? "지각 해시(pHash)와 해밍 거리, 영상 길이/해상도를 비교하여 포맷이나 크기가 달라도 내용이 같은 화면과 영상을 찾아냅니다."
                : "Compares perceptual hashes (pHash), video durations, and visual fingerprints to find similar media across different formats."}
            </p>
          </div>
        </div>

        {showPrincipleInfo && (
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 leading-relaxed bg-black/30 p-3.5 rounded-xl">
            <span className="font-bold text-indigo-300">💡 {language === "ko" ? "스냅클린(SnapClean) 중복 감지 엔진 요약:" : "SnapClean Deduplication Engine Summary:"} </span>
            {language === "ko"
              ? "복잡하고 모호한 알고리즘 대신, 사용자가 가장 직관적으로 판단할 수 있는 '날짜', '시간', '용량', '이미지/영상 유사성(pHash 및 재생 시간)' 4가지 기준을 핵심 지표로 사용합니다. 사진뿐만 아니라 동영상 또한 동일한 원리로 검사되며, 원본 보호를 위해 가장 선명하거나 용량이 큰 고화질 원본을 자동으로 유지(Keep)하도록 추천합니다."
              : "Instead of black-box clustering, SnapClean uses 4 intuitive criteria: Date, Time, Size, and Visual/Video Similarity (pHash and duration). Both photos and videos are analyzed with this unified logic, automatically recommending the sharpest or highest-quality file as the primary copy to preserve."}
          </div>
        )}
      </div>

      {/* Sub-tab Toggle */}
      <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-white/10 max-w-md backdrop-blur-md">
        <button
          onClick={() => setCurrentType("exact")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentType === "exact"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Hash size={14} />
          {language === "ko" ? "정확한 중복 (날짜/용량)" : "Exact Duplicates (Date/Size)"}
        </button>
        <button
          onClick={() => setCurrentType("similar")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentType === "similar"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers size={14} />
          {language === "ko" ? "유사 사진/동영상 (시간/유사도)" : "Similar Photos & Videos"}
        </button>
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
            <button
              onClick={() =>
                organizeDuplicates(
                  currentType,
                  undefined,
                  true,
                  currentOriginalHandling,
                )
              }
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg text-slate-500 hover:text-${accentColor}-400 transition-all flex items-center gap-1.5`}
            >
              <Activity size={10} /> Dry Run
            </button>
            <div className="w-[1px] h-4 bg-white/10 self-center" />
            <button
              onClick={() =>
                setDupSortBy(currentType === "exact" ? "size" : "confidence")
              }
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${dupSortBy === (currentType === "exact" ? "size" : "confidence") ? `bg-${accentColor}-600 text-white` : "text-slate-500 hover:text-slate-300"}`}
            >
              {currentType === "exact" ? t("waste") : t("match")}
            </button>
            <button
              onClick={() => setDupSortBy("date")}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${dupSortBy === "date" ? `bg-${accentColor}-600 text-white` : "text-slate-500 hover:text-slate-300"}`}
            >
              {t("date")}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <select
              value={autoResolveRule}
              onChange={(e) => setAutoResolveRule(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden w-full sm:w-auto font-bold"
            >
              <option value="sharpest" className="bg-slate-900">
                {t("keepSharpest")}
              </option>
              <option value="largest" className="bg-slate-900">
                {t("keepLargest")}
              </option>
              <option value="newest" className="bg-slate-900">
                {t("keepNewest")}
              </option>
              <option value="oldest" className="bg-slate-900">
                {t("keepOldest")}
              </option>
            </select>
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
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "ko"
                  ? "중복 파일을 일괄 정리하거나 삭제하기 전, 원본 파일을 안전한 수동 백업 디렉토리에 복사해 놓습니다."
                  : "Safely copies redundant items to a dedicated backup folder before they are moved or purged."}
              </p>
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
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "ko"
                  ? "중복 처리 시 각 중복 그룹 내의 원본(선택된 핵심 파일)을 유지할지, 아니면 일체 전부 처리할지 지정합니다."
                  : "Designate whether to keep the key original files in place or process/remove all files including originals."}
              </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-rose-400 uppercase">
                  <Trash2 size={12} />{" "}
                  {language === "ko" ? "일괄 삭제 (Delete)" : "Bulk Delete"}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === "ko"
                    ? "선택된 모든 중복 파일을 앱 내 휴지통으로 이동합니다. 디스크 공간을 즉시 확보하고 싶을 때 적합하며, 실수 방지를 위해 백업 활성화를 권장합니다."
                    : "Moves all redundant duplicates to the trash. Ideal for immediate space recovery. We strongly recommend enabling backup to prevent accidental loss."}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase">
                  <FolderTree size={12} />{" "}
                  {language === "ko"
                    ? "외부 폴더로 이동 (Organize/Move)"
                    : "Organize to Folder"}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === "ko"
                    ? "삭제하지 않고 별도의 특정 폴더(외장 하드 등)로 중복 자료를 모두 옮깁니다. 나중에 수동으로 검토하고 싶거나 원본을 유지하고 싶을 때 가장 안전한 방법입니다."
                    : "Relocates duplicates to a specific external folder instead of deleting them. Best for manual post-review or when you want to keep all original copies elsewhere."}
                </p>
              </div>
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
            {visibleGroups.map((group, idx) => (
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
            ))}

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
    </div>
  );
};
