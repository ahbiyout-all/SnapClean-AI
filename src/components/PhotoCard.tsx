import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { PhotoRecord, db } from '../services/db';
import { useI18n } from '../i18n/context';
import { performOCR } from '../services/ocrService';
import { 
  Image as ImageIcon,
  AlertCircle,
  Zap,
  Sparkles,
  Users,
  ArrowRight,
  Lock,
  Trash2,
  ShieldCheck,
  Video,
  Play,
  CheckCircle2,
  FileText,
  Cpu,
  Shield,
  ScanText,
  Music,
  Volume2,
  Maximize2
} from 'lucide-react';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { SystemAPI } from '../services/systemApi';
import { Tooltip } from './Tooltip';

export interface PhotoCardProps {
  key?: React.Key | string | number;
  photo: PhotoRecord;
  isBest?: boolean;
  similarity?: number;
  selected?: boolean;
  selectionMode?: 'delete' | 'keep' | null;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, photo: PhotoRecord) => void;
  onEnhance?: (p: PhotoRecord) => void;
  onSwipe?: (direction: 'left' | 'right', photo: PhotoRecord) => void;
  addNotification?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onDoubleClick?: (photo: PhotoRecord) => void;
  infoDensity?: 'clean' | 'compact' | 'detailed';
  preserveAspect?: boolean;
  onInspect?: (photo: PhotoRecord) => void;
}

const KeyframeAnimator = ({ keyframes, photoId }: { keyframes: string[], photoId: string | number | undefined }) => {
  const [index, setIndex] = React.useState(0);
  const fallbackId = React.useId();
  const stableId = photoId || fallbackId;

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % keyframes.length);
    }, 800);
    return () => clearInterval(timer);
  }, [keyframes]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
       <div className="text-white/20 text-[10px] font-black uppercase tracking-tighter text-center px-4">
          Visualizing Forensic Chunk {index + 1}
          <div className="mt-1 flex justify-center gap-1">
             {keyframes.map((_, i) => (
                <div key={`${stableId}-${i}`} className={`w-1 h-1 rounded-full transition-all ${i === index ? 'bg-blue-400 w-3' : 'bg-white/10'}`} />
             ))}
          </div>
       </div>
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.1)_0%,transparent_60%)]" />
    </div>
  );
};

import { libraryManager } from '../services/PhotoLibraryManager';
import { fastViewEngine } from '../services/fastViewEngine';

export const PhotoCard: React.FC<PhotoCardProps> = ({ 
  photo, 
  isBest, 
  similarity, 
  selected, 
  selectionMode, 
  onClick, 
  onContextMenu, 
  onEnhance, 
  onSwipe,
  addNotification,
  onDoubleClick,
  infoDensity = 'compact',
  preserveAspect = false,
  onInspect,
}) => {
  const { t } = useI18n();
  const fallbackInstanceId = React.useId();
  const cardUniqueId = photo.id || photo.originalId || fallbackInstanceId;
  const [isHovered, setIsHovered] = useState(false);
  const [loadErrorCount, setLoadErrorCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [imgSrc, setImgSrc] = React.useState<string | null>(() => fastViewEngine.getInstantThumbnail(photo.path));
  const dominantColor = React.useMemo(() => fastViewEngine.getInstantDominantColor(photo.path), [photo.path]);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isMountedRef = React.useRef(true);
  const isGif = photo.path?.toLowerCase().endsWith('.gif');
  const isVideo = photo.type?.startsWith('video/') || photo.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
  const isPdf = photo.type === 'application/pdf' || photo.path?.toLowerCase().endsWith('.pdf');
  const isAudio = photo.type?.startsWith('audio/') || photo.path?.toLowerCase().match(/\.(mp3|wav|ogg|m4a|flac)$/);
  const isDocText = photo.path?.toLowerCase().match(/\.(txt|csv|json|md)$/);

  const x = useMotionValue(0);
  const controls = useAnimation();
  const rotate = useTransform(x, [-150, 0, 150], [-10, 0, 10]);
  const opacity = useTransform(x, [-150, -50, 0, 50, 150], [0.5, 1, 1, 1, 0.5]);
  const scale = useTransform(x, [-150, 0, 150], [0.9, 1, 0.9]);
  const bgOverlay = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(225, 29, 72, 0.5)', 'rgba(0, 0, 0, 0)', 'rgba(16, 185, 129, 0.5)']
  );

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      if (onSwipe) onSwipe('right', photo);
      else if (onClick) onClick(event as any);
      await controls.start({ x: 0, transition: { type: 'spring', bounce: 0.5 } });
    } else if (info.offset.x < -threshold) {
      if (onSwipe) onSwipe('left', photo);
      await controls.start({ x: 0, transition: { type: 'spring', bounce: 0.5 } });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', bounce: 0.5 } });
    }
  };

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleScanText = async () => {
    if (!photo.id) return;
    setIsScanning(true);
    try {
      const text = await performOCR(photo.path);
      await db.photos.update(photo.id, { ocrText: text });
      if (isMountedRef.current) {
        addNotification?.('OCR Success', 'Text extracted successfully and indexed.', 'success');
      }
    } catch (e) {
      console.error(e);
      if (isMountedRef.current) {
        addNotification?.('OCR Error', 'Failed to parse text from image buffer.', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  React.useEffect(() => {
    let active = true;
    let localBlobUrl: string | null = null;
    let observer: IntersectionObserver | null = null;

    const loadThumb = () => {
      if (isPdf || isAudio || isDocText) return; // Prevent loading thumbnails for documents or audio tracks
      
      // Check if already in FastView L1 Cache
      const instant = fastViewEngine.getInstantThumbnail(photo.path);
      if (instant) {
        if (active && isMountedRef.current) setImgSrc(instant);
        return;
      }

      fastViewEngine.getFastThumbnail(photo)
        .then((res) => {
          if (active && res.url && isMountedRef.current) {
            setImgSrc(res.url);
          }
        })
        .catch(() => {
          if (photo.path && active && isMountedRef.current) {
            SystemAPI.getThumbnailData(photo.path).then(url => {
              if (active && url && isMountedRef.current) setImgSrc(url);
            }).catch(() => {
              if (active && isMountedRef.current) setImgSrc(null);
            });
          }
        });
    };

    let timeoutId: any = null;

    if (cardRef.current) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (isMountedRef.current) {
          setIsIntersecting(entry.isIntersecting);
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (entry.isIntersecting) {
          // Ultra-fast 30ms entry for snappy 60fps scrolling
          timeoutId = setTimeout(() => {
            if (active && isMountedRef.current) {
              loadThumb();
            }
          }, 30);
        }
      }, { rootMargin: '450px' });
      observer.observe(cardRef.current);
    }

    return () => { 
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [photo.path, photo.thumbnail, photo.blob]);

  const handleShowInExplorer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const data = await SystemAPI.getProtocol('reveal', photo.path);
      console.log('Native Protocol Bridge:', data.uri);
      addNotification?.('Protocol Bridge', `System revealing target: ${photo.path}`, 'info');
    } catch (err) {
      console.error('Protocol bridge failed');
    }
  };

  return (
    <motion.div 
      ref={cardRef}
      style={isIntersecting ? { x, rotate, opacity, scale } : undefined}
      animate={isIntersecting ? controls : undefined}
      drag={isIntersecting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e: any) => {
        if (onContextMenu && isIntersecting) {
          e.preventDefault();
          fastViewEngine.triggerHaptic('medium');
          onContextMenu(e, photo);
        }
      }}
      onClick={(e: any) => {
        fastViewEngine.triggerHaptic('light');
        onClick?.(e as any);
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        fastViewEngine.triggerHaptic('heavy');
        if (onDoubleClick) {
          onDoubleClick(photo);
        } else {
          SystemAPI.openInDefaultApp(photo, addNotification);
        }
      }}
      className={`relative group ${preserveAspect ? 'aspect-auto min-h-[160px]' : 'aspect-square'} rounded-2xl overflow-hidden border-2 transition-all cursor-pointer photo-card cv-card gpu-accelerated touch-pan-y ${
        selected ? 'border-blue-500 photo-card-selected' : selectionMode === 'delete' ? 'border-rose-500/80 saturate-50 opacity-80 scale-95 photo-card-delete' : selectionMode === 'keep' ? 'border-emerald-500 scale-105 shadow-xl shadow-emerald-500/20 z-10 photo-card-keep' : isBest ? 'border-emerald-500/50' : photo.blurScore !== undefined && photo.blurScore < 0.3 ? 'border-rose-500/40 opacity-90' : 'border-white/5 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Universal Placeholder / Loading State */}
      <div 
        style={{ backgroundColor: dominantColor }}
        className={`absolute inset-0 border border-white/5 flex flex-col items-center justify-center p-4 transition-opacity duration-300 pointer-events-none ${imgSrc ? 'opacity-0' : 'opacity-95'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        <ImageIcon className={`text-white/40 mb-1 ${!imgSrc ? 'animate-pulse' : ''}`} size={32} />
        <span className="text-[10px] font-black text-white/80 uppercase tracking-tighter mb-1 relative z-10">
          {photo.path.startsWith('/web-local/') ? t('localAsset') : 'FastView Stream'}
        </span>
        <span className="text-[8px] font-mono text-white/50 select-none uppercase tracking-widest truncate max-w-full relative z-10">
          {photo.path.split('/').pop()}
        </span>
      </div>

      {isIntersecting && (
        <>
          {/* Main Visual content */}
          <div className={`absolute inset-0 bg-slate-800 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${imgSrc ? 'opacity-0' : 'opacity-100'}`}>
            {isVideo ? <Video className="text-slate-700" size={40} /> : <ImageIcon className="text-slate-700" size={40} />}
          </div>
          
          {/* Swipe Feedback Overlay */}
          <motion.div style={{ backgroundColor: bgOverlay }} className="absolute inset-0 z-[1] pointer-events-none" />

      {/* Quality & Status Badges */}
      {(infoDensity !== 'clean' || isHovered) && (
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20 transition-opacity duration-200">
          {infoDensity === 'compact' ? (
            <>
              {photo.status === 'missing' && (
                <span className="flex items-center gap-1 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter">
                  <AlertCircle size={8} /> {t('missing')}
                </span>
              )}
              {isBest && (
                <span className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 w-fit shadow-lg uppercase tracking-tighter">
                  <Zap size={8} className="fill-white" /> {t('best')}
                </span>
              )}
              {isVideo && (
                <span className="bg-sky-600/90 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1">
                  <Video size={8} /> VIDEO
                </span>
              )}
              <div className="flex items-center gap-1">
                {photo.width && photo.height && (
                  <span className="bg-black/60 backdrop-blur-sm text-white text-[8px] font-mono px-1.5 py-0.5 rounded-sm">
                    {photo.width >= 3840 ? '4K' : photo.width >= 1920 ? 'FHD' : `${photo.width}x${photo.height}`}
                  </span>
                )}
                <span className="bg-black/60 backdrop-blur-sm text-white text-[8px] font-mono px-1.5 py-0.5 rounded-sm">
                  {(photo.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
            </>
          ) : (
            <>
              {photo.status === 'missing' && (
                <span className="flex items-center gap-1 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter">
                  <AlertCircle size={8} /> {t('missing')}
                </span>
              )}
              {loadErrorCount > 0 && (
                 <span className="flex items-center gap-1 bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter">
                  <AlertCircle size={8} /> Retrying...
                </span>
              )}
              {photo.qualityTags?.map((tag, i) => (
                <span key={`${cardUniqueId}-${tag}-${i}`} className="bg-slate-900/80 backdrop-blur-sm text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-tighter">
                  {tag}
                </span>
              ))}
              {isBest && (
                <span className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 w-fit shadow-lg uppercase tracking-tighter">
                  <Zap size={8} className="fill-white" /> {t('best')}
                </span>
              )}
              {photo.isEnhanced && (
                <span className="bg-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 w-fit shadow-lg uppercase tracking-tighter">
                  <Sparkles size={8} className="fill-white" /> {photo.enhancementType}
                </span>
              )}
              {similarity !== undefined && similarity < 100 && (
                <span className="bg-indigo-600/90 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-tighter">
                  {similarity}% Similar
                </span>
              )}
              {photo.aestheticScore !== undefined && (
                <span className="bg-blue-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm w-fit border border-white/10">
                  {t('score')}: {photo.aestheticScore.toFixed(1)}/10
                </span>
              )}
              {photo.blurScore !== undefined && (
                <span className={`backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm w-fit border border-white/10 ${photo.blurScore < 0.3 ? 'bg-rose-500/90' : 'bg-slate-800/80'}`}>
                  Blur: {photo.blurScore.toFixed(2)}
                </span>
              )}
              {photo.blurScore !== undefined && photo.blurScore < 0.3 && (
                <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter flex items-center gap-1">
                  <AlertCircle size={8} /> {t('blurryAsset')}
                </span>
              )}
              {photo.category && (
                <span className="bg-indigo-500/80 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm w-fit uppercase">
                  {getLocalizedCategory(photo.category, t)}
                </span>
              )}
              {photo.detectedFaces !== undefined && photo.detectedFaces > 0 && (
                <span className="bg-pink-500/80 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1">
                  <Users size={8} /> {photo.detectedFaces}
                </span>
              )}
              {isGif && (
                <span className="bg-fuchsia-600/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1 border border-fuchsia-400/30 shadow-lg">
                  GIF {photo.frameCount ? `(${photo.frameCount}F)` : ''}
                </span>
              )}
              {isVideo && (
                <span className="bg-sky-600/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1 border border-sky-400/30 shadow-lg">
                  <Video size={8} /> VIDEO {photo.durationMs ? `(${Math.round(photo.durationMs/1000)}s)` : ''}
                </span>
              )}
              {isPdf && (
                <span className="bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1 border border-red-400/30 shadow-lg">
                  <FileText size={8} /> DOCUMENT
                </span>
              )}
              {isAudio && (
                <span className="bg-fuchsia-600/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1 border border-fuchsia-400/30 shadow-lg">
                  <Music size={8} /> AUDIO
                </span>
              )}
              {isDocText && (
                <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm w-fit uppercase flex items-center gap-1 border border-emerald-400/30 shadow-lg">
                  <FileText size={8} /> {photo.path?.split('.').pop()?.toUpperCase()}
                </span>
              )}
              <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded-sm">
                {(photo.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </>
          )}
        </div>
      )}

          {!isPdf && !isAudio && !isDocText && imgSrc && (
            <img 
              src={imgSrc} 
              alt="Preview" 
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${isGif && isHovered ? 'opacity-0' : 'opacity-100'}`}
              onLoad={(e) => {
                (e.target as HTMLImageElement).style.opacity = '1';
                setLoadErrorCount(0);
              }}
              style={{ opacity: 0 }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                setLoadErrorCount(prev => prev + 1);
                
                if (loadErrorCount < 2) {
                   // Refresh the URL from bridge - it might have been revoked or expired
                   // For web-local files, we specifically force a renew of the blob URL
                   const forceRenew = photo.path.startsWith('/web-local/');
                   const newUrl = SystemAPI.getImageUrl(photo.path, 'full', forceRenew);
                   if (newUrl && newUrl !== target.src) {
                     target.src = newUrl;
                     return;
                   }
                }
                console.debug('[PhotoCard] Image display fallback:', photo.path);
                target.style.display = 'none';
                setImgSrc(null);
              }}
            />
          )}

          {!isPdf && !isAudio && !isDocText && isGif && isHovered && SystemAPI.getImageUrl(photo.path, 'full') && (
            <img 
              src={SystemAPI.getImageUrl(photo.path, 'full')!} 
              alt="GIF Preview" 
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-100 transition-opacity duration-300"
            />
          )}
      
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none group-hover:opacity-0 transition-opacity">
           <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-2xl">
              <Play size={20} className="fill-white text-white ml-0.5" />
           </div>
        </div>
      )}

      {isPdf && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900 border border-white/10 group-hover:bg-slate-800 transition-colors">
           <FileText size={48} className="text-white/20 mb-2" />
           {photo.ocrText && (
             <div className="px-4 text-center">
               <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">OCR Extract Content</span>
               <p className="text-[10px] text-slate-300 font-mono line-clamp-3 leading-relaxed">
                 {photo.ocrText}
               </p>
             </div>
           )}
        </div>
      )}

      {isAudio && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950 border border-white/10 group-hover:bg-slate-900 transition-colors p-4">
           <Volume2 size={40} className="text-fuchsia-400 mb-2" />
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Audio File</p>
           <p className="text-[11px] text-white font-mono font-medium truncate max-w-full text-center px-2">
             {photo.path.split('/').pop()}
           </p>
        </div>
      )}

      {isDocText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900 border border-white/10 group-hover:bg-slate-850 transition-colors p-4">
           <FileText size={40} className="text-emerald-400 mb-2" />
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Text File</p>
           <p className="text-[11px] text-white font-mono font-medium truncate max-w-full text-center px-2 mb-2">
             {photo.path.split('/').pop()}
           </p>
           {photo.ocrText && (
             <p className="text-[8px] text-slate-400 font-mono line-clamp-3 leading-relaxed text-center px-2 max-w-full bg-black/30 p-1.5 rounded border border-white/5">
               {photo.ocrText}
             </p>
           )}
        </div>
      )}

      {/* Phase 32.1: Video Keyframe Filmstrip */}
      {isVideo && photo.videoKeyframes && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-slate-950">
           <div className="h-full w-full flex flex-col">
              <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
                 {/* Forensic Grid Overlay */}
                 <div className="absolute inset-0 z-10 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                 <KeyframeAnimator keyframes={photo.videoKeyframes} photoId={photo.id || photo.originalId} />
              </div>
              <div className="h-12 bg-slate-900/90 backdrop-blur-md border-t border-white/5 flex gap-1 p-1">
                 {photo.videoKeyframes.map((kf, vidx) => (
                    <div 
                      key={`${cardUniqueId}-${vidx}-${vidx}`} 
                      className="flex-1 bg-white/5 rounded-sm overflow-hidden relative group/kf cursor-pointer border border-transparent hover:border-blue-500/50 transition-all"
                      onMouseEnter={() => {
                        // Expansion: In a real app we'd pause the main animator and show THIS kf
                      }}
                    >
                       <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500/30" />
                       <div className="absolute inset-0 flex items-center justify-center text-[7px] text-white/40 font-mono font-black italic">
                          FRAME_{vidx + 1}
                       </div>
                       <div className="absolute inset-0 bg-blue-500/0 group-hover/kf:bg-blue-500/10 transition-all" />
                    </div>
                 ))}
              </div>
           </div>
           <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              <div className="bg-sky-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-lg flex items-center gap-1 border border-sky-400/30">
                 <Sparkles size={8} /> FORENSIC_INDEX
              </div>
              <div className="bg-slate-900/80 text-slate-400 text-[6px] font-mono px-1 rounded uppercase">
                 Source: {photo.codec || 'TRANSCODED'} / {Math.round(photo.durationMs || 0 / 1000)}s
              </div>
           </div>
        </div>
      )}
      
      {/* Selection Overlay */}
      {selected && (
        <div className="absolute inset-0 bg-blue-500/20 z-10 pointer-events-none border-4 border-blue-500 rounded-2xl flex items-start justify-end p-2">
           <div className="bg-blue-500 rounded-full shadow-lg">
              <CheckCircle2 size={24} className="text-white bg-blue-500 rounded-full" />
           </div>
        </div>
      )}
      {selectionMode === 'delete' && (
        <div className="absolute inset-x-0 bottom-0 bg-rose-900/80 backdrop-blur-sm p-1.5 z-10 flex items-center justify-center gap-1.5 border-t border-rose-500/50">
           <Trash2 size={12} className="text-white" />
           <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('deleteAction')}</span>
        </div>
      )}
      {selectionMode === 'keep' && (
        <div className="absolute inset-x-0 bottom-0 bg-emerald-900/80 backdrop-blur-sm p-1.5 z-10 flex items-center justify-center gap-1.5 border-t border-emerald-500/50">
           <ShieldCheck size={12} className="text-white" />
           <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('keepAction')}</span>
        </div>
      )}

      {/* Hover Metadata Tooltip (Phase 16-inspired) */}
      {isHovered && (
        <div className="absolute inset-0 opacity-100 transition-all duration-500 z-30 pointer-events-none group-hover:backdrop-blur-[2px]">
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent" />
          
          {/* Top Data Bar */}
          <div className="absolute top-0 inset-x-0 p-3 flex justify-between items-start translate-y-0 transition-transform duration-500">
             <div className="flex flex-col gap-1">
                <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/5 text-[7px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 w-fit">
                   <Cpu size={8} /> PROC_STABLE
                </div>
                {photo.cameraModel && (
                  <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/5 text-[7px] font-mono text-slate-300 uppercase w-fit">
                     {photo.cameraModel}
                  </div>
                )}
             </div>
             
             <div className="flex flex-col items-end gap-1">
                <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/5 text-[7px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 border-rose-500/30">
                   <Shield size={8} /> {photo.category?.toUpperCase() || 'GENERAL'}
                </div>
                <div className="text-[6px] font-mono text-slate-500 bg-black/40 px-1 rounded">
                   {photo.id || 'TEMP_ID'}
                </div>
             </div>
          </div>

          {/* Center Aesthetic Meter */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="relative w-24 h-24 flex items-center justify-center scale-100 transition-all duration-700">
                <div className="absolute inset-0 border border-blue-500/20 rounded-full animate-spin-slow" />
                <div className="absolute inset-2 border border-blue-500/10 rounded-full animate-reverse-spin" />
                <div className="flex flex-col items-center">
                   <span className="text-[7px] font-black text-blue-400 uppercase mb-0.5 tracking-widest">AESTHETIC</span>
                   <span className="text-2xl font-mono font-black text-white leading-none tracking-tighter">{Math.round((photo.aestheticScore || 5.5) * 10)}</span>
                   <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(dotIdx => (
                         <div key={`${cardUniqueId}-${dotIdx}`} className={`w-1 h-1 rounded-full ${dotIdx <= (photo.aestheticScore || 5) / 2 ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'bg-white/10'}`} />
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Bottom Forensic Bar */}
          <div className="absolute bottom-0 inset-x-0 p-3 translate-y-0 transition-transform duration-500 pointer-events-auto">
             <div className="space-y-2">
                <div className="flex justify-between items-end border-b border-white/10 pb-1 mb-1">
                   <div className="text-[10px] font-bold text-white truncate max-w-[80%] drop-shadow-xl flex items-center gap-2">
                      <FileText size={10} className="text-slate-500" />
                      {photo.path.split('/').pop()}
                   </div>
                   <div className="text-[7px] font-mono text-slate-400">
                      {photo.size ? `${(photo.size / (1024 * 1024)).toFixed(1)}MB` : '0.0MB'}
                   </div>
                </div>
                
                <div className="flex justify-between items-center">
                   <div className="flex gap-1 overflow-hidden">
                      <span className="text-[6px] font-black px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-sm uppercase tracking-tighter border border-blue-500/30">
                         {photo.width}x{photo.height}
                      </span>
                      <span className="text-[6px] font-black px-1.5 py-0.5 bg-white/10 text-white/50 rounded-sm uppercase tracking-tighter">
                         {photo.type?.split('/')[1]?.toUpperCase() || 'DATA'}
                      </span>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleScanText(); }}
                     disabled={isScanning}
                     className={`flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 text-[7px] font-black text-white uppercase tracking-widest rounded transition-all border border-white/5 ${isScanning ? 'opacity-50' : ''}`}
                   >
                      {isScanning ? 'SCANNING...' : 'SCAN TEXT'} <ScanText size={8} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleShowInExplorer(e); }}
                     className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 text-[7px] font-black text-white uppercase tracking-widest rounded transition-all border border-white/5"
                   >
                      REVEAL <ArrowRight size={8} className="-rotate-45" />
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}



      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/90 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-between gap-1">
        <p className="text-[9px] text-white/70 truncate flex-1" title={photo.path}>{photo.path}</p>
        {onInspect && (
          <Tooltip
            title={t('inspectPhoto') || '정밀 분석'}
            content="전체화면에서 줌인, 상세 EXIF 메타데이터 및 비교 뷰어를 엽니다."
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onInspect(photo); }}
              className="p-1.5 hover:bg-white/20 bg-white/10 rounded-lg text-emerald-400 transition-colors shrink-0 cursor-pointer"
            >
              <Maximize2 size={13} />
            </button>
          </Tooltip>
        )}
        <Tooltip
          title={t('openInNativeExplorer') || '탐색기에서 열기'}
          content="Windows 파일 탐색기에서 해당 파일의 저장 위치를 엽니다."
        >
          <button 
            onClick={handleShowInExplorer}
            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors shrink-0 cursor-pointer"
          >
            <ArrowRight size={14} className="-rotate-45" />
          </button>
        </Tooltip>
      </div>
      {onEnhance && !photo.isEnhanced && (
        <Tooltip
          title={t('aiEnhance') || 'AI 화질 개선'}
          content="AI 신경망을 통해 초해상도 업스케일링 및 조명/색감을 자동 보정합니다."
        >
          <button 
            onClick={(e) => { e.stopPropagation(); onEnhance(photo); }}
            className="absolute bottom-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all z-30 cursor-pointer"
          >
            <Sparkles size={14} />
          </button>
        </Tooltip>
      )}
      </>
      )}
    </motion.div>
  );
};
