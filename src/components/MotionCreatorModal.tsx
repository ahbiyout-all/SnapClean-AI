import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  Film,
  Sparkles,
  Check,
  Download,
  RefreshCw,
  Clock,
  FolderPlus,
  Tv,
  Image as ImageIcon,
} from "lucide-react";
import { db, PhotoRecord } from "../services/db";
import { blobRegistry } from "../utils/blobRegistry";
import { SystemAPI } from "../services/systemApi";

interface MotionCreatorModalProps {
  photos: PhotoRecord[];
  onClose: () => void;
  addNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  language?: "ko" | "en";
  onMerged?: () => void;
}

export const MotionCreatorModal = ({
  photos,
  onClose,
  addNotification,
  language = "ko",
  onMerged,
}: MotionCreatorModalProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(200); // ms per frame
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [autoDownload, setAutoDownload] = useState<boolean>(true);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileProgress, setCompileProgress] = useState<number>(0);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});

  // 1. Initialize selections on mount
  useEffect(() => {
    const ids = photos
      .map((p) => p.id)
      .filter((id): id is number => id !== undefined);
    setSelectedIds(ids);
  }, [photos]);

  // 2. Generate and manage object URLs securely
  useEffect(() => {
    const urls: Record<number, string> = {};
    photos.forEach((p) => {
      if (p.id !== undefined) {
        if (p.blob && p.blob.size > 0) {
          urls[p.id] = blobRegistry.create(p.blob);
        } else if (p.thumbnail && p.thumbnail.size > 0) {
          urls[p.id] = blobRegistry.create(p.thumbnail);
        } else {
          const sysUrl = SystemAPI.getImageUrl(p.path, "full");
          if (sysUrl) urls[p.id] = sysUrl;
        }
      }
    });
    setPhotoUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => {
        if (url.startsWith("blob:")) {
          blobRegistry.revoke(url);
        }
      });
    };
  }, [photos]);

  // 3. Filtered and ordered photos based on selections
  const selectedPhotos = useMemo(() => {
    const filtered = photos.filter(
      (p) => p.id !== undefined && selectedIds.includes(p.id),
    );
    return isReversed ? [...filtered].reverse() : filtered;
  }, [photos, selectedIds, isReversed]);

  // 4. Reset index if list changes
  useEffect(() => {
    if (currentFrameIndex >= selectedPhotos.length) {
      setCurrentFrameIndex(0);
    }
  }, [selectedPhotos.length, currentFrameIndex]);

  // 5. Live playback loop
  useEffect(() => {
    if (!isPlaying || selectedPhotos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % selectedPhotos.length);
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, selectedPhotos, playbackSpeed]);

  const toggleSelectAll = () => {
    const allIds = photos
      .map((p) => p.id)
      .filter((id): id is number => id !== undefined);
    if (selectedIds.length === allIds.length) {
      // Keep at least the first one selected
      if (allIds.length > 0) setSelectedIds([allIds[0]]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          addNotification(
            language === "ko" ? "프레임 선택 제한" : "Selection Limit",
            language === "ko"
              ? "모션을 만들려면 최소 2개의 사진이 필요합니다."
              : "At least 2 photos are required to create motion.",
            "warning",
          );
          return prev;
        }
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Helper function to load HTMLImageElement from URL
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img); // resolve even on error to avoid crashing
      img.src = url;
    });
  };

  // 6. Compile selected frames into WebM Video using Canvas MediaRecorder
  const handleCompile = async () => {
    if (selectedPhotos.length < 2) {
      addNotification(
        language === "ko" ? "제작 불가" : "Cannot Compile",
        language === "ko"
          ? "합성할 사진을 2장 이상 선택해 주세요."
          : "Please select at least 2 photos to compile.",
        "warning",
      );
      return;
    }

    setIsCompiling(true);
    setCompileProgress(10);

    try {
      setCompileProgress(25);
      const loadedImages: HTMLImageElement[] = [];

      // Load all selected images
      for (const photo of selectedPhotos) {
        if (photo.id !== undefined && photoUrls[photo.id]) {
          const img = await loadImage(photoUrls[photo.id]);
          loadedImages.push(img);
        }
      }

      setCompileProgress(50);
      if (loadedImages.length === 0) {
        throw new Error(
          language === "ko"
            ? "이미지를 로드할 수 없습니다."
            : "Could not load images.",
        );
      }

      // Determine dimensions based on first image
      const canvas = document.createElement("canvas");
      canvas.width = loadedImages[0].naturalWidth || 800;
      canvas.height = loadedImages[0].naturalHeight || 600;

      // Bound size for optimization and browser canvas support limits
      if (canvas.width > 1280) {
        const ratio = 1280 / canvas.width;
        canvas.width = 1280;
        canvas.height = Math.round(canvas.height * ratio);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct 2D graphics context.");

      // Set record frame rate (fps) based on playback interval
      const fps = Math.min(60, Math.max(1, Math.round(1000 / playbackSpeed)));
      const stream = canvas.captureStream(fps);

      // Start recording
      const options = { mimeType: "video/webm;codecs=vp9" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      setCompileProgress(65);

      // We want the resulting loop to play at least 3-4 seconds total so it acts as a nice short clip
      const singleCycleDuration = selectedPhotos.length * playbackSpeed;
      const repeats = Math.max(2, Math.ceil(4000 / singleCycleDuration)); // repeat loop for at least 4 seconds
      const totalFrames = loadedImages.length * repeats;

      mediaRecorder.start();

      let currentFrame = 0;

      const drawFrameSeq = () => {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        const img = loadedImages[currentFrame % loadedImages.length];

        // Fill dark background
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw centered keeping aspect ratio
        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth || img.width || 800;
        const ih = img.naturalHeight || img.height || 600;

        const scale = Math.min(cw / iw, ch / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const nx = (cw - nw) / 2;
        const ny = (ch - nh) / 2;

        ctx.drawImage(img, nx, ny, nw, nh);

        // Add a micro branding text at bottom
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.fillText("SnapClean Motion", 24, canvas.height - 24);

        currentFrame++;
        setCompileProgress(Math.round(65 + 30 * (currentFrame / totalFrames)));
        setTimeout(drawFrameSeq, playbackSpeed);
      };

      drawFrameSeq();

      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });

      const videoBlob = new Blob(chunks, { type: "video/webm" });
      setCompileProgress(95);

      // Create indexed record
      const dateNow = Date.now();
      const firstPhoto = selectedPhotos[0];

      const newRecord: PhotoRecord = {
        originalId: `motion_${dateNow}`,
        path: `/library/motion_${dateNow}.webm`,
        size: videoBlob.size,
        width: canvas.width,
        height: canvas.height,
        dateTaken: dateNow,
        lastModified: dateNow,
        blob: videoBlob,
        type: "video/webm",
        thumbnail: firstPhoto.thumbnail || firstPhoto.blob,
        status: "indexed",
        category: "Motion",
        tags: ["Motion Photo", "Created"],
        description:
          language === "ko"
            ? `유사 사진 ${selectedPhotos.length}장으로 생성한 모션 루프 비디오`
            : `Motion loop video created from ${selectedPhotos.length} similar photos.`,
      };

      await db.photos.add(newRecord);
      setCompileProgress(100);

      addNotification(
        language === "ko" ? "모션 합성 성공!" : "Motion Photo Merged!",
        language === "ko"
          ? "움직이는 모션 비디오가 생성되어 라이브러리에 저장되었습니다."
          : "Animated motion video created and securely saved inside your Library.",
        "success",
      );

      // Trigger automatic file download
      if (autoDownload) {
        const downloadUrl = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `motion_loop_${dateNow}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      }

      onMerged?.();
      onClose();
    } catch (e: any) {
      console.error("Video synthesis failed:", e);
      addNotification(
        language === "ko" ? "합성 중 오류 발생" : "Compilation Error",
        e?.message || "Media Recorder failed to compile.",
        "error",
      );
    } finally {
      setIsCompiling(false);
    }
  };

  const activePhoto = selectedPhotos[currentFrameIndex];
  const activeUrl =
    activePhoto?.id !== undefined ? (photoUrls[activePhoto.id] || null) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-white/10 rounded-none md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-full md:h-auto max-h-full md:max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <Film size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight italic flex items-center gap-2">
                {language === "ko"
                  ? "연속 사진으로 움직이는 모션 만들기"
                  : "Create Motion Photo"}
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full uppercase font-black">
                  LIVE COMPILER
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === "ko"
                  ? "연속 촬영한 유사 사진을 하나의 부드러운 움짤 동영상으로 합성하고 저장합니다."
                  : "Stitches burst sequences or similar photos into a seamless playable looping video."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compile Progress Overlay */}
        {isCompiling && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-3xl flex items-center justify-center animate-bounce mb-6">
              <RefreshCw size={36} className="animate-spin" />
            </div>
            <h4 className="text-lg font-black uppercase text-white tracking-widest mb-1">
              {language === "ko"
                ? "비디오 렌더링 중..."
                : "COMPILING MOTION VIDEO..."}
            </h4>
            <p className="text-xs text-slate-400 mb-6 max-w-sm text-center">
              {language === "ko"
                ? "이미지를 불러와 고해상도 캔버스 스트림으로 동영상을 기록하고 있습니다. 잠시만 기다려 주세요."
                : "Loading assets and capturing high-resolution frame sequences into a webm container."}
            </p>
            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${compileProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-black text-indigo-400 mt-2">
              {compileProgress}%
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 min-h-0">
          {/* Main Visual Preview Area (Col-7) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="aspect-video w-full bg-slate-950 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative shadow-2xl group">
              {/* Playback image display */}
              {activeUrl ? (
                <img
                  src={activeUrl}
                  alt="Motion preview"
                  className="max-w-full max-h-full object-contain select-none"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-slate-600 text-xs text-center">
                  <ImageIcon
                    size={32}
                    className="mx-auto mb-2 opacity-40 animate-pulse"
                  />
                  <p>
                    {language === "ko"
                      ? "프레임을 선택해 주세요"
                      : "No Frame Selected"}
                  </p>
                </div>
              )}

              {/* Watermark/Loop indicators */}
              <div className="absolute top-4 left-4 flex gap-1.5 items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <div
                  className={`w-1.5 h-1.5 rounded-full bg-red-500 ${isPlaying ? "animate-ping" : ""}`}
                />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  {isPlaying ? "PREVIEWING LOOP" : "PAUSED"}
                </span>
              </div>

              {/* Frame Indicator Overlay */}
              {selectedPhotos.length > 0 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono font-bold text-slate-300">
                  {currentFrameIndex + 1} / {selectedPhotos.length}
                </div>
              )}
            </div>

            {/* Micro Player controls */}
            <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-2xl p-3 px-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    isPlaying
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="text-xs">
                  <span className="font-extrabold text-slate-300 block">
                    {isPlaying
                      ? language === "ko"
                        ? "재생 중"
                        : "Playing Loop"
                      : language === "ko"
                        ? "정지됨"
                        : "Paused"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {playbackSpeed}ms {language === "ko" ? "간격" : "interval"}
                  </span>
                </div>
              </div>

              {/* Reverse Order Toggle */}
              <button
                onClick={() => {
                  setIsReversed(!isReversed);
                  setCurrentFrameIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer ${
                  isReversed
                    ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {language === "ko" ? "↩ 역방향 루프" : "↩ Reverse Loop"}
              </button>
            </div>
          </div>

          {/* Configuration sidebar (Col-5) */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {/* Speed Configuration block */}
            <div className="space-y-3 bg-slate-950/20 border border-white/5 p-5 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} className="text-indigo-400" />
                {language === "ko"
                  ? "움직임 속도 조정 (Speed)"
                  : "Animation Playback Speed"}
              </label>

              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/10">
                {[
                  { label: language === "ko" ? "빠름" : "Fast", ms: 100 },
                  { label: language === "ko" ? "보통" : "Medium", ms: 200 },
                  { label: language === "ko" ? "느림" : "Slow", ms: 350 },
                  { label: language === "ko" ? "정지화" : "Lazy", ms: 600 },
                ].map((item) => (
                  <button
                    key={item.ms}
                    onClick={() => {
                      setPlaybackSpeed(item.ms);
                      addNotification(
                        language === "ko" ? "속도 변경됨" : "Speed Changed",
                        `${item.label} (${item.ms}ms)`,
                        "info",
                      );
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      playbackSpeed === item.ms
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame List & Selection Toggle */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Tv size={12} className="text-indigo-400" />
                  {language === "ko" ? "프레임 관리" : "Selected Frames"}
                </label>
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {selectedIds.length === photos.length
                    ? language === "ko"
                      ? "선택 해제"
                      : "Deselect All"
                    : language === "ko"
                      ? "전체 선택"
                      : "Select All"}
                </button>
              </div>

              {/* Thumbnails grid */}
              <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-3 overflow-y-auto flex-1 max-h-[160px] md:max-h-none grid grid-cols-4 gap-2">
                {photos.map((p, idx) => {
                  const isSelected =
                    p.id !== undefined && selectedIds.includes(p.id);
                  const isActiveFrame =
                    selectedPhotos[currentFrameIndex]?.id === p.id;
                  const url = p.id !== undefined ? (photoUrls[p.id] || null) : null;

                  return (
                    <div
                      key={`frame-item-${p.id}-${idx}`}
                      onClick={() => p.id !== undefined && toggleSelectId(p.id)}
                      className={`aspect-square rounded-xl bg-slate-950 border relative overflow-hidden transition-all group cursor-pointer ${
                        isActiveFrame
                          ? "ring-2 ring-amber-500 scale-95 border-amber-500/80 z-10"
                          : isSelected
                            ? "border-indigo-500/40"
                            : "border-white/5 opacity-40 hover:opacity-75"
                      }`}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-600 bg-slate-900">
                          F{idx + 1}
                        </div>
                      )}

                      {/* Small badge overlay */}
                      <div
                        className={`absolute top-1 left-1 w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-black/40 border-white/10 text-transparent"
                        }`}
                      >
                        {isSelected && <Check size={8} strokeWidth={4} />}
                      </div>

                      {/* Active Frame badge */}
                      {isActiveFrame && (
                        <div className="absolute inset-0 bg-amber-500/10 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions Block */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              {/* Option checkboxes */}
              <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-slate-400 font-bold">
                  {language === "ko"
                    ? "컴파일 완료 시 컴퓨터로 자동 파일 저장 (.webm)"
                    : "Auto-download compiled video (.webm)"}
                </span>
              </label>

              {/* Big Action button */}
              <button
                onClick={handleCompile}
                disabled={selectedIds.length < 2 || isCompiling}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className="text-amber-300 animate-bounce" />
                <span>
                  {language === "ko"
                    ? "움직이는 모션 비디오 합성 & 저장"
                    : "Compile & Save Motion Loop"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
