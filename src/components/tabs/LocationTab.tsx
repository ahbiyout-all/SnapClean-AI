import React from 'react';
import { 
  MapPin, 
  ArrowRight, 
  Image as ImageIcon 
} from 'lucide-react';
import { PhotoRecord } from '../../services/db';
import { useI18n } from '../../i18n/context';
import { PhotoMap } from '../PhotoMap';
import { motion } from 'motion/react';
import { libraryManager } from '../../services/PhotoLibraryManager';
import { SystemAPI } from '../../services/systemApi';

const LocationThumbnail = ({ photo }: { photo: PhotoRecord }) => {
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
    <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
      <ImageIcon size={16} className="text-white/20" />
    </div>
  );
};

interface LocationTabProps {
  libraryPhotos: PhotoRecord[];
  handleSelectLocation: (loc: string) => void;
  selectedLocations: string[];
  setSelectedLocations: (locs: string[]) => void;
  setActiveTab: (tab: string) => void;
  setShowMap: (show: boolean) => void;
  locations: any[];
}

export const LocationTab = ({
  libraryPhotos,
  handleSelectLocation,
  selectedLocations,
  setSelectedLocations,
  setActiveTab,
  setShowMap,
  locations
}: LocationTabProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-8 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 italic uppercase">{t('locationHubTitle')}</h2>
          <p className="text-slate-400">{t('locationHubDesc')}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <MapPin size={20} className="text-orange-500" />
            <div>
              <div className="text-xs text-slate-500">{t('indexedPoints')}</div>
              <div className="text-lg font-bold text-white">{locations.length} {t('locations')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        <div className="glass rounded-[2.5rem] border-white/10 overflow-hidden relative bg-slate-900/50">
          <PhotoMap 
            photos={libraryPhotos}
            onSelectLocation={(loc) => {
              handleSelectLocation(loc);
              setActiveTab('library');
              setShowMap(true);
            }}
            selectedLocations={selectedLocations}
          />
        </div>
        
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-20 custom-scrollbar text-white">
          {locations.map((loc, i) => (
            <motion.div 
              key={`${loc.id}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => {
                setSelectedLocations([loc.name]);
                setActiveTab('library');
                setShowMap(true);
              }}
              className={`glass p-6 rounded-3xl border-white/5 group hover:bg-white/5 cursor-pointer transition-all ${selectedLocations.includes(loc.name) ? 'ring-2 ring-orange-500 bg-orange-500/5' : ''}`}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold italic">
                    {loc.photos.length}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">{loc.name === 'Unknown Location' ? t('unknownLocation') : loc.name}</h4>
                    <div className="text-xs text-slate-500 font-mono">
                      {t('latLngIndexed')}
                    </div>
                  </div>
                </div>
                <button className="text-slate-400 group-hover:text-blue-400 transition-colors">
                  <ArrowRight size={20} />
                </button>
              </div>
              
              <div className="flex gap-2 min-h-[5rem]">
                {loc.photos.slice(0, 4).map((p: PhotoRecord, pIdx: number) => (
                  <div key={`${loc.id || 'none'}-${p.id || p.originalId || 'none'}-${pIdx}`} className="w-20 h-20 bg-slate-800 rounded-xl relative overflow-hidden group-hover:scale-105 transition-transform origin-left">
                    <LocationThumbnail photo={p} />
                  </div>
                ))}
                {loc.photos.length > 4 && (
                  <div className="w-20 h-20 bg-slate-800/50 border border-dashed border-white/20 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
                    +{loc.photos.length - 4}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {locations.length === 0 && (
            <div className="glass p-12 rounded-3xl border-white/5 text-center text-slate-400 italic">
              {t('noLocationData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
