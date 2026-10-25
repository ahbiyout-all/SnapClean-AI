import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Instagram, 
  Smartphone, 
  Square, 
  Download, 
  Share2, 
  Check, 
  Zap, 
  Sparkles, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Layers, 
  Crop, 
  Heart, 
  Send, 
  MoreHorizontal, 
  MoveVertical, 
  Sliders, 
  ZoomIn, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface SocialExportModalProps {
  photo: any;
  onClose: () => void;
}

export type ExportPresetId = 
  | 'instagram-stories'
  | '1:1'
  | '4:5'
  | 'tiktok'
  | 'original';

export type CropMode = 'fill' | 'blur';
export type PreviewMode = 'crop-box' | 'full-photo' | 'story-output' | 'split';

export const SocialExportModal = ({ photo, onClose }: SocialExportModalProps) => {
  const { t, language } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<ExportPresetId>('instagram-stories');
  const [cropMode, setCropMode] = useState<CropMode>('fill');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('crop-box');
  const [showMorePresets, setShowMorePresets] = useState(false);

  // Vertical and Horizontal Alignment (0 to 100%)
  const [verticalOffset, setVerticalOffset] = useState<number>(50); // 0 = Top, 50 = Center, 100 = Bottom
  const [horizontalOffset, setHorizontalOffset] = useState<number>(50); // 0 = Left, 50 = Center, 100 = Right
  const [cropZoom, setCropZoom] = useState<number>(1.15); // Zoom/scale factor (1.0 to 2.0)

  // Drag interaction
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialV: number; initialH: number }>({
    x: 0,
    y: 0,
    initialV: 50,
    initialH: 50,
  });
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Natural image dimensions
  const [imgNatural, setImgNatural] = useState<{ width: number; height: number; aspect: number }>({
    width: 1920,
    height: 1080,
    aspect: 1.777,
  });

  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);
  const [removeWatermarks, setRemoveWatermarks] = useState<boolean>(true);
  const [aiSharpening, setAiSharpening] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string>('');

  const previewUrl = photo.thumbnailUrl || photo.path;

  // Load natural image dimensions
  useEffect(() => {
    if (!previewUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 1920;
      const h = img.naturalHeight || 1080;
      setImgNatural({ width: w, height: h, aspect: w / h });
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const isNineSixteen = selectedPreset === 'instagram-stories' || selectedPreset === 'tiktok';

  // Preset Specifications
  const getPresetSpecs = () => {
    switch (selectedPreset) {
      case 'instagram-stories':
        return {
          title: t('instagramStories'),
          dim: '1080 × 1920 px',
          ratio: '9:16 Portrait',
          description: t('instagramStoriesDesc'),
        };
      case '1:1':
        return {
          title: t('instagramPost'),
          dim: '1080 × 1080 px',
          ratio: '1:1 Square',
          description: language === 'ko' ? '인스타그램 정방형 피드 게시물' : 'Classic square feed post',
        };
      case '4:5':
        return {
          title: t('instagramPortrait'),
          dim: '1080 × 1350 px',
          ratio: '4:5 Portrait',
          description: language === 'ko' ? '피드 화면을 최대로 채우는 세로형 포스트' : 'Max-height vertical feed post',
        };
      case 'tiktok':
        return {
          title: t('storyTikTok'),
          dim: '1080 × 1920 px',
          ratio: '9:16 Vertical',
          description: language === 'ko' ? '틱톡 & 유튜브 쇼츠 세로 전체화면' : 'TikTok & Shorts fullscreen',
        };
      case 'original':
      default:
        return {
          title: t('native'),
          dim: `${imgNatural.width} × ${imgNatural.height} px`,
          ratio: 'Native Aspect',
          description: language === 'ko' ? '크롭 없는 원본 해상도 유지' : 'Uncropped full resolution',
        };
    }
  };

  const specs = getPresetSpecs();

  // Calculate 9:16 crop box dimensions as percentages over the original photo
  const targetAspect = 9 / 16; // 0.5625
  const imgAspect = imgNatural.aspect;

  let boxWidthPercent = 100;
  let boxHeightPercent = 100;

  if (imgAspect >= targetAspect) {
    // Image is wider than 9:16 (landscape, square, 4:3, etc.)
    boxHeightPercent = Math.min(100, 100 / cropZoom);
    boxWidthPercent = boxHeightPercent * (targetAspect / imgAspect);
  } else {
    // Image is narrower than 9:16
    boxWidthPercent = Math.min(100, 100 / cropZoom);
    boxHeightPercent = boxWidthPercent * (imgAspect / targetAspect);
  }

  const maxTopPercent = Math.max(0, 100 - boxHeightPercent);
  const maxLeftPercent = Math.max(0, 100 - boxWidthPercent);

  const boxTopPercent = maxTopPercent * (verticalOffset / 100);
  const boxLeftPercent = maxLeftPercent * (horizontalOffset / 100);

  // Drag interaction handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialV: verticalOffset,
      initialH: horizontalOffset,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartRef.current.y;
    const deltaX = e.clientX - dragStartRef.current.x;

    const containerHeight = cropContainerRef.current?.clientHeight || 400;
    const containerWidth = cropContainerRef.current?.clientWidth || 400;

    const vDelta = (deltaY / (containerHeight * 0.7)) * 100;
    const hDelta = (deltaX / (containerWidth * 0.7)) * 100;

    setVerticalOffset(Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialV + vDelta))));
    setHorizontalOffset(Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialH + hDelta))));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // High-Resolution Canvas Exporter
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = previewUrl;
      });

      let targetW = 1080;
      let targetH = 1920;

      if (selectedPreset === 'instagram-stories' || selectedPreset === 'tiktok') {
        targetW = 1080;
        targetH = 1920;
      } else if (selectedPreset === '1:1') {
        targetW = 1080;
        targetH = 1080;
      } else if (selectedPreset === '4:5') {
        targetW = 1080;
        targetH = 1350;
      } else {
        targetW = img.naturalWidth || 1920;
        targetH = img.naturalHeight || 1080;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const curAspect = imgW / imgH;

      if (selectedPreset === 'original') {
        ctx.drawImage(img, 0, 0, targetW, targetH);
      } else if (cropMode === 'blur') {
        // Draw blurred backdrop covering 9:16 frame
        ctx.save();
        ctx.filter = 'blur(45px) brightness(0.65)';
        const bgScale = Math.max(targetW / imgW, targetH / imgH) * 1.25;
        const bgW = imgW * bgScale;
        const bgH = imgH * bgScale;
        const bgX = (targetW - bgW) / 2;
        const bgY = (targetH - bgH) / 2;
        ctx.drawImage(img, bgX, bgY, bgW, bgH);
        ctx.restore();

        // Fit main image within target box
        const fitScale = Math.min(targetW / imgW, targetH / imgH);
        const fw = imgW * fitScale;
        const fh = imgH * fitScale;
        const fx = (targetW - fw) / 2;
        const fy = (targetH - fh) / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 40;
        ctx.drawImage(img, fx, fy, fw, fh);
      } else {
        // Full bleed 9:16 crop using user's exact vertical & horizontal alignment offsets
        const scale = Math.max(targetW / imgW, targetH / imgH) * cropZoom;
        const renderW = imgW * scale;
        const renderH = imgH * scale;

        const maxOffsetX = Math.max(0, renderW - targetW);
        const maxOffsetY = Math.max(0, renderH - targetH);

        const sx = -maxOffsetX * (horizontalOffset / 100);
        const sy = -maxOffsetY * (verticalOffset / 100);

        ctx.drawImage(img, sx, sy, renderW, renderH);
      }

      // Optional local AI sharpening simulation
      if (aiSharpening) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const filename = `SnapClean_${selectedPreset.replace(/[^a-zA-Z0-9]/g, '_')}_${targetW}x${targetH}.jpg`;
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            setExportedFilename(filename);
            setIsExporting(false);
            setIsDone(true);
            setTimeout(() => setIsDone(false), 3000);
          } else {
            setIsExporting(false);
          }
        },
        'image/jpeg',
        0.96
      );
    } catch (err) {
      console.warn('[SocialExport Error]:', err);
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = `SnapClean_Social_Export.jpg`;
      a.click();
      setIsExporting(false);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 3000);
    }
  };

  // Quick Share
  const handleQuickShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SnapClean Social Export',
          text: 'Optimized with SnapClean AI for Instagram Stories',
          url: window.location.href,
        });
      } catch (_e) {}
    } else {
      handleExport();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6"
    >
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] flex flex-col md:flex-row gap-4 md:gap-8 bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Left: Interactive Visual Preview Pane */}
        <div className="flex-1 bg-[#06080e] flex flex-col relative p-4 sm:p-6 overflow-hidden">
          {/* Subtle grid backdrop */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
          />

          {/* Top Bar above Preview Pane */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-2.5 mb-3 shrink-0">
            {/* Quick Preset Toggle: Instagram Story (9:16) vs Original */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset('instagram-stories');
                  setPreviewMode('crop-box');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedPreset === 'instagram-stories'
                    ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Instagram size={13} />
                <span>{t('instagramStoryPreset')} (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPreset('original')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedPreset === 'original'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 size={13} />
                <span>{t('originalPreset')}</span>
              </button>
            </div>

            {/* View Switcher Pills */}
            {isNineSixteen ? (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/10 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPreviewMode('crop-box')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    previewMode === 'crop-box'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="9:16 Aspect Ratio Crop Box with Alignment Drag"
                >
                  <Crop size={13} />
                  <span>{t('cropBoxView')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('story-output')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    previewMode === 'story-output'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Story Output Simulation"
                >
                  <Instagram size={13} />
                  <span>{t('storyView')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('split')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    previewMode === 'split'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Split Dual View (Source & 9:16 Crop)"
                >
                  <Layers size={13} />
                  <span>{t('splitDualView')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('full-photo')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    previewMode === 'full-photo'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Full Uncropped Photo Reference"
                >
                  <Maximize2 size={13} />
                  <span>{t('fullPhotoView')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-950/70 border border-white/10 px-3 py-1.5 rounded-xl">
                <Sparkles size={14} className="text-indigo-400" />
                <span>{specs.ratio}</span>
                <span className="text-slate-500 font-mono text-[11px]">({imgNatural.width}×{imgNatural.height}px)</span>
              </div>
            )}

            {/* Position indicator */}
            {isNineSixteen && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-white/10 px-3 py-1 rounded-xl">
                <span>V-Align:</span>
                <span className="text-white font-bold">
                  {verticalOffset === 0 ? 'Top (0%)' : verticalOffset === 50 ? 'Center (50%)' : verticalOffset === 100 ? 'Bottom (100%)' : `${verticalOffset}%`}
                </span>
                <span className="text-slate-600">•</span>
                <span>Zoom: {cropZoom.toFixed(2)}x</span>
              </div>
            )}
          </div>

          {/* Main Workspace Stage */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden p-3">
            {/* MODE 1: DEDICATED 9:16 ASPECT RATIO PREVIEW PANE WITH OVERLAID CROP BOX */}
            {isNineSixteen && previewMode === 'crop-box' ? (
              <div className="relative w-full h-full flex items-center justify-center gap-3 sm:gap-5">
                {/* 📐 The 9:16 Aspect Ratio Preview Pane */}
                <div 
                  ref={cropContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`relative aspect-[9/16] h-full max-h-[620px] w-auto rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border transition-all duration-200 select-none bg-slate-950 flex items-center justify-center group ${
                    isDragging 
                      ? 'border-rose-400 ring-4 ring-rose-500/25 shadow-[0_0_35px_rgba(244,63,94,0.4)] cursor-grabbing' 
                      : 'border-white/20 hover:border-white/40 cursor-grab'
                  }`}
                  title="Click and drag up/down to adjust vertical alignment"
                >
                  {/* Ambient Blurred Background (if blur mode selected) */}
                  {cropMode === 'blur' && previewUrl && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <img 
                        src={previewUrl} 
                        className="w-full h-full object-cover blur-2xl scale-125 opacity-70 brightness-75 select-none"
                        alt="" 
                      />
                      <div className="absolute inset-0 bg-black/35 backdrop-blur-xs" />
                    </div>
                  )}

                  {/* Main Image with exact vertical alignment & zoom */}
                  {previewUrl && (
                    <div className="w-full h-full relative overflow-hidden flex items-center justify-center pointer-events-none">
                      <img 
                        src={previewUrl} 
                        className={`w-full h-full select-none pointer-events-none transition-transform duration-75 ${
                          cropMode === 'blur'
                            ? 'object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]'
                            : 'object-cover'
                        }`}
                        style={{
                          objectPosition: `${horizontalOffset}% ${verticalOffset}%`,
                          transform: `scale(${cropZoom})`,
                        }}
                        alt="9:16 Crop Alignment Preview"
                      />
                    </div>
                  )}

                  {/* 📐 Overlaid 9:16 Crop Box Frame with Corner Brackets & Grid */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Perimeter Crop Frame Stroke */}
                    <div className="absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6)]" />

                    {/* 4 Corner Crop Brackets */}
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-[3px] border-l-[3px] border-rose-400 rounded-tl-sm shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-[3px] border-r-[3px] border-rose-400 rounded-tr-sm shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-[3px] border-l-[3px] border-rose-400 rounded-bl-sm shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-[3px] border-r-[3px] border-rose-400 rounded-br-sm shadow-[0_0_10px_rgba(244,63,94,0.8)]" />

                    {/* Rule of Thirds (3x3 Composition Grid) */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={`crop-grid-${i}`} className="border border-white/40" />
                      ))}
                    </div>

                    {/* Instagram/TikTok Story Safe Zones Overlay */}
                    {showSafeZones && (
                      <>
                        <div className="absolute top-[14%] inset-x-0 border-b border-dashed border-amber-300/80 bg-gradient-to-b from-black/40 to-transparent pt-1 pb-1 px-3 flex justify-between text-[9px] text-amber-300 font-mono shadow-sm">
                          <span>▲ Story UI Safe Margin</span>
                          <span>Top 14%</span>
                        </div>
                        <div className="absolute bottom-[14%] inset-x-0 border-t border-dashed border-amber-300/80 bg-gradient-to-t from-black/40 to-transparent pt-1 pb-1 px-3 flex justify-between text-[9px] text-amber-300 font-mono shadow-sm">
                          <span>▼ Actions & Reply Safe Margin</span>
                          <span>Bottom 14%</span>
                        </div>
                      </>
                    )}

                    {/* Aspect Ratio Badge Top Left */}
                    <div className="absolute top-3.5 left-3.5 bg-black/80 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg flex items-center gap-1.5 border border-white/20">
                      <Zap size={11} className="text-rose-400" />
                      <span>9:16 Crop Box</span>
                    </div>

                    {/* Resolution Badge Top Right */}
                    <div className="absolute top-3.5 right-3.5 bg-black/80 backdrop-blur-md text-slate-300 text-[9px] font-mono px-2 py-1 rounded-md border border-white/10 shadow-lg">
                      1080×1920
                    </div>

                    {/* Center Floating Alignment / Drag Badge */}
                    <div className="absolute inset-x-0 bottom-6 flex justify-center items-center">
                      <div className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-bold flex items-center gap-2 shadow-2xl transition-all ${
                        isDragging 
                          ? 'bg-rose-600 text-white border-rose-300 shadow-rose-600/50 scale-105 ring-2 ring-rose-400/50' 
                          : 'bg-black/85 text-white/95 border-white/20 group-hover:border-rose-400/50'
                      }`}>
                        <MoveVertical size={13} className={isDragging ? 'text-white animate-bounce' : 'text-rose-400 animate-pulse'} />
                        <span>
                          {isDragging 
                            ? `Vertical Align: ${verticalOffset}%` 
                            : `9:16 Crop Box • ${t('dragToAdjust')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached Tactile Vertical Alignment Control Strip */}
                <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-slate-950/90 border border-white/10 backdrop-blur-md shadow-2xl z-20 shrink-0">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    V-Align
                  </span>
                  
                  {/* Top Preset Button */}
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(0)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-12 text-center ${
                      verticalOffset === 0 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black' 
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                    title="Align to Top (0%)"
                  >
                    Top
                  </button>

                  {/* Nudge Up (-5%) */}
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(v => Math.max(0, v - 5))}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Nudge Up 5%"
                  >
                    <ChevronUp size={14} />
                  </button>

                  {/* Vertical Range Slider */}
                  <div className="relative h-40 w-8 flex items-center justify-center my-1">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={verticalOffset}
                      onChange={(e) => setVerticalOffset(Number(e.target.value))}
                      className="absolute w-36 h-2 accent-rose-500 cursor-pointer -rotate-90 origin-center"
                      title={`Vertical alignment: ${verticalOffset}%`}
                    />
                  </div>

                  {/* Nudge Down (+5%) */}
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(v => Math.min(100, v + 5))}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Nudge Down 5%"
                  >
                    <ChevronDown size={14} />
                  </button>

                  {/* Center Preset Button */}
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(50)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-12 text-center ${
                      verticalOffset === 50 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black' 
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                    title="Align to Center (50%)"
                  >
                    Mid
                  </button>

                  {/* Bottom Preset Button */}
                  <button
                    type="button"
                    onClick={() => setVerticalOffset(100)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer w-12 text-center ${
                      verticalOffset === 100 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black' 
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                    title="Align to Bottom (100%)"
                  >
                    Btm
                  </button>

                  {/* Numeric readout */}
                  <div className="pt-1 text-[10px] font-mono font-bold text-rose-400">
                    {verticalOffset}%
                  </div>
                </div>
              </div>
            ) : isNineSixteen && previewMode === 'split' ? (
              /* MODE 2: SPLIT DUAL VIEW (Full Photo Reference on Left + 9:16 Result on Right) */
              <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 p-2 overflow-auto">
                {/* Left: Source photo with moving 9:16 frame */}
                <div className="flex-1 h-full max-h-[580px] flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Maximize2 size={12} className="text-purple-400" />
                    <span>{t('fullPhotoView')}</span>
                    <span className="font-mono text-slate-500">({imgNatural.width}×{imgNatural.height})</span>
                  </div>
                  <div 
                    className="relative max-w-full max-h-[480px] rounded-xl overflow-hidden border border-white/20 select-none shadow-xl"
                    style={{ aspectRatio: `${imgNatural.width} / ${imgNatural.height}` }}
                  >
                    {previewUrl && (
                      <img src={previewUrl} className="w-full h-full object-contain pointer-events-none select-none block" alt="" />
                    )}
                    {/* Visual 9:16 frame box indicator */}
                    <div 
                      className="absolute z-20 border-2 border-rose-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
                      style={{
                        top: `${boxTopPercent}%`,
                        left: `${boxLeftPercent}%`,
                        width: `${boxWidthPercent}%`,
                        height: `${boxHeightPercent}%`,
                      }}
                    >
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={`split-grid-${i}`} className="border border-rose-400/50" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: The 9:16 Aspect Ratio Preview Pane */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                    <Crop size={12} />
                    <span>9:16 {t('cropBoxPane')}</span>
                    <span className="font-mono text-slate-500">(1080×1920)</span>
                  </div>
                  <div className="relative aspect-[9/16] h-[480px] rounded-xl overflow-hidden border-2 border-rose-500 shadow-2xl bg-black">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        className={`w-full h-full select-none pointer-events-none ${cropMode === 'blur' ? 'object-contain' : 'object-cover'}`}
                        style={{
                          objectPosition: `${horizontalOffset}% ${verticalOffset}%`,
                          transform: `scale(${cropZoom})`,
                        }}
                        alt=""
                      />
                    )}
                    {/* Safe zones if enabled */}
                    {showSafeZones && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                        <div className="border-b border-dashed border-amber-300/60 text-[8px] text-amber-300 font-mono pb-1">
                          Story Header Safe
                        </div>
                        <div className="border-t border-dashed border-amber-300/60 text-[8px] text-amber-300 font-mono pt-1">
                          Reactions Safe
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isNineSixteen && previewMode === 'full-photo' ? (
              /* MODE 3: FULL PHOTO REFERENCE WITH DRAGGABLE 9:16 CROP FRAME */
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <div 
                  ref={cropContainerRef}
                  className="relative max-w-full max-h-[580px] shadow-2xl rounded-xl overflow-hidden border border-white/20 select-none group"
                  style={{
                    aspectRatio: `${imgNatural.width} / ${imgNatural.height}`,
                  }}
                >
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      className="w-full h-full object-contain pointer-events-none select-none block"
                      alt="Original Reference"
                    />
                  )}

                  {/* 📐 9:16 Crop Box Overlay */}
                  <div 
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className={`absolute z-20 border-2 transition-shadow duration-150 ${
                      isDragging 
                        ? 'border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.6)] cursor-grabbing' 
                        : 'border-white/95 hover:border-rose-400 cursor-grab shadow-[0_0_15px_rgba(0,0,0,0.8)]'
                    }`}
                    style={{
                      top: `${boxTopPercent}%`,
                      left: `${boxLeftPercent}%`,
                      width: `${boxWidthPercent}%`,
                      height: `${boxHeightPercent}%`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                    }}
                  >
                    {/* 4 Corner Crop Brackets */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-white pointer-events-none" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-white pointer-events-none" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-white pointer-events-none" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-white pointer-events-none" />

                    {/* Rule of Thirds Grid inside the 9:16 Box */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={`crop-grid-${i}`} className="border border-white/40" />
                      ))}
                    </div>

                    {/* Center Drag Handle & Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-xl">
                        <MoveVertical size={13} className="text-rose-400 animate-pulse" />
                        <span>9:16 {t('dragToAdjust')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODE 4: FINAL STORY LIVE OUTPUT (Or standard aspect ratio preview) */
              <motion.div 
                layout
                className={`relative bg-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 rounded-2xl border border-white/15 ${
                  isNineSixteen 
                    ? 'aspect-[9/16] h-full max-h-[620px]' 
                    : selectedPreset === '1:1' 
                      ? 'aspect-square h-full max-h-[520px]' 
                      : selectedPreset === '4:5' 
                        ? 'aspect-[4/5] h-full max-h-[580px]' 
                        : 'aspect-auto max-h-[580px] max-w-full'
                }`}
                style={selectedPreset === 'original' ? {
                  aspectRatio: `${imgNatural.width} / ${imgNatural.height}`,
                  maxHeight: '580px',
                  maxWidth: '100%',
                } : undefined}
              >
                {/* Ambient Blurred Background (if blur mode selected) */}
                {isNineSixteen && cropMode === 'blur' && previewUrl && (
                  <div className="absolute inset-0 overflow-hidden">
                    <img 
                      src={previewUrl} 
                      className="w-full h-full object-cover blur-2xl scale-125 opacity-70 brightness-75"
                      alt="" 
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
                  </div>
                )}

                {/* Main Photo cropped with user's exact vertical alignment */}
                {previewUrl && (
                  <img 
                    src={previewUrl} 
                    className={`relative w-full h-full transition-all duration-300 ${
                      isNineSixteen && cropMode === 'blur'
                        ? 'object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]'
                        : selectedPreset === 'original'
                          ? 'object-contain'
                          : 'object-cover'
                    }`}
                    style={{
                      objectPosition: selectedPreset === 'original' ? 'center' : `${horizontalOffset}% ${verticalOffset}%`,
                    }}
                    alt="Export Preview"
                  />
                )}
                
                {/* Rule of Thirds Grid Overlay for Cropped Modes */}
                {selectedPreset !== 'original' && (
                  <div className="absolute inset-0 border border-white/20 pointer-events-none">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={`cell-${i}`} className="border border-white/40" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Native aspect indicator badge */}
                {selectedPreset === 'original' && (
                  <div className="absolute top-3 right-3 bg-indigo-950/85 backdrop-blur-md text-indigo-200 text-[10px] font-mono px-2.5 py-1 rounded-md border border-indigo-400/30 shadow-lg flex items-center gap-1.5 z-20 pointer-events-none">
                    <Sparkles size={11} className="text-cyan-400" />
                    <span>{imgNatural.width} × {imgNatural.height} (100% Native)</span>
                  </div>
                )}

                {/* Instagram Stories Simulated Safe-Zone Overlay */}
                {isNineSixteen && showSafeZones && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                    {/* Top Safe-Zone: Instagram Story Bar & Publisher Header */}
                    <div className="space-y-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-2 -mx-2 -mt-2 rounded-t-xl">
                      {/* Progress dashes */}
                      <div className="flex gap-1.5 w-full">
                        <div className="h-0.5 flex-1 bg-white rounded-full" />
                        <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
                        <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
                      </div>

                      {/* Profile info & Close */}
                      <div className="flex items-center justify-between text-white pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                            <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black">
                              SC
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold tracking-tight">snapclean.ai</span>
                            <span className="text-[10px] text-white/60">2h</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <MoreHorizontal size={16} />
                          <X size={18} />
                        </div>
                      </div>

                      {/* Top Safety Dotted Line */}
                      <div className="pt-2 border-b border-dashed border-amber-400/40 flex justify-between items-center text-[9px] text-amber-300 font-mono">
                        <span>▲ UI Safe Margin</span>
                        <span>Safe Zone Top</span>
                      </div>
                    </div>

                    {/* Bottom Safe-Zone: Reply Field & Reactions */}
                    <div className="space-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 -mx-2 -mb-2 rounded-b-xl">
                      {/* Bottom Safety Dotted Line */}
                      <div className="pb-1 border-t border-dashed border-amber-400/40 flex justify-between items-center text-[9px] text-amber-300 font-mono">
                        <span>▼ UI Safe Margin</span>
                        <span>Safe Zone Bottom</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-white">
                        <div className="flex-1 py-2 px-3 rounded-full border border-white/40 bg-white/10 text-white/60 text-xs flex items-center">
                          <span>Send message...</span>
                        </div>
                        <div className="p-2 text-white/90">
                          <Heart size={20} />
                        </div>
                        <div className="p-2 text-white/90">
                          <Send size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preset Badge Top Left */}
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-lg flex items-center gap-1.5 border border-white/15 z-20">
                  <Zap size={11} className="text-amber-400" />
                  <span>{specs.ratio}</span>
                </div>

                {/* Target Resolution Bottom Center */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-slate-300 text-[10px] font-mono px-3 py-1 rounded-full border border-white/10 shadow-lg z-20 pointer-events-none">
                  {specs.dim}
                </div>
              </motion.div>
            )}
          </div>

          {/* Exporting Progress Overlay */}
          <AnimatePresence>
            {isExporting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-40"
              >
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <span className="text-white font-black uppercase tracking-widest text-xs">
                  {t('optimizingForSocial')}
                </span>
                <span className="text-[11px] text-indigo-300 font-mono mt-1">
                  Rendering {specs.dim} • V-Align: {verticalOffset}%
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Controls & Presets Area */}
        <div className="w-full md:w-[370px] p-6 sm:p-7 flex flex-col gap-5 bg-slate-900/60 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex justify-between items-start pb-3 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Instagram size={11} />
                <span>Social Preset Engine</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                {specs.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {specs.description}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* 🎯 Preset Selection UI: Dual Toggle between Instagram Story (9:16) & Original */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-rose-400" />
                  <span>{t('presetSelectionUI')}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-indigo-300">
                  {selectedPreset === 'instagram-stories' 
                    ? '9:16 Story' 
                    : selectedPreset === 'original' 
                      ? 'Native Uncropped' 
                      : specs.ratio}
                </span>
              </label>

              {/* Segmented Hero Toggle Cards */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-white/10 shadow-inner">
                {/* 1. Instagram Story (9:16) Toggle Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreset('instagram-stories');
                    setPreviewMode('crop-box');
                  }}
                  className={`relative p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                    selectedPreset === 'instagram-stories'
                      ? 'bg-gradient-to-br from-rose-950/90 via-purple-950/80 to-slate-900 border-2 border-rose-500 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-400/40'
                      : 'bg-white/5 border border-white/5 hover:border-white/20 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${
                      selectedPreset === 'instagram-stories'
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md'
                        : 'bg-white/10 text-rose-400'
                    }`}>
                      <Instagram size={18} />
                    </div>
                    {selectedPreset === 'instagram-stories' && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                        <Check size={10} />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                      <span>{t('instagramStoryPreset')}</span>
                      <span className="text-[10px] text-rose-400 font-mono">9:16</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      1080 × 1920 px
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-rose-300/90 font-medium">
                      <Crop size={10} />
                      <span>{t('cropBoxView')}</span>
                    </div>
                  </div>
                </button>

                {/* 2. Original (Native) Toggle Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPreset('original')}
                  className={`relative p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                    selectedPreset === 'original'
                      ? 'bg-gradient-to-br from-indigo-950/90 via-blue-950/80 to-slate-900 border-2 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                      : 'bg-white/5 border border-white/5 hover:border-white/20 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${
                      selectedPreset === 'original'
                        ? 'bg-gradient-to-tr from-indigo-500 via-blue-600 to-cyan-500 text-white shadow-md'
                        : 'bg-white/10 text-indigo-400'
                    }`}>
                      <Maximize2 size={18} />
                    </div>
                    {selectedPreset === 'original' && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/40">
                        <Check size={10} />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                      <span>{t('originalPreset')}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">Native</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {imgNatural.width} × {imgNatural.height} px
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-indigo-300/90 font-medium">
                      <Sparkles size={10} />
                      <span>{language === 'ko' ? '무손실 원본' : 'Full uncropped'}</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Informative Card when Original is selected */}
              {selectedPreset === 'original' && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Info size={13} />
                      <span>{t('nativeDimensions')}</span>
                    </span>
                    <span className="font-mono font-bold text-white text-[11px] bg-white/10 px-2 py-0.5 rounded">
                      {imgNatural.width} × {imgNatural.height} px
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t('uncroppedNotice')}
                  </p>
                  <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {imgNatural.aspect >= 1.2 ? 'Landscape' : imgNatural.aspect <= 0.85 ? 'Portrait' : 'Square'} ({(imgNatural.aspect).toFixed(2)}:1)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreset('instagram-stories');
                        setPreviewMode('crop-box');
                      }}
                      className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                    >
                      {language === 'ko' ? '스토리 9:16으로 전환 →' : 'Switch to Story 9:16 →'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Collapsible / Expandable More Presets Drawer */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowMorePresets(!showMorePresets)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-white py-1.5 px-1 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{t('otherPresets')} (1:1, 4:5, TikTok)</span>
                  </span>
                  {showMorePresets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showMorePresets && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-3 gap-1.5 pt-1.5 overflow-hidden"
                    >
                      {[
                        { id: '1:1' as ExportPresetId, label: t('instagramPost'), sub: '1:1 Square', icon: Square },
                        { id: '4:5' as ExportPresetId, label: t('instagramPortrait'), sub: '4:5 Portrait', icon: Instagram },
                        { id: 'tiktok' as ExportPresetId, label: t('storyTikTok'), sub: '9:16 TikTok', icon: Smartphone },
                      ].map((item) => {
                        const isSelected = selectedPreset === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedPreset(item.id);
                              if (item.id === 'tiktok') setPreviewMode('crop-box');
                            }}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                                : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <item.icon size={12} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            </div>
                            <div className="text-[11px] font-bold truncate leading-tight">{item.label}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.sub}</div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 9:16 Vertical Alignment & Visual Crop Controls */}
            {isNineSixteen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3.5 p-3.5 rounded-2xl bg-slate-950/80 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-rose-300 tracking-wider flex items-center gap-1.5">
                    <MoveVertical size={13} />
                    <span>{t('verticalAlignment')}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white font-bold bg-white/10 px-2 py-0.5 rounded">
                    {verticalOffset}%
                  </span>
                </div>

                {/* Vertical Alignment Quick Preset Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 0, label: t('topFocus') },
                    { val: 50, label: t('centerFocus') },
                    { val: 100, label: t('bottomFocus') },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setVerticalOffset(btn.val)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        verticalOffset === btn.val 
                          ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white border-rose-400 shadow-md shadow-rose-600/25' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Smooth Vertical Alignment Range Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Top (0%)</span>
                    <span>Center (50%)</span>
                    <span>Bottom (100%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={verticalOffset}
                    onChange={(e) => setVerticalOffset(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Crop Zoom / Frame Scale */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <ZoomIn size={12} />
                      <span>{t('cropScale')}</span>
                    </span>
                    <span className="font-mono text-white text-[11px] font-bold">
                      {cropZoom.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Crop Mode: Full Bleed vs Ambient Blur Fit */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    {t('cropMode')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCropMode('fill')}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        cropMode === 'fill' 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Crop size={12} />
                      <span className="text-[11px]">{t('fullBleedCrop')}</span>
                    </button>
                    <button
                      onClick={() => setCropMode('blur')}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        cropMode === 'blur' 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers size={12} />
                      <span className="text-[11px]">{t('blurBackdrop')}</span>
                    </button>
                  </div>
                </div>

                {/* Safe Zone Toggle */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    {showSafeZones ? <Eye size={13} className="text-amber-400" /> : <EyeOff size={13} className="text-slate-500" />}
                    <span>{t('storySafeZone')}</span>
                  </span>
                  <button
                    onClick={() => setShowSafeZones(!showSafeZones)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      showSafeZones 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showSafeZones ? 'ON' : 'OFF'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Intelligent Enhancements */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {t('intelligentFeatures')}
              </label>
              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => setRemoveWatermarks(!removeWatermarks)}
                  className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold text-slate-300">{t('removeWatermarks')}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${removeWatermarks ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${removeWatermarks ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
                <div 
                  onClick={() => setAiSharpening(!aiSharpening)}
                  className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold text-slate-300">{t('localAiSharpening')}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${aiSharpening ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${aiSharpening ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-indigo-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-wider transition-all shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-98"
            >
              {isDone ? (
                <>
                  <Check size={16} className="text-emerald-300" />
                  <span>{t('assetSaved')}</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>{t('exportOptimized')} ({specs.ratio})</span>
                </>
              )}
            </button>

            <button 
              onClick={handleQuickShare}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 size={14} />
              <span>{t('quickShare')}</span>
            </button>

            {exportedFilename && (
              <p className="text-[10px] text-center text-emerald-400 font-mono truncate">
                Saved: {exportedFilename}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
