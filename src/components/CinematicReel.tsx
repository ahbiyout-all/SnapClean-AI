import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Music, 
  Volume2, 
  VolumeX, 
  Share2, 
  Download,
  Sparkles,
  Camera,
  Heart,
  Mic,
  FileText
} from 'lucide-react';
import { SystemAPI } from '../services/systemApi';
import { libraryManager } from '../services/PhotoLibraryManager';
import { useTranslation } from '../i18n/context';

interface CinematicReelProps {
  event: any;
  photos: any[];
  onClose: () => void;
}

export const CinematicReel: React.FC<CinematicReelProps> = ({ event, photos, onClose }) => {
  const { t } = useTranslation();
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isNarrating, setIsNarrating] = React.useState(false);

  const reelPhotos = photos.slice(0, 10); // Max 10 photos for the reel

  React.useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % reelPhotos.length);
    }, 4000); // 4 seconds per slide

    return () => clearInterval(interval);
  }, [reelPhotos.length, isPlaying]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-[450px] aspect-[9/16] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)] border border-white/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${reelPhotos[currentIdx]?.originalId || currentIdx}-${currentIdx}`}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Background Image (Blurred) */}
            <div className="absolute inset-0 saturate-200 blur-3xl opacity-30 bg-slate-800" />
            
            {/* Main Image */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
               <div className="w-full h-full rounded-2xl bg-white/5 flex items-center justify-center relative overflow-hidden">
                  {(() => {
                    const currentPhoto = reelPhotos[currentIdx];
                    if (!currentPhoto) return null;

                    const isPdf = currentPhoto.type === 'application/pdf' || currentPhoto.path?.toLowerCase().endsWith('.pdf');
                    if (isPdf) {
                      return (
                        <div className="flex flex-col items-center justify-center p-6 text-center absolute inset-0 bg-slate-950">
                          <FileText size={64} className="text-red-500 mb-4 animate-pulse" />
                          <span className="text-sm font-black text-slate-300 uppercase tracking-widest block mb-2">DOCUMENT (PDF)</span>
                          <span className="text-xs text-slate-500 max-w-xs block truncate">{currentPhoto.path.split('/').pop()}</span>
                        </div>
                      );
                    }

                    const fullUrl = SystemAPI.getImageUrl(currentPhoto.path, 'full');
                    const thumbUrl = (currentPhoto.thumbnail && currentPhoto.thumbnail.size > 0)
                      ? libraryManager.getBlobUrl(currentPhoto.path, () => URL.createObjectURL(currentPhoto.thumbnail!))
                      : (currentPhoto.blob && currentPhoto.blob.size > 0)
                      ? libraryManager.getBlobUrl(currentPhoto.path, () => URL.createObjectURL(currentPhoto.blob!))
                      : null;
                    const finalUrl = fullUrl || thumbUrl;

                    return finalUrl && (
                      <img 
                        src={finalUrl} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        alt=""
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/60" />
               </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Narrative Overlay */}
        <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
           <div className="flex justify-between items-center pointer-events-auto">
              <div className="flex gap-1.5 flex-1">
                 {reelPhotos.map((_, i) => (
                    <div key={`${event.id}-${i}`} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: i < currentIdx ? '100%' : i === currentIdx ? '100%' : '0%' }}
                         transition={{ duration: i === currentIdx ? 4 : 0.3, ease: 'linear' }}
                         className="h-full bg-blue-500"
                       />
                    </div>
                 ))}
              </div>
              <button 
                onClick={onClose}
                className="ml-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white"
              >
                 <X size={20} />
              </button>
           </div>

           <div className="space-y-6 pointer-events-auto">
              {/* AI Narration Visualizer */}
              {isNarrating && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="flex items-center gap-4 bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 p-4 rounded-2xl"
                 >
                    <div className="flex gap-1 items-end h-4">
                       {[1,2,3,4,5,6].map(i => (
                          <motion.div 
                             key={`${i}-${i}`}
                             animate={{ height: [4, 16, 8, 12, 4] }}
                             transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                             className="w-1 bg-white rounded-full"
                          />
                       ))}
                    </div>
                    <div>
                       <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{t('aiNarratorActive')}</div>
                       <p className="text-[10px] text-white/80 font-medium italic">{t('aiNarratorDemoText')}</p>
                    </div>
                 </motion.div>
              )}

              <motion.div 
                key={`${event.id}-${currentIdx}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-2"
              >
                 <div className="flex items-center gap-2 text-blue-400">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{t('cinematicMoment')}</span>
                 </div>
                 <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                    {event.title}
                 </h2>
                 <p className="text-sm text-white/80 leading-relaxed italic drop-shadow-lg">
                    {event.summary}
                 </p>
              </motion.div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white/60 hover:text-white"
                    >
                       {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <button 
                      onClick={() => setIsNarrating(!isNarrating)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isNarrating ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                    >
                       <Mic size={14} />
                       <span className="text-[10px] font-black uppercase tracking-widest italic">{t('narratorToggle')}</span>
                    </button>
                    <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/30">
                       <Music size={14} className="text-blue-400" />
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">{t('beatsToggle')}</span>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white shadow-xl transition-all">
                       <Share2 size={20} />
                    </button>
                    <button className="p-3 bg-white text-black hover:bg-blue-500 hover:text-white rounded-2xl shadow-xl transition-all">
                       <Heart size={20} />
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Sentiment Analysis Watermark */}
        <div className="absolute top-1/2 -right-12 rotate-90 flex items-center gap-2 opacity-20 select-none">
           <span className="text-[10px] font-black text-white uppercase tracking-[0.5em]">{t('sentimentPositive')}</span>
           <div className="w-12 h-[1px] bg-white" />
        </div>
      </div>
    </motion.div>
  );
};
