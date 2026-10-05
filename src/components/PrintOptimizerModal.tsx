import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Check, Contrast, Focus, Layers, Printer, Sparkles, Sun, X, Zap } from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface PrintOptimizerModalProps {
  photo: any;
  onClose: () => void;
}

export const PrintOptimizerModal: React.FC<PrintOptimizerModalProps> = ({ photo, onClose }) => {
  const { t } = useTranslation();
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState('natural');

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setIsDone(true);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-4xl h-[80vh] flex flex-col md:flex-row gap-8 bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
        {/* Comparison Viewer */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center relative p-8">
           <div className="absolute top-6 left-6 z-10 flex gap-2">
              <div className="px-3 py-1 bg-zinc-800/80 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/5">
                 {t('rawForensic')}
              </div>
              <div className="px-3 py-1 bg-blue-600/80 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-blue-400/30">
                 {t('aestheticBoost')}
              </div>
           </div>

           <div className="w-full h-full rounded-2xl overflow-hidden relative group">
              <img 
                src={photo.thumbnailUrl || photo.path || undefined} 
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ${isDone ? 'brightness-110 saturate-125 contrast-110 scale-105' : ''}`}
                alt="Print Preview"
              />
              
              {/* Intelligent Grid for alignment */}
              <div className="absolute inset-0 border border-white/5 opacity-50 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '10% 10%' }} />

              {/* Scanning effect during optimization */}
              {isOptimizing && (
                 <motion.div 
                   initial={{ top: '-10%' }}
                   animate={{ top: '110%' }}
                   transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                   className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] z-10"
                 />
              )}
           </div>

           <div className="absolute bottom-6 right-6 bg-zinc-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex gap-4">
              <div className="text-center">
                 <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('sharpening')}</div>
                 <div className="text-xs font-bold text-emerald-400">92%</div>
              </div>
              <div className="w-[1px] bg-white/10" />
              <div className="text-center">
                 <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('denoise')}</div>
                 <div className="text-xs font-bold text-blue-400">84%</div>
              </div>
           </div>
        </div>

        {/* Print Configuration */}
        <div className="w-full md:w-[350px] p-10 flex flex-col gap-8">
           <div className="flex justify-between items-start">
              <div className="p-4 bg-zinc-800 text-zinc-100 rounded-3xl">
                 <Printer size={32} />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 transition-colors">
                 <X size={24} />
              </button>
           </div>

           <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('aestheticPrintPrep')}</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{t('highResMasteringEngine')}</p>
           </div>

           <div className="space-y-6">
              <div>
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">{t('selectColorGrade')}</label>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                       { id: 'natural', label: t('forensicNatural'), icon: Sun },
                       { id: 'vibrant', label: t('hyperVibrant'), icon: Award },
                       { id: 'high-contrast', label: t('boldContrast'), icon: Contrast },
                       { id: 'soft', label: t('silkySoft'), icon: Layers }
                    ].map((f, idx) => (
                       <button
                         key={`${f.id}-${idx}`}
                         onClick={() => setActiveFilter(f.id)}
                         className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${activeFilter === f.id ? 'bg-white text-zinc-900 border-white' : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-zinc-500'}`}
                       >
                          <f.icon size={18} />
                          <span className="text-[9px] font-black uppercase text-center">{f.label}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">{t('aestheticAdjustments')}</label>
                 <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                       <Focus size={16} className="text-zinc-600" />
                       <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-blue-500" />
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Zap size={16} className="text-zinc-600" />
                       <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full w-1/2 bg-emerald-500" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-auto pt-8">
              <button 
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 italic"
              >
                 {isOptimizing ? t('processingStatus') : isDone ? <><Check size={20} /> {t('readyForPrint')}</> : <><Sparkles size={20} /> {t('masterForPrint')}</>}
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
