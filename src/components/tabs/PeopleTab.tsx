import React from 'react';
import { 
  Users, 
  Fingerprint, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { PersonGroup } from '../../services/peopleEngine';
import { SystemAPI } from '../../services/systemApi';
import { libraryManager } from '../../services/PhotoLibraryManager';
import { useI18n } from '../../i18n/context';
import { motion } from 'motion/react';

interface PeopleTabProps {
  peopleGroups: PersonGroup[];
  renamePerson: (id: string, currentName: string) => void;
}


export const PeopleTab = ({ peopleGroups, renamePerson }: PeopleTabProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <Users className="text-indigo-500" />
            {t('peopleHub')}
          </h2>
          <p className="text-slate-400 mt-1 max-w-lg">
            AI Vision Core has automatically clustered your assets by detected facial vectors and biometric landmarks.
          </p>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <span className="text-xs text-slate-500 block mb-1">{t('confidence')}</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {(peopleGroups.reduce((acc, g) => acc + g.confidence, 0) / (peopleGroups.length || 1)).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {peopleGroups.map((cluster, idx) => {
          const mainPhoto = cluster.photos[0];
          const isMainPdf = mainPhoto && (mainPhoto.type === 'application/pdf' || mainPhoto.path?.toLowerCase().endsWith('.pdf'));
          const thumbUrl = (mainPhoto && !isMainPdf) ? (
            (mainPhoto.thumbnail && mainPhoto.thumbnail.size > 0)
              ? libraryManager.getBlobUrl(mainPhoto.path, () => URL.createObjectURL(mainPhoto.thumbnail!))
              : (mainPhoto.blob && mainPhoto.blob.size > 0)
              ? libraryManager.getBlobUrl(mainPhoto.path, () => URL.createObjectURL(mainPhoto.blob!))
              : SystemAPI.getImageUrl(mainPhoto.path, 'thumbnail')
          ) : null;

          return (
            <motion.div 
              key={`${cluster.id}-${idx}`} 
              whileHover={{ y: -5 }}
              className="glass rounded-[2rem] border-white/5 group hover:border-indigo-500/30 transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl font-black text-indigo-400 border border-indigo-500/20 font-mono italic z-10 relative overflow-hidden`}>
                      {isMainPdf ? (
                        <FileText size={24} className="text-red-500" />
                      ) : thumbUrl ? (
                        <img 
                          src={thumbUrl} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          alt={cluster.name}
                        />
                      ) : cluster.name[0]}
                    </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-900 z-20 flex items-center justify-center">
                    <ShieldCheck size={10} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-xl text-white italic uppercase truncate tracking-tight">{cluster.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">{cluster.photos.length} {t('matchingPortraits')}</p>
                </div>
              </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                  {cluster.photos.slice(1, 4 + 1).map((p, pIdx) => {
                    const isItemPdf = p.type === 'application/pdf' || p.path?.toLowerCase().endsWith('.pdf');
                    const itemUrl = (!isItemPdf) ? (
                      (p.thumbnail && p.thumbnail.size > 0)
                        ? libraryManager.getBlobUrl(p.path, () => URL.createObjectURL(p.thumbnail!))
                        : (p.blob && p.blob.size > 0)
                        ? libraryManager.getBlobUrl(p.path, () => URL.createObjectURL(p.blob!))
                        : SystemAPI.getImageUrl(p.path, 'thumbnail')
                    ) : null;

                    return (
                      <div key={`${cluster.id}-${p.id || p.originalId || 'none'}-${pIdx}`} className="aspect-square bg-slate-800 rounded-xl overflow-hidden border border-white/5 group-hover:border-indigo-500/20 transition-all flex items-center justify-center">
                        {isItemPdf ? (
                          <FileText size={16} className="text-red-400" />
                        ) : itemUrl ? (
                          <img 
                            src={itemUrl} 
                            className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                            referrerPolicy="no-referrer"
                            alt=""
                          />
                        ) : null}
                      </div>
                    );
                  })}
                {cluster.photos.length < 5 && Array.from({ length: 4 - (cluster.photos.length - 1) }).map((_, i) => (
                  <div key={`${cluster.id}-${i}`} className="aspect-square bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                    <Users size={12} className="text-slate-700" />
                  </div>
                ))}
              </div>

              <button 
                onClick={() => renamePerson(cluster.id, cluster.name)}
                className="w-full py-3 bg-white/5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center gap-2"
              >
                <Fingerprint size={14} /> {t('identifyIndividual')}
              </button>
            </div>
          </motion.div>
    );
  })}
      </div>
    </div>
  );
};
