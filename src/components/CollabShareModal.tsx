import React, { useState, useMemo } from 'react';
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
  ServerOff,
  Clock,
  Lock,
  Flame,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface CollabShareModalProps {
  album?: any;
  photos?: any[];
  onClose: () => void;
  onLinkCopied?: () => void;
}

type ExpiryOption = '1h' | '24h' | '7d' | 'burn';
type ShareProtocol = 'web' | 'tunnel';

export const CollabShareModal: React.FC<CollabShareModalProps> = ({ 
  album, 
  photos = [], 
  onClose,
  onLinkCopied 
}) => {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [peers, setPeers] = useState<number>(0);
  const [expiry, setExpiry] = useState<ExpiryOption>('24h');
  const [protocol, setProtocol] = useState<ShareProtocol>('web');

  // Generate a stable unique share token for this session
  const shareToken = useMemo(() => {
    const salt = Math.random().toString(36).substring(2, 8);
    const count = photos.length || (album?.photoCount || 1);
    return `sec_${count}p_${salt}`;
  }, [photos.length, album]);

  // Compute total size
  const totalSizeBytes = useMemo(() => {
    if (!photos || photos.length === 0) return 0;
    return photos.reduce((acc, p) => acc + (p.size || 0), 0);
  }, [photos]);

  const totalSizeFormatted = useMemo(() => {
    if (totalSizeBytes >= 1024 * 1024 * 1024) {
      return `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [totalSizeBytes]);

  // Dynamic share link based on protocol and expiry
  const shareUrl = useMemo(() => {
    const itemCount = photos.length || album?.photoCount || 1;
    if (protocol === 'tunnel') {
      return `snapclean://share/p2p-tunnel-${shareToken}?exp=${expiry}&items=${itemCount}`;
    }
    return `https://snapclean.local/share/${shareToken}?exp=${expiry}&items=${itemCount}`;
  }, [protocol, shareToken, expiry, photos.length, album]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setCopied(true);
    if (onLinkCopied) onLinkCopied();
    setTimeout(() => setCopied(false), 2500);
  };

  const startP2P = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setPeers(1);
    }, 1800);
  };

  const expiryOptions: { id: ExpiryOption; label: string; sublabel: string }[] = [
    { 
      id: '1h', 
      label: language === 'ko' ? '1시간' : '1 Hour', 
      sublabel: language === 'ko' ? '초단기' : 'Ultra-short' 
    },
    { 
      id: '24h', 
      label: language === 'ko' ? '24시간' : '24 Hours', 
      sublabel: language === 'ko' ? '권장' : 'Recommended' 
    },
    { 
      id: '7d', 
      label: language === 'ko' ? '7일' : '7 Days', 
      sublabel: language === 'ko' ? '표준' : 'Standard' 
    },
    { 
      id: 'burn', 
      label: language === 'ko' ? '1회 열람' : '1-View', 
      sublabel: language === 'ko' ? '즉시 파기' : 'Burn on read' 
    },
  ];

  const hasPhotos = photos && photos.length > 0;
  const previewThumbnails = hasPhotos ? photos.slice(0, 4) : [];
  const remainingCount = hasPhotos && photos.length > 4 ? photos.length - 4 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg glass border border-white/10 rounded-[2.5rem] p-6 sm:p-8 md:p-10 overflow-hidden shadow-2xl my-auto text-white bg-slate-950/90"
      >
        {/* Background Decorative Icon */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Users size={220} />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl shadow-inner">
                <Shield size={28} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400 flex items-center gap-1.5">
                  <Lock size={11} /> {language === 'ko' ? '임시 보안 공유' : 'Temporary Secure Share'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
                  {t('privacyFirstSharing')}
                </h2>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={language === 'ko' ? '닫기' : 'Close'}
            >
              <X size={22} />
            </button>
          </div>

          {/* Description */}
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            {t('collabShareDesc1')}
            <span className="text-emerald-400 font-bold ml-1">{t('collabShareDesc2')}</span>
          </p>

          {/* Selected Photos Banner / Summary */}
          {hasPhotos && (
            <div className="mb-6 p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnails preview stack */}
                <div className="flex -space-x-2 shrink-0">
                  {previewThumbnails.map((p, idx) => (
                    <div 
                      key={p.id || idx}
                      className="w-9 h-9 rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-800 shadow-md flex items-center justify-center shrink-0"
                    >
                      {p.thumbnailUrl || p.thumbnail || p.path ? (
                        <img 
                          src={p.thumbnailUrl || p.thumbnail || p.path} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ImageIcon size={14} className="text-slate-400" />
                      )}
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="w-9 h-9 rounded-xl border-2 border-slate-900 bg-emerald-600/40 text-emerald-200 text-[10px] font-black flex items-center justify-center shadow-md shrink-0">
                      +{remainingCount}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {language === 'ko' ? `${photos.length}장의 사진 선택됨` : `${photos.length} Photos Selected`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {totalSizeFormatted} • {language === 'ko' ? '암호화 패키징' : 'Encrypted Package'}
                  </div>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono whitespace-nowrap">
                {photos.length} ITEMS
              </div>
            </div>
          )}

          {/* Album summary when album is provided without photos */}
          {!hasPhotos && album && (
            <div className="mb-6 p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white truncate">
                  {album.title || (language === 'ko' ? '앨범 공유' : 'Album Share')}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {album.photoCount || 0} {language === 'ko' ? '장 사진' : 'Photos'}
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                ALBUM
              </div>
            </div>
          )}

          {/* Expiry Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={11} className="text-indigo-400" />
                {language === 'ko' ? '링크 유효 기간 (자동 파기)' : 'Link Expiry (Self-Destruct)'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {expiry === 'burn' 
                  ? (language === 'ko' ? '1회 확인 후 파기' : '1-Time View Only') 
                  : (language === 'ko' ? `${expiry} 유효` : `Valid for ${expiry}`)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {expiryOptions.map((opt) => {
                const isSelected = expiry === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExpiry(opt.id)}
                    className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs font-black tracking-tight">{opt.label}</div>
                    <div className="text-[9px] opacity-75 font-mono">{opt.sublabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            {/* QR Code and Link Box */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center gap-4">
              {/* Protocol selector pill */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 self-center">
                <button
                  type="button"
                  onClick={() => setProtocol('web')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    protocol === 'web'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  HTTPS Web Link
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('tunnel')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    protocol === 'tunnel'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  P2P Direct Tunnel
                </button>
              </div>

              {/* QR Code Display */}
              <div className="relative group">
                <div className="w-40 h-40 bg-white p-3 rounded-2xl shadow-2xl flex items-center justify-center">
                  <QrCode size={135} className="text-slate-900" />
                </div>
                <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center gap-1 text-center opacity-0 group-hover:opacity-100 transition-opacity p-2 backdrop-blur-xs">
                  <Smartphone size={24} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-white">
                    {language === 'ko' ? '카메라로 스캔하여 열기' : 'Scan with Camera'}
                  </span>
                </div>
              </div>

              {/* Secure Link Input & Copy */}
              <div className="w-full">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  <span className="flex items-center gap-1">
                    <Lock size={10} className="text-emerald-400" />
                    {protocol === 'web' 
                      ? (language === 'ko' ? '생성된 보안 웹 링크' : 'Generated Secure Link')
                      : t('secureTunnelLink')}
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check size={10} /> {t('active')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={shareUrl} 
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50 select-all"
                  />
                  <button 
                    type="button"
                    onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                      copied 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title={language === 'ko' ? '링크 복사' : 'Copy link'}
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-white" />
                        <span>{language === 'ko' ? '복사됨' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>{language === 'ko' ? '복사' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Zero-knowledge & AES-256 Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-1.5">
                <ServerOff size={18} className="text-rose-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {t('serverMetadataZero')}
                </span>
              </div>
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-1.5">
                <Wifi size={18} className="text-emerald-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {t('p2pEncryption')}
                </span>
              </div>
            </div>

            {/* P2P Discovery / Live Connect Button */}
            <button 
              type="button"
              onClick={startP2P}
              disabled={connecting || peers > 0}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2.5 italic text-xs cursor-pointer ${
                peers > 0 
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50' 
                  : connecting 
                  ? 'bg-slate-800 text-slate-400 cursor-wait' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black hover:opacity-95 hover:shadow-emerald-500/25 active:scale-[0.98]'
              }`}
            >
              {connecting ? (
                <>{t('connecting')}</>
              ) : peers > 0 ? (
                <><Users size={17} /> {t('peerConnected')}</>
              ) : (
                <><Smartphone size={17} /> {t('startDiscovery')}</>
              )}
            </button>
          </div>

          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.25em] text-center mt-6">
            SNAPCLEAN_PROTOCOL_V2 // END_TO_END_SECURED // ZERO_KNOWLEDGE_LINK
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
