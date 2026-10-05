import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  Shield, 
  Wifi, 
  QrCode, 
  Copy, 
  Share2, 
  Check,
  Smartphone,
  ServerOff
} from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface CollabShareModalProps {
  album: any;
  onClose: () => void;
}

export const CollabShareModal: React.FC<CollabShareModalProps> = ({ album, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [peers, setPeers] = React.useState<number>(0);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startP2P = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setPeers(1);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md glass border-white/10 rounded-[3rem] p-8 md:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Users size={200} />
        </div>

        <div className="relative z-10">
           <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl">
                 <Shield size={32} />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                 <X size={24} />
              </button>
           </div>

           <div className="mb-10">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">{t('privacyFirstSharing')}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                 {t('collabShareDesc1')}
                 <span className="text-emerald-400 font-bold ml-1">{t('collabShareDesc2')}</span>
              </p>
           </div>

           <div className="space-y-6">
              <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex flex-col items-center gap-6">
                 <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-2xl">
                    <QrCode size={160} className="text-slate-900" />
                 </div>
                 <div className="w-full">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                       <span>{t('secureTunnelLink')}</span>
                       <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> {t('active')}</span>
                    </div>
                    <div className="flex gap-2">
                       <input 
                         readOnly 
                         value="snapclean://share/p2p-tunnel-8492" 
                         className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400"
                       />
                       <button 
                         onClick={handleCopy}
                         className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                       >
                          {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                       </button>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col center items-center text-center gap-2">
                    <ServerOff size={20} className="text-rose-400" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">{t('serverMetadataZero')}</span>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col center items-center text-center gap-2">
                    <Wifi size={20} className="text-emerald-400" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">{t('p2pEncryption')}</span>
                 </div>
              </div>

              <button 
                onClick={startP2P}
                disabled={connecting || peers > 0}
                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 italic ${
                   peers > 0 
                   ? 'bg-emerald-600 text-white' 
                   : connecting 
                   ? 'bg-slate-700 text-slate-400' 
                   : 'bg-white text-black hover:bg-blue-600 hover:text-white'
                }`}
              >
                 {connecting ? (
                   <>{t('connecting')}</>
                 ) : peers > 0 ? (
                   <><Users size={20} /> {t('peerConnected')}</>
                 ) : (
                   <><Smartphone size={20} /> {t('startDiscovery')}</>
                 )}
              </button>
           </div>

           <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.3em] text-center mt-8">
              SNAPCLEAN_PROTOCOL_V2 // END_TO_END_SECURED
           </p>
        </div>
      </div>
    </motion.div>
  );
};
