import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  Film,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { db, PhotoRecord } from "../../services/db";
import { BurstEngine, BurstGroup } from "../../services/burstEngine";
import { libraryManager } from "../../services/PhotoLibraryManager";
import { useI18n } from "../../i18n/context";
import { SystemAPI } from "../../services/systemApi";
import { motion, AnimatePresence } from "motion/react";

interface BurstTabProps {
  setSelectedPhotoId: (id: number | null) => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  openMotionCreator: (photos: PhotoRecord[]) => void;
}

export const BurstTab = ({
  setSelectedPhotoId,
  addNotification,
  openMotionCreator,
}: BurstTabProps) => {
  const { t, language } = useI18n();
  const [burstGroups, setBurstGroups] = useState<BurstGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeWindow, setTimeWindow] = useState<number>(3000); // 3 seconds default
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<Record<string, number>>({});
  const [isPlayingGroup, setIsPlayingGroup] = useState<Record<string, boolean>>({});

  const fetchBurstGroups = async () => {
    setIsLoading(true);
    try {
      const groups = await BurstEngine.findBurstGroups(undefined, timeWindow);
      setBurstGroups(groups);
      // Default auto-play preview for all groups
      const initialPlaying: Record<string, boolean> = {};
      groups.forEach((g) => {
        initialPlaying[g.id] = true;
      });
      setIsPlayingGroup(initialPlaying);
    } catch (e) {
      console.error("Failed to load burst groups:", e);
      addNotification("Error", "연속 촬영 그룹을 분석하는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBurstGroups();
  }, [timeWindow]);

  // Live animation interval loop for preview cards
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePreviewIndex((prev) => {
        const nextState = { ...prev };
        burstGroups.forEach((group) => {
          if (isPlayingGroup[group.id]) {
            const current = nextState[group.id] ?? 0;
            nextState[group.id] = (current + 1) % group.photos.length;
          }
        });
        return nextState;
      });
    }, 400); // 400ms per slide preview

    return () => clearInterval(interval);
  }, [burstGroups, isPlayingGroup]);

  // Bulk Delete: keep best photo, delete others in selected groups
  const handleBulkRecommendDelete = async (group: BurstGroup) => {
    try {
      const bestId = group.bestPhotoId || group.photos[0].id;
      const toDeleteIds = group.photos
        .map((p) => p.id)
        .filter((id): id is number => id !== undefined && id !== bestId);

      if (toDeleteIds.length === 0) return;

      await db.photos.bulkUpdate(
        toDeleteIds.map((id) => ({ key: id, changes: { isDeleted: 1 } }))
      );

      addNotification(
        language === "ko" ? "추천 중복 파일 정리 완료" : "Recommended Clean Complete",
        language === "ko"
          ? `대표 사진 1장을 제외한 연속 촬영 ${toDeleteIds.length}장이 휴지통으로 이동되었습니다.`
          : `Moved ${toDeleteIds.length} redundant burst shots to trash, preserving the sharpest photo.`,
        "success"
      );

      // Refresh list
      fetchBurstGroups();
    } catch (e) {
      console.error("Bulk delete failed:", e);
      addNotification("Error", "중복 정리 중 오류가 발생했습니다.", "error");
    }
  };

  // Bulk clean all detected burst groups
  const handleCleanAllBursts = async () => {
    try {
      let totalCleaned = 0;
      for (const group of burstGroups) {
        const bestId = group.bestPhotoId || group.photos[0].id;
        const toDeleteIds = group.photos
          .map((p) => p.id)
          .filter((id): id is number => id !== undefined && id !== bestId);

        if (toDeleteIds.length > 0) {
          await db.photos.bulkUpdate(
            toDeleteIds.map((id) => ({ key: id, changes: { isDeleted: 1 } }))
          );
          totalCleaned += toDeleteIds.length;
        }
      }

      addNotification(
        language === "ko" ? "연속 촬영 자동 정리 완료" : "All Bursts Optimized",
        language === "ko"
          ? `총 ${totalCleaned}장의 중복 연속 사진이 휴지통으로 이동되었습니다.`
          : `Cleaned ${totalCleaned} redundant shots across all burst groups.`,
        "success"
      );

      fetchBurstGroups();
    } catch (e) {
      console.error("Clean all failed:", e);
      addNotification("Error", "전체 정리 작업 중 문제가 발생했습니다.", "error");
    }
  };

  const totalWasteMB = useMemo(() => {
    return burstGroups.reduce((acc, g) => {
      const best = g.photos.find((p) => p.id === g.bestPhotoId) || g.photos[0];
      const redundantSize = g.totalSize - (best.size || 0);
      return acc + redundantSize / (1024 * 1024);
    }, 0);
  }, [burstGroups]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner & Control Bar */}
      <div className="bg-linear-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-400">
                <Zap size={24} className="animate-pulse" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {language === "ko" ? "애니메이션 스튜디오" : "Animation Studio"}
              </h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {language === "ko"
                ? "비슷한 시간대에 연속해서 찍힌 사진들을 AI가 자동으로 묶어줍니다. 베스트 컷만 남기고 중복을 추천 삭제하거나, 생동감 넘치는 GIF 애니메이션 및 동영상(WebM/MP4)으로 제작해 보세요!"
                : "AI clusters photos taken within seconds of each other. Easily clean redundant shots while keeping the sharpest original, or merge them into dynamic GIFs and motion videos!"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            {/* Time window selector */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-1.5 flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 px-2.5 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} className="text-blue-400" />
                {language === "ko" ? "인식 간격:" : "Time Window:"}
              </span>
              {[
                { label: "1초 간격", val: 1000 },
                { label: "3초 간격", val: 3000 },
                { label: "5초 간격", val: 5000 },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setTimeWindow(item.val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeWindow === item.val
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {language === "ko" ? item.label : `${item.val / 1000}s`}
                </button>
              ))}
            </div>

            <button
              onClick={fetchBurstGroups}
              disabled={isLoading}
              className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="재검색 (Rescan Bursts)"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin text-blue-400" : ""} />
              <span className="text-xs font-bold sm:hidden">
                {language === "ko" ? "다시 스캔" : "Rescan"}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              {language === "ko" ? "감지된 연속 촬영 그룹" : "Detected Burst Groups"}
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {burstGroups.length}{" "}
              <span className="text-xs font-normal text-blue-400 font-sans">
                {language === "ko" ? "묶음" : "groups"}
              </span>
            </div>
          </div>
          <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              {language === "ko" ? "절약 가능한 중복 용량" : "Redundant Waste Capacity"}
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {totalWasteMB.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-400 font-sans">MB</span>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 bg-black/30 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                {language === "ko" ? "원클릭 자동 최적화" : "One-Click Optimization"}
              </span>
              <p className="text-[11px] text-slate-400">
                {language === "ko" ? "모든 그룹에서 베스트 컷만 보존" : "Preserve sharpest across all"}
              </p>
            </div>
            <button
              onClick={handleCleanAllBursts}
              disabled={burstGroups.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 size={14} />
              <span>{language === "ko" ? "전체 추천 삭제" : "Clean All"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {isLoading ? (
        <div className="glass p-20 rounded-3xl border-white/10 flex flex-col items-center justify-center gap-4 text-center">
          <RefreshCw size={36} className="animate-spin text-blue-400" />
          <p className="text-slate-300 font-bold">
            {language === "ko"
              ? "시간대 및 EXIF 메타데이터를 분석하여 연속 촬영 사진을 묶는 중입니다..."
              : "Analyzing timestamp proximity and visual bursts..."}
          </p>
        </div>
      ) : burstGroups.length === 0 ? (
        <div className="glass p-16 rounded-3xl border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-5 bg-slate-800/80 rounded-full text-slate-500">
            <Layers size={40} />
          </div>
          <h4 className="text-lg font-bold text-white">
            {language === "ko" ? "감지된 연속 촬영 사진이 없습니다" : "No Burst Shots Detected"}
          </h4>
          <p className="text-sm text-slate-400 max-w-md">
            {language === "ko"
              ? `현재 설정된 인식 간격(${timeWindow / 1000}초) 내에 연달아 촬영된 사진이 라이브러리에 없습니다. 인식 간격을 5초로 늘리거나 폴더를 추가 스캔해 보세요.`
              : `No photos taken within ${timeWindow / 1000}s of each other were found. Try increasing the time window to 5s.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {burstGroups.map((group) => {
              const currentIdx = activePreviewIndex[group.id] || 0;
              const currentPhoto = group.photos[currentIdx] || group.photos[0];
              const bestPhoto =
                group.photos.find((p) => p.id === group.bestPhotoId) || group.photos[0];
              const isPlaying = isPlayingGroup[group.id] ?? true;

              const previewUrl =
                currentPhoto.blob && currentPhoto.blob.size > 0
                  ? libraryManager.getBlobUrl(currentPhoto.path, () =>
                      URL.createObjectURL(currentPhoto.blob!),
                    )
                  : currentPhoto.thumbnail && currentPhoto.thumbnail.size > 0
                  ? libraryManager.getBlobUrl(currentPhoto.path, () =>
                      URL.createObjectURL(currentPhoto.thumbnail!),
                    )
                  : SystemAPI.getImageUrl(currentPhoto.path, "full") || null;

              const redundantMB = (group.totalSize - (bestPhoto.size || 0)) / (1024 * 1024);

              return (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900/70 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-xl hover:border-white/20 transition-all group"
                >
                  {/* Top Preview Section */}
                  <div className="relative h-64 sm:h-72 bg-black/60 overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Burst Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon size={48} className="opacity-40" />
                      </div>
                    )}

                    {/* Overlay badge info */}
                    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
                      <span className="bg-blue-600/90 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md">
                        <Zap size={12} className="fill-white" />
                        {group.photos.length}{" "}
                        {language === "ko" ? "장 연속 컷" : "Shots"}
                      </span>
                      <span className="bg-black/70 text-slate-200 border border-white/10 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                        {group.burstReason}
                      </span>
                    </div>

                    {/* Right action controls on image */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      <button
                        onClick={() =>
                          setIsPlayingGroup((prev) => ({
                            ...prev,
                            [group.id]: !isPlaying,
                          }))
                        }
                        className="p-2.5 bg-black/70 hover:bg-black text-white rounded-xl border border-white/10 backdrop-blur-md transition-all"
                        title={isPlaying ? "미리보기 정지" : "연속 미리보기 재생"}
                      >
                        {isPlaying ? <Clock size={16} className="text-amber-400" /> : <Play size={16} fill="white" />}
                      </button>
                    </div>

                    {/* Bottom thumbnail strip inside preview */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-black/60 p-2 rounded-2xl backdrop-blur-md border border-white/10 z-10">
                      {group.photos.map((p, idx) => {
                        const isBest = p.id === group.bestPhotoId;
                        const isCurrent = idx === currentIdx;
                        const thumbUrl =
                          p.thumbnail && p.thumbnail.size > 0
                            ? libraryManager.getBlobUrl(p.path, () =>
                                URL.createObjectURL(p.thumbnail!),
                              )
                            : p.blob && p.blob.size > 0
                            ? libraryManager.getBlobUrl(p.path, () =>
                                URL.createObjectURL(p.blob!),
                              )
                            : SystemAPI.getImageUrl(p.path, "thumbnail") || null;

                        return (
                          <div
                            key={p.id || idx}
                            onClick={() => {
                              setIsPlayingGroup((prev) => ({ ...prev, [group.id]: false }));
                              setActivePreviewIndex((prev) => ({ ...prev, [group.id]: idx }));
                            }}
                            className={`relative w-11 h-11 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                              isCurrent
                                ? "border-blue-400 scale-105 shadow-md"
                                : isBest
                                ? "border-emerald-500/70 opacity-90"
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                          >
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                                <ImageIcon size={16} />
                              </div>
                            )}
                            {isBest && (
                              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-xs">
                                ★
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action Section */}
                  <div className="p-6 flex flex-col justify-between flex-1 gap-6 bg-linear-to-b from-transparent to-black/30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 size={14} />
                          {language === "ko" ? "AI 추천 베스트 컷:" : "AI Best Shot:"}{" "}
                          <span className="text-white font-mono">
                            {bestPhoto.path.split("/").pop()}
                          </span>
                        </span>
                        <span className="text-rose-400 font-mono">
                          {language === "ko" ? "절약 가능:" : "Save:"} +{redundantMB.toFixed(1)} MB
                        </span>
                      </div>

                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-xs">
                        <div className="text-slate-300 leading-snug">
                          <span className="font-bold text-white block mb-0.5">
                            {language === "ko" ? "추천 삭제 (Best 1장 보존)" : "Smart Clean (Keep Best 1)"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {language === "ko"
                              ? `선명도와 크기가 가장 우수한 1장만 남기고 ${group.photos.length - 1}장을 삭제합니다.`
                              : `Keeps the highest quality photo, removing ${group.photos.length - 1} redundant shots.`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleBulkRecommendDelete(group)}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-600/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>{language === "ko" ? "추천 삭제" : "Clean"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Animation Creator & Video export action */}
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                        <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20 text-indigo-400">
                          <Film size={16} />
                        </div>
                        <div>
                          <span className="block text-white font-extrabold">
                            {language === "ko" ? "모션 콘텐츠 제작" : "Create Motion Media"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {language === "ko" ? "연속 컷으로 GIF / MP4 동영상 생성" : "Turn sequence into GIF or Video"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openMotionCreator(group.photos)}
                        className="px-5 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                        <span>{language === "ko" ? "애니메이션 / 동영상만들기" : "Create Animation & Video"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
