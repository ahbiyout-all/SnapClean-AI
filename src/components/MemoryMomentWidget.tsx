import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Sparkles, 
  ChevronRight, 
  Share2, 
  Heart,
  Calendar,
  Zap,
  FileText
} from 'lucide-react';
import { PhotoRecord } from '../services/db';
import { useTranslation } from '../i18n/context';
import { SystemAPI } from '../services/systemApi';
import { libraryManager } from '../services/PhotoLibraryManager';

interface MemoryMomentWidgetProps {
  photo: PhotoRecord;
  onClick: (id: number) => void;
}

export const MemoryMomentWidget = ({ photo, onClick }: MemoryMomentWidgetProps) => {
  const { t } = useTranslation();
  
  const isPdf = photo.type === 'application/pdf' || photo.path?.toLowerCase().endsWith('.pdf');
  
  const imageUrl = (() => {
    if (isPdf) return null;
    const fullUrl = SystemAPI.getImageUrl(photo.path, 'full');
    if (fullUrl) return fullUrl;
    if (photo.thumbnail && photo.thumbnail.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () => URL.createObjectURL(photo.thumbnail!));
    }
    if (photo.blob && photo.blob.size > 0) {
      return libraryManager.getBlobUrl(photo.path, () => URL.createObjectURL(photo.blob!));
    }
    return null;
  })();

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={() => photo.id && onClick(photo.id)}
      className="relative w-full h-[300px] rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/10 memory-moment-clickable"
    >
      {/* Background Image */}
      {imageUrl ? (
        <img 
          src={imageUrl} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          alt="Memory Reveal"
        />
      ) : isPdf ? (
        <div className="absolute inset-0 bg-slate-900 border border-white/10 flex flex-col items-center justify-center p-6 text-center">
           <FileText size={48} className="text-red-500 mb-2 animate-pulse" />
           <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">DOCUMENT</span>
           <span className="text-[10px] text-slate-500 max-w-xs block mt-1 line-clamp-1">{photo.path.split('/').pop()}</span>
        </div>
      ) : null}
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between">
         <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 bg-blue-600/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-blue-500/30">
               <History size={16} className="text-blue-400" />
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">{t('memoryFlashback')}</span>
            </div>
            <div className="flex gap-2">
               <button className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-colors">
                  <Heart size={18} />
               </button>
               <button className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-colors">
                  <Share2 size={18} />
               </button>
            </div>
         </div>

         <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
               <Zap size={14} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{t('forensicHighlightQuality')}: 9.8</span>
            </div>
            
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
                  <Calendar size={12} />
                  {new Date(photo.dateTaken || photo.lastModified).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
               </div>
               <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                  {photo.category || "Captured Moment"}
               </h2>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
               <div className="flex items-center gap-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                     <Sparkles size={10} className="text-blue-400" />
                     {photo.locationName || "Location Preserved"}
                  </div>
               </div>
               <div className="flex items-center gap-1 text-white group-hover:text-blue-400 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('viewMaster')}</span>
                  <ChevronRight size={16} />
               </div>
            </div>
         </div>
      </div>

      {/* Aesthetic Scanline */}
      <div className="absolute inset-x-0 h-[2px] bg-blue-500/30 blur-sm top-0 animate-[scan_4s_linear_infinite]" />
    </motion.div>
  );
};
