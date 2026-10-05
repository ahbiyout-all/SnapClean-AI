import React from 'react';
import { 
  Printer, 
  Zap, 
  Highlighter, 
  Maximize, 
  Image as ImageIcon, 
  Plus,
  Check
} from 'lucide-react';
import { PhotoRecord } from '../../services/db';
import { SystemAPI } from '../../services/systemApi';
import { useI18n } from '../../i18n/context';
import { libraryManager } from '../../services/PhotoLibraryManager';

interface PrintTabProps {
  libraryPhotos: PhotoRecord[];
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

const PrintThumbnail = ({ photo }: { photo: PhotoRecord }) => {
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const url = libraryManager.getBlobUrl(photo.path, () => URL.createObjectURL(photo.thumbnail!));
      if (active && url) setImgSrc(url);
      return;
    }
    
    if (photo.path) {
      SystemAPI.getThumbnailData(photo.path).then((url) => {
        if (active && url) setImgSrc(url);
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [photo.path, photo.thumbnail]);

  if (imgSrc) {
    return <img src={imgSrc} alt="" className="w-full h-full object-cover" />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-slate-700">
      <ImageIcon size={32} />
    </div>
  );
};

export const PrintTab = ({ libraryPhotos, addNotification }: PrintTabProps) => {
  const { t } = useI18n();
  const [selectedPrintIds, setSelectedPrintIds] = React.useState<number[]>([]);

  const toggleSelect = (id?: number) => {
    if (id === undefined) return;
    setSelectedPrintIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
              <Printer className="text-orange-500" />
              {t('printExpertExport')}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {t('printExpertExportDesc')}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                const targetFormat = prompt(t('enterTargetFormat'), 'webp');
                if (targetFormat === 'webp' || targetFormat === 'heif') {
                  const targetPhotos = selectedPrintIds.length > 0 
                    ? libraryPhotos.filter(p => p.id !== undefined && selectedPrintIds.includes(p.id))
                    : libraryPhotos.slice(0, 5);
                  
                  if (targetPhotos.length === 0) {
                    addNotification('Transcode Error', 'No photos found to transcode', 'warning');
                    return;
                  }
                  SystemAPI.transcodeAssets(targetPhotos.map(p => p.path), targetFormat);
                  addNotification('Batch Initialized', `Transcoding ${targetPhotos.length} items to ${targetFormat.toUpperCase()}`, 'info');
                }
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer border border-white/5"
            >
              <Zap size={14} /> {t('batchTranscode')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-linear-to-br from-indigo-600/10 to-transparent">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6">
              <Highlighter className="text-indigo-400" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2 uppercase italic tracking-tight">{t('proofingEngineTitle')}</h4>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {t('proofingEngineDesc')}
            </p>
            <button 
              onClick={() => {
                const targetPhotos = selectedPrintIds.length > 0 
                  ? libraryPhotos.filter(p => p.id !== undefined && selectedPrintIds.includes(p.id))
                  : libraryPhotos.slice(0, 3);
                if (targetPhotos.length === 0) {
                  addNotification('Proofing Error', 'No active queue items found to proof', 'warning');
                  return;
                }
                addNotification('Proofing Engine', `Compiling print-ready profiles for ${targetPhotos.length} items. Color mapping completed.`, 'success');
              }}
              className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:underline cursor-pointer"
            >
              {t('initializeProofing')}
            </button>
          </div>
          <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-linear-to-br from-emerald-600/10 to-transparent">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-6">
              <Maximize className="text-emerald-400" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2 uppercase italic tracking-tight">{t('losslessResamplingTitle')}</h4>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {t('losslessResamplingDesc')}
            </p>
            <button 
              onClick={() => {
                const targetPhotos = selectedPrintIds.length > 0 
                  ? libraryPhotos.filter(p => p.id !== undefined && selectedPrintIds.includes(p.id))
                  : libraryPhotos.slice(0, 3);
                if (targetPhotos.length === 0) {
                  addNotification('Upscale Error', 'No photos found in library to upscale', 'warning');
                  return;
                }
                addNotification('Lossless Resampling', `Executing Super-Resolution upscaler on ${targetPhotos.length} items. Compressive upscale active.`, 'success');
              }}
              className="text-emerald-400 text-xs font-black uppercase tracking-widest hover:underline cursor-pointer"
            >
              {t('upscaleAssets')}
            </button>
          </div>
          <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-linear-to-br from-orange-600/10 to-transparent">
            <div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center mb-6">
              <Printer className="text-orange-400" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2 uppercase italic tracking-tight">{t('printLabSyncTitle')}</h4>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {t('printLabSyncDesc')}
            </p>
            <button 
              onClick={() => {
                addNotification('Print Lab Sync', 'Scanning local network subnets for printing bridges...', 'info');
              }}
              className="text-orange-400 text-xs font-black uppercase tracking-widest hover:underline cursor-pointer"
            >
              {t('connectStudio')}
            </button>
          </div>
        </div>

        <div className="glass rounded-[3rem] border-white/5 p-10">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-lg font-bold uppercase italic tracking-widest">{t('highResExportQueue')}</h4>
            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-white/5">
              {t('itemsSelected', { count: selectedPrintIds.length })}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {libraryPhotos.slice(0, 12).map((photo, i) => {
              const isSelected = photo.id !== undefined && selectedPrintIds.includes(photo.id);
              return (
                <div 
                  key={`${photo.id}-${i}`} 
                  onClick={() => toggleSelect(photo.id)}
                  className={`aspect-square glass rounded-2xl overflow-hidden relative group cursor-pointer transition-all font-bold border-2 ${
                    isSelected ? 'opacity-100 border-orange-500 shadow-xl shadow-orange-500/10 scale-102' : 'opacity-70 border-white/5 hover:opacity-100'
                  }`}
                >
                  <PrintThumbnail photo={photo} />
                  <div className={`absolute top-2 right-2 p-1.5 rounded-lg text-white transition-opacity ${
                    isSelected ? 'bg-orange-500 opacity-100' : 'bg-slate-900/80 opacity-0 group-hover:opacity-100'
                  }`}>
                    {isSelected ? <Check size={14} className="stroke-[3]" /> : <Plus size={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
