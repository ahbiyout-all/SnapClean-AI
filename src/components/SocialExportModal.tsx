import React from 'react';
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
  Maximize2
} from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface SocialExportModalProps {
  photo: any;
  onClose: () => void;
}

type AspectRatio = '9:16' | '1:1' | '4:5' | 'original';

export const SocialExportModal = ({ photo, onClose }: SocialExportModalProps) => {
  const { t } = useTranslation();
  const [ratio, setRatio] = React.useState<AspectRatio>('9:16');
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);

  const previewUrl = photo.thumbnailUrl || photo.path;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsDone(true);
      setTimeout(() => setIsDone(false), 2000);
    }, 1500);
  };

  const aspectClasses = {
    '9:16': 'aspect-[9/16] h-full',
    '1:1': 'aspect-square w-full',
    '4:5': 'aspect-[4/5] h-full',
    'original': 'aspect-auto'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
    >
      <div className="relative w-full max-w-5xl h-[85vh] flex flex-col md:flex-row gap-8 bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
        {/* Left: Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative p-12 overflow-hidden">
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
           
           <motion.div 
             layout
             className={`relative bg-slate-800 shadow-2xl overflow-hidden transition-all duration-500 rounded-lg ${aspectClasses[ratio]}`}
           >
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  alt="Export Preview"
                />
              )}
              
              {/* Intelligent Crop Overlay */}
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
                 <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                    {Array.from({ length: 9 }).map((_, i) => (
                       <div key={`${'cell'}-${i}`} className="border border-white/50" />
                    ))}
                 </div>
              </div>

              {/* AI Auto-Reframe Label */}
              <div className="absolute top-4 left-4 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-sm uppercase tracking-widest shadow-lg flex items-center gap-1">
                 <Zap size={10} /> {t('aiAutoReframe')}
              </div>
           </motion.div>

           {/* Exporting Overlay */}
           <AnimatePresence>
              {isExporting && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-blue-600/20 backdrop-blur-md flex flex-col items-center justify-center z-20"
                 >
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                    <span className="text-white font-black uppercase tracking-widest text-xs">{isDone ? t('completed') : t('optimizingForSocial')}</span>
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Right: Controls Area */}
        <div className="w-full md:w-[320px] p-8 md:p-12 flex flex-col gap-8 bg-slate-900/50">
           <div className="flex justify-between items-start">
              <div>
                 <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{ratio === '9:16' ? t('storyReel') : ratio === '1:1' ? t('squarePost') : t('portraitOrientation')}</h2>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{t('socialSystemExport')}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                 <X size={24} />
              </button>
           </div>

           <div className="space-y-6">
              <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">{t('selectOutputTarget')}</label>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                       { id: '9:16', label: t('storyTikTok'), icon: Smartphone, color: 'hover:border-pink-500 hover:text-pink-500' },
                       { id: '1:1', label: t('instagramPost'), icon: Square, color: 'hover:border-orange-500 hover:text-orange-500' },
                       { id: '4:5', label: t('portraitOrientation'), icon: Instagram, color: 'hover:border-blue-500 hover:text-blue-500' },
                       { id: 'original', label: t('native'), icon: Maximize2, color: 'hover:border-emerald-500 hover:text-emerald-500' }
                    ].map((item, idx) => (
                       <button
                         key={`${item.id}-${idx}`}
                         onClick={() => setRatio(item.id as AspectRatio)}
                         className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 group ${ratio === item.id ? 'bg-white text-black border-white' : 'glass border-white/5 text-slate-400 ' + item.color}`}
                       >
                          <item.icon size={20} />
                          <span className="text-[9px] font-black uppercase text-center">{item.label}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t('intelligentFeatures')}</label>
                 <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{t('removeWatermarks')}</span>
                       <div className="w-8 h-4 rounded-full bg-emerald-500 relative">
                          <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-white" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">{t('localAiSharpening')}</span>
                       <div className="w-8 h-4 rounded-full bg-blue-500 relative">
                          <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-white" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-auto pt-8 flex flex-col gap-3">
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 italic"
              >
                 {isDone ? <><Check size={18} /> {t('assetSaved')}</> : <><Sparkles size={18} /> {t('exportOptimized')}</>}
              </button>
              <button 
                className="w-full py-4 glass border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
              >
                 <Share2 size={18} /> {t('quickShare')}
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
