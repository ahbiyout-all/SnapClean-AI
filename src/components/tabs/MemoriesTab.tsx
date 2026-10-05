import React from 'react';
import { 
  History, 
  Flame, 
  Image as ImageIcon 
} from 'lucide-react';
import { PhotoRecord } from '../../services/db';
import { useI18n } from '../../i18n/context';
import { motion } from 'motion/react';
import { libraryManager } from '../../services/PhotoLibraryManager';
import { SystemAPI } from '../../services/systemApi';

const MemoryThumbnail = ({ photo }: { photo: PhotoRecord }) => {
  const [imgSrc, setImgSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (photo.thumbnail && photo.thumbnail.size > 0) {
      const url = libraryManager.getBlobUrl(photo.path, () => URL.createObjectURL(photo.thumbnail!));
      if (active && url) setImgSrc(url);
      return;
    }
    if (photo.blob && photo.blob.size > 0) {
      const url = libraryManager.getBlobUrl(photo.path, () => URL.createObjectURL(photo.blob!));
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

interface MemoriesTabProps {
  memories: { year: number, photos: PhotoRecord[] }[];
  eventSummaries: Record<string, any>;
  generateAllMemorySummaries: () => Promise<void>;
  handleGenerateAISummary: (eventId: string, photos: PhotoRecord[]) => Promise<any>;
}

export const MemoriesTab = ({
  memories,
  eventSummaries,
  generateAllMemorySummaries,
  handleGenerateAISummary
}: MemoriesTabProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{t('memoryLanes')}</h2>
          <p className="text-slate-500 mt-2">{t('memoriesDescription')}</p>
        </div>
        <button 
          onClick={generateAllMemorySummaries}
          className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-3 font-bold uppercase text-xs tracking-widest"
        >
          <Flame size={18} /> {t('revealStories')}
        </button>
      </div>

      {memories.length === 0 ? (
        <div className="py-32 text-center glass rounded-[3rem] border-white/5">
          <History size={64} className="mx-auto text-slate-700 mb-6" />
          <h3 className="text-xl font-bold text-slate-400">{t('noMemoriesToday')}</h3>
          <p className="text-slate-600 mt-2">{t('comeBackTomorrow')}</p>
        </div>
      ) : (
        <div className="space-y-20">
          {memories.map((memory, index) => (
            <motion.section 
              key={`${memory.year}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="flex items-baseline gap-4 mb-8">
                <h3 className="text-7xl font-black text-white/5 font-mono leading-none tracking-tighter">{memory.year}</h3>
                <div className="bg-blue-500/10 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                  {new Date().getFullYear() - memory.year} {t('yearsAgo')}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start text-white">
                <div className="lg:col-span-1 space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-3xl font-bold text-white uppercase italic leading-tight">
                      {eventSummaries[`mem-${memory.year}`]?.title || t('aBeautifulFlashback')}
                    </h4>
                    <button 
                      onClick={() => handleGenerateAISummary(`mem-${memory.year}`, memory.photos.slice(0, 10))}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl border border-indigo-500/25 transition-all flex items-center gap-2 font-black uppercase text-[9px] tracking-widest cursor-pointer"
                    >
                      <Flame size={12} className="animate-pulse" />
                      {eventSummaries[`mem-${memory.year}`] ? 'REGENERATE AI STORY' : 'REVEAL AI STORY'}
                    </button>
                  </div>
                  {eventSummaries[`mem-${memory.year}`] && (
                    <div className="space-y-4">
                      <p className="text-slate-400 leading-relaxed italic text-lg border-l-4 border-indigo-500 pl-6 py-2">
                        "{eventSummaries[`mem-${memory.year}`].story}"
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded">
                          {t('mood')}: {eventSummaries[`mem-${memory.year}`].mood}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                  {memory.photos.slice(0, 8).map((photo, idx) => (
                    <motion.div
                      key={`${memory.year}-${photo.id || photo.originalId || 'none'}-${idx}`}
                      whileHover={{ scale: 1.05, rotate: idx % 2 === 0 ? 2 : -2 }}
                      className="aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 p-4 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white uppercase truncate">{photo.path.split('/').pop()}</span>
                      </div>
                      <MemoryThumbnail photo={photo} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
};
