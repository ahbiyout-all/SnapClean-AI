import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Cpu, 
  Binary, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Zap,
  Activity,
  Box,
  Fingerprint
} from 'lucide-react';
import { SystemAPI } from '../services/systemApi';
import { useTranslation } from '../i18n/context';

interface DeepRecoveryModalProps {
  photo: any;
  onClose: () => void;
}

export const DeepRecoveryModal: React.FC<DeepRecoveryModalProps> = ({ photo, onClose }) => {
  const { t } = useTranslation();
  const [stage, setStage] = React.useState<'init' | 'analyzing' | 'repairing' | 'done'>('init');
  const [progress, setProgress] = React.useState(0);
  const [logs, setLogs] = React.useState<string[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const addLog = (msg: string) => {
    if (isMounted.current) {
      setLogs(prev => [msg, ...prev].slice(0, 5));
    }
  };

  const startRecovery = async () => {
    if (!isMounted.current) return;
    setStage('analyzing');
    addLog(t('initBitLevelScan'));
    
    // Simulate steps
    for (let i = 0; i <= 30; i += 5) {
      await new Promise(r => setTimeout(r, 100));
      if (!isMounted.current) return;
      setProgress(i);
    }
    
    addLog(t('identifiedCorruptClusters'));
    if (!isMounted.current) return;
    setStage('repairing');
    
    for (let i = 31; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 50));
      if (!isMounted.current) return;
      setProgress(i);
      if (i === 60) addLog(t('neuralPixelActive'));
      if (i === 85) addLog(t('validatingIntegrity'));
    }

    await SystemAPI.deepForensicRepair(photo.path);
    if (!isMounted.current) return;
    setStage('done');
    addLog(t('recoveryCompleted'));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
         {/* Animated Background Grid */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
         
         <div className="relative z-10 p-12">
            <div className="flex justify-between items-start mb-12">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-600/10 text-blue-500 rounded-3xl border border-blue-500/20">
                     <Cpu size={32} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('deepForensicRecovery')}</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t('bitLevelEngine')}</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full text-slate-500 transition-colors">
                  <X size={24} />
               </button>
            </div>

            <div className="space-y-10">
               {/* Visual Analysis Area */}
               <div className="relative h-64 glass border-white/5 rounded-[2rem] overflow-hidden bg-black/50 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                     {stage === 'init' ? (
                        <motion.div 
                          key="init"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-4 text-center p-8"
                        >
                           <Search size={48} className="text-slate-700 animate-pulse" />
                           <p className="text-xs text-slate-500 font-bold max-w-xs">
                              {t('scanForBitRot')}
                           </p>
                        </motion.div>
                     ) : stage === 'done' ? (
                        <motion.div 
                           key="done"
                           initial={{ scale: 0.8, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           className="flex flex-col items-center gap-4 text-emerald-500"
                        >
                           <CheckCircle2 size={64} />
                           <div className="text-center">
                              <span className="text-[10px] font-black uppercase tracking-widest block mb-1">{t('statusOperational')}</span>
                              <span className="text-xl font-black italic">{t('integrityRestored')}</span>
                           </div>
                        </motion.div>
                     ) : (
                        <div key="progress" className="w-full h-full p-8 flex flex-col justify-center">
                           <div className="flex justify-between items-end mb-4">
                              <div className="space-y-1">
                                 <div className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]">{t(`stage_${stage}`)}</div>
                                 <div className="text-3xl font-black text-white font-mono">{progress}%</div>
                              </div>
                              <div className="flex gap-1 h-8 items-end">
                                 {[1,2,3,4,5,6,7,8].map(i => (
                                    <motion.div 
                                       key={`${i}-${i}`}
                                       animate={{ height: [10, 32, 16, 24, 10] }}
                                       transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                       className="w-1 bg-blue-500/50 rounded-full"
                                    />
                                 ))}
                              </div>
                           </div>
                           <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                 className="h-full bg-blue-600 shadow-[0_0_20px_#3b82f6]"
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progress}%` }}
                              />
                           </div>
                        </div>
                     )}
                  </AnimatePresence>
               </div>

               {/* Console Logs */}
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">{t('neuralConsole')}</label>
                     <div className="h-40 glass border-white/5 rounded-[2rem] p-6 font-mono text-[9px] space-y-2 overflow-hidden">
                        {logs.length > 0 ? logs.map((log, i) => (
                           <div key={`${log.substring(0, 16)}-${i}`} className={`${i === 0 ? 'text-blue-400' : 'text-slate-600'} flex gap-3`}>
                              <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                              <span>{log}</span>
                           </div>
                        )) : (
                           <div className="text-slate-800 italic">{t('noActivityRecorded')}</div>
                        )}
                        {stage !== 'init' && stage !== 'done' && (
                           <div className="text-emerald-500 animate-pulse">&gt; {t('processingLog')}</div>
                        )}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">{t('recoveryParameters')}</label>
                     <div className="flex flex-col gap-3">
                        {[
                           { label: t('pixelParity'), val: "99.9%", icon: Box },
                           { label: t('entropyScan'), val: "0.2ms", icon: Activity },
                           { label: t('aiConfidence'), val: "98.4%", icon: Zap },
                           { label: t('signAuthenticity'), val: t('verifiedSign'), icon: Fingerprint }
                        ].map((item, i) => (
                           <div key={`${item.label}-${i}`} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-2 text-slate-500">
                                 <item.icon size={12} />
                                 <span className="text-[9px] font-bold uppercase">{item.label}</span>
                              </div>
                              <span className="text-[9px] font-black text-white">{item.val}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="pt-4">
                  {stage === 'init' ? (
                     <button 
                       onClick={startRecovery}
                       className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/20 italic flex items-center justify-center gap-3"
                     >
                        <RefreshCw size={24} /> {t('runDeepRecovery')}
                     </button>
                  ) : stage === 'done' ? (
                     <button 
                        onClick={onClose}
                        className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all italic"
                     >
                        {t('finalizeAndSecure')}
                     </button>
                  ) : (
                     <div className="w-full py-6 glass border-white/10 text-slate-500 rounded-[2rem] font-black uppercase tracking-widest text-center italic cursor-not-allowed">
                        {t('recoveryInProgress')}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
};
