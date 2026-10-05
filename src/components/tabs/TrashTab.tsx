import React from 'react';
import { 
  Trash2, 
  RotateCcw
} from 'lucide-react';
import { db, PhotoRecord } from '../../services/db';
import { SystemAPI } from '../../services/systemApi';
import { useI18n } from '../../i18n/context';
import { PhotoCard } from '../PhotoCard';

interface TrashTabProps {
  trashPhotos: PhotoRecord[];
  lastPurged: PhotoRecord[];
  emptyTrash: () => Promise<void>;
  undoEmptyTrash: () => Promise<void>;
  setModal: (modal: any) => void;
  detectDuplicates: () => Promise<void>;
  airGappedMode: boolean;
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const TrashTab = ({ 
  trashPhotos, 
  lastPurged, 
  emptyTrash, 
  undoEmptyTrash, 
  setModal, 
  detectDuplicates,
  airGappedMode,
  addNotification
}: TrashTabProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-2xl font-bold text-white italic uppercase tracking-tight flex items-center gap-3">
            <Trash2 className="text-rose-500" />
            {t('trashBin')}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {t('trashBinDesc')} 
            {t('spaceOccupied', { size: `${(trashPhotos.reduce((acc, p) => acc + p.size, 0) / 1024 / 1024).toFixed(1)} MB` })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              // Restore all
              await Promise.all(trashPhotos.map(p => db.photos.update(p.id!, { isDeleted: 0 })));
              detectDuplicates();
              setModal({ type: 'alert', title: t('restored'), message: t('restoredFromTrash', { count: trashPhotos.length }) });
            }}
            disabled={trashPhotos.length === 0}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCcw size={16} /> {t('restoreAll')}
          </button>
          {lastPurged.length > 0 && (
            <button 
              onClick={undoEmptyTrash}
              className="px-6 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCcw size={16} /> {t('undoPurge', { count: lastPurged.length })}
            </button>
          )}
          <button 
            onClick={() => {
              setModal({
                type: 'confirm',
                title: t('emptyTrash'),
                message: t('trashDescription'),
                onConfirm: async () => {
                  await emptyTrash();
                  detectDuplicates();
                }
              });
            }}
            disabled={trashPhotos.length === 0}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-2"
          >
            <Trash2 size={16} /> {t('emptyTrash')}
          </button>
        </div>
      </div>

      {trashPhotos.length > 0 ? (
        <div className="glass rounded-3xl p-6 border-white/5 flex-1 shadow-2xl">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trashPhotos.map((photo, idx) => (
              <div key={`${photo.id}-${idx}`} className="relative group">
                <PhotoCard photo={photo} addNotification={addNotification} />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-10 backdrop-blur-sm rounded-2xl">
                  <button
                    onClick={async () => {
                      await db.photos.update(photo.id!, { isDeleted: 0 });
                      detectDuplicates();
                    }}
                    className="p-2 bg-slate-800 hover:bg-emerald-600 text-white rounded-full transition-colors tooltip relative"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={async () => {
                      setModal({
                        type: 'confirm',
                        title: t('moveToOsTrash'),
                        message: t('moveToOsTrashConfirm'),
                        onConfirm: async () => {
                          // Move to OS trash via bridge
                          if (airGappedMode && photo.path) {
                            await SystemAPI.deleteFiles([photo.path]);
                          }
                          await db.photos.delete(photo.id!);
                          detectDuplicates();
                        }
                      });
                    }}
                    className="p-2 bg-slate-800 hover:bg-rose-600 text-white rounded-full transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass p-20 rounded-3xl border-dashed border-white/10 flex flex-col items-center gap-6 flex-1 justify-center">
          <div className="p-6 bg-slate-800 rounded-full text-slate-500">
            <Trash2 size={48} />
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-xl font-bold text-white">{t('trashIsEmpty')}</h4>
            <p className="text-slate-400 max-w-xs">{t('noDeletedItems')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
