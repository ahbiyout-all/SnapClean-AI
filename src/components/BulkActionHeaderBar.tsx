import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderPlus, 
  Download, 
  Trash2, 
  X, 
  CheckSquare, 
  Square,
  Copy, 
  FileText, 
  Archive, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Folder,
  Layers,
  ChevronRight,
  HardDrive,
  Share2
} from 'lucide-react';
import JSZip from 'jszip';
import { db, PhotoRecord, EventRecord } from '../services/db';
import { SystemAPI } from '../services/systemApi';
import { useI18n } from '../i18n/context';
import { CollabShareModal } from './CollabShareModal';

export interface BulkActionHeaderBarProps {
  selectedPhotoIds: number[];
  allPhotos: PhotoRecord[];
  filteredPhotos: PhotoRecord[];
  onClearSelection: () => void;
  onSelectAllFiltered: () => void;
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  className?: string;
}

export const BulkActionHeaderBar: React.FC<BulkActionHeaderBarProps> = ({
  selectedPhotoIds,
  allPhotos,
  filteredPhotos,
  onClearSelection,
  onSelectAllFiltered,
  addNotification,
  className = ''
}) => {
  const { t, language } = useI18n();

  // Selected photo objects
  const selectedPhotos = useMemo(() => {
    const idSet = new Set(selectedPhotoIds);
    return allPhotos.filter(p => p.id && idSet.has(p.id));
  }, [allPhotos, selectedPhotoIds]);

  // Total size in MB
  const totalSizeBytes = useMemo(() => {
    return selectedPhotos.reduce((acc, p) => acc + (p.size || 0), 0);
  }, [selectedPhotos]);

  const totalSizeFormatted = useMemo(() => {
    if (totalSizeBytes >= 1024 * 1024 * 1024) {
      return `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [totalSizeBytes]);

  // Modal states
  const [showMoveToAlbumModal, setShowMoveToAlbumModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCollabShareModal, setShowCollabShareModal] = useState(false);

  // Existing Albums state
  const [existingAlbums, setExistingAlbums] = useState<EventRecord[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('new');
  const [isSubmittingAlbum, setIsSubmittingAlbum] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatusText, setExportStatusText] = useState('');

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Load existing albums when 'Move to Album' modal opens
  useEffect(() => {
    if (showMoveToAlbumModal) {
      setLoadingAlbums(true);
      db.events.toArray()
        .then(albums => {
          setExistingAlbums(albums);
          if (albums.length > 0) {
            setSelectedAlbumId(albums[0].id || 'new');
          } else {
            setSelectedAlbumId('new');
          }
        })
        .catch(err => {
          console.error('Failed to load albums:', err);
        })
        .finally(() => {
          setLoadingAlbums(false);
        });
    }
  }, [showMoveToAlbumModal]);

  // Handle Move to Album Action
  const handleMoveToAlbum = async () => {
    if (selectedPhotoIds.length === 0) return;
    setIsSubmittingAlbum(true);

    try {
      let targetAlbumId = selectedAlbumId;
      let targetAlbumTitle = '';

      if (selectedAlbumId === 'new') {
        const title = newAlbumTitle.trim() || `${language === 'ko' ? '새 앨범' : 'New Album'} (${new Date().toLocaleDateString()})`;
        targetAlbumTitle = title;
        targetAlbumId = `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newRecord: EventRecord = {
          id: targetAlbumId,
          title: targetAlbumTitle,
          summary: `${selectedPhotoIds.length} ${language === 'ko' ? '장의 사진으로 구성된 앨범' : 'photos album'}`,
          startDate: Date.now(),
          endDate: Date.now(),
          photoCount: selectedPhotoIds.length,
          representativePhotoId: selectedPhotos[0]?.id,
          theme: 'vibrant'
        };

        await db.events.put(newRecord);
      } else {
        const found = existingAlbums.find(a => a.id === selectedAlbumId);
        targetAlbumTitle = found?.title || 'Album';
      }

      // Assign eventId and album tag to all selected photos
      const albumTag = `album:${targetAlbumTitle}`;
      await db.photos.where('id').anyOf(selectedPhotoIds).modify(photo => {
        photo.eventId = targetAlbumId;
        if (!photo.tags) photo.tags = [];
        if (!photo.tags.includes(albumTag)) {
          photo.tags.push(albumTag);
        }
      });

      // Update album count
      const updatedCount = await db.photos.where('eventId').equals(targetAlbumId).and(p => !p.isDeleted).count();
      await db.events.update(targetAlbumId, {
        photoCount: updatedCount,
        endDate: Date.now(),
        ...(selectedPhotos[0]?.id ? { representativePhotoId: selectedPhotos[0].id } : {})
      });

      // Record audit log
      await db.auditLogs.add({
        action: 'MOVE_TO_ALBUM',
        timestamp: Date.now(),
        details: {
          albumId: targetAlbumId,
          albumTitle: targetAlbumTitle,
          photoCount: selectedPhotoIds.length,
          photoIds: selectedPhotoIds
        }
      });

      // Notify and dispatch event
      window.dispatchEvent(new CustomEvent('photos-database-updated'));

      addNotification(
        language === 'ko' ? '앨범 이동 완료' : 'Moved to Album',
        language === 'ko'
          ? `${selectedPhotoIds.length}장의 사진이 '${targetAlbumTitle}' 앨범으로 지정되었습니다.`
          : `Successfully assigned ${selectedPhotoIds.length} photos to '${targetAlbumTitle}'.`,
        'success'
      );

      setShowMoveToAlbumModal(false);
      setNewAlbumTitle('');
    } catch (err: any) {
      console.error('Failed to move to album:', err);
      addNotification(
        language === 'ko' ? '앨범 이동 실패' : 'Failed to Move',
        err?.message || (language === 'ko' ? '앨범 저장 중 오류가 발생했습니다.' : 'Error moving photos to album.'),
        'error'
      );
    } finally {
      setIsSubmittingAlbum(false);
    }
  };

  // Helper to fetch blob for a photo
  const fetchPhotoBlob = async (photo: PhotoRecord): Promise<Blob | null> => {
    if (photo.blob && photo.blob.size > 0) return photo.blob;
    if (photo.thumbnail && photo.thumbnail.size > 0) return photo.thumbnail;

    // Check web file map
    const webMap = (window as any).__webFileMap;
    if (webMap && webMap.has(photo.path)) {
      const handle = webMap.get(photo.path);
      if (handle instanceof Blob) return handle;
    }

    // Try SystemAPI thumbnail or object url
    try {
      const thumbUrl = await SystemAPI.getThumbnailData(photo.path);
      if (thumbUrl) {
        const res = await fetch(thumbUrl);
        return await res.blob();
      }
    } catch (e) {
      // ignore
    }

    // Try direct fetch if path is a URL or local asset
    try {
      if (photo.path.startsWith('blob:') || photo.path.startsWith('data:') || photo.path.startsWith('http')) {
        const res = await fetch(photo.path);
        return await res.blob();
      }
    } catch (e) {
      // ignore
    }

    return null;
  };

  // Export Option 1: ZIP Archive
  const handleExportZip = async () => {
    if (selectedPhotos.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText(language === 'ko' ? '압축 파일 생성 준비 중...' : 'Initializing ZIP archive...');

    try {
      const zip = new JSZip();
      const folder = zip.folder(`SnapClean_Export_${Date.now()}`);

      const manifest: any[] = [];
      const total = selectedPhotos.length;

      for (let i = 0; i < total; i++) {
        const photo = selectedPhotos[i];
        setExportStatusText(
          language === 'ko' 
            ? `파일 준비 중 (${i + 1}/${total}): ${photo.path.split('/').pop() || 'photo'}`
            : `Packing file (${i + 1}/${total}): ${photo.path.split('/').pop() || 'photo'}`
        );
        setExportProgress(Math.round(((i + 1) / total) * 70));

        let filename = photo.path.split('/').pop()?.split('\\').pop() || `photo_${photo.id || i + 1}.jpg`;
        // Avoid collisions
        if (folder?.file(filename)) {
          const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '.jpg';
          const namePart = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
          filename = `${namePart}_${photo.id || i + 1}${ext}`;
        }

        const blob = await fetchPhotoBlob(photo);
        if (blob) {
          folder?.file(filename, blob);
        } else {
          // Add metadata text placeholder if raw binary is unavailable in preview
          folder?.file(`${filename}.info.txt`, `Path: ${photo.path}\nSize: ${photo.size} bytes\nCategory: ${photo.category || 'N/A'}\nDate: ${photo.dateTaken ? new Date(photo.dateTaken).toISOString() : 'N/A'}`);
        }

        manifest.push({
          id: photo.id,
          filename,
          originalPath: photo.path,
          sizeBytes: photo.size,
          category: photo.category || 'Uncategorized',
          dateTaken: photo.dateTaken ? new Date(photo.dateTaken).toISOString() : null,
          cameraModel: photo.cameraModel || 'N/A',
          aiScore: photo.aestheticScore || photo.aiScore || null,
          tags: photo.tags || photo.aiTags || []
        });
      }

      // Add manifest.json
      folder?.file('manifest.json', JSON.stringify(manifest, null, 2));

      setExportStatusText(language === 'ko' ? 'ZIP 압축 중...' : 'Compressing ZIP package...');
      const zipBlob = await zip.generateAsync(
        { 
          type: 'blob', 
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          setExportProgress(70 + Math.round((metadata.percent / 100) * 30));
        }
      );

      // Trigger download
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `SnapClean_Photos_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

      addNotification(
        language === 'ko' ? '내보내기 완료' : 'Export Complete',
        language === 'ko'
          ? `${selectedPhotos.length}장의 사진이 포함된 ZIP 파일이 다운로드되었습니다.`
          : `Downloaded ZIP file containing ${selectedPhotos.length} photos.`,
        'success'
      );

      setShowExportModal(false);
    } catch (err: any) {
      console.error('ZIP export failed:', err);
      addNotification(
        language === 'ko' ? '내보내기 실패' : 'Export Failed',
        err?.message || (language === 'ko' ? 'ZIP 파일 생성 중 오류가 발생했습니다.' : 'Failed to generate ZIP export.'),
        'error'
      );
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      setExportStatusText('');
    }
  };

  // Export Option 2: Copy Paths to Clipboard
  const handleCopyPaths = async () => {
    try {
      const pathsText = selectedPhotos.map(p => p.path).join('\n');
      await navigator.clipboard.writeText(pathsText);
      addNotification(
        language === 'ko' ? '경로 복사 완료' : 'Paths Copied',
        language === 'ko'
          ? `선택한 ${selectedPhotos.length}개 파일의 전체 경로가 클립보드에 복사되었습니다.`
          : `Copied ${selectedPhotos.length} file paths to clipboard.`,
        'success'
      );
      setShowExportModal(false);
    } catch (err: any) {
      addNotification('Copy Failed', err?.message || 'Could not copy to clipboard', 'error');
    }
  };

  // Export Option 3: Export Metadata CSV
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Filename', 'Full Path', 'Size (MB)', 'Category', 'Date Taken', 'Camera', 'AI Score', 'Tags'];
      const rows = selectedPhotos.map(p => [
        p.id ?? '',
        `"${(p.path.split('/').pop() || '').replace(/"/g, '""')}"`,
        `"${p.path.replace(/"/g, '""')}"`,
        (p.size / (1024 * 1024)).toFixed(2),
        `"${(p.category || 'Uncategorized').replace(/"/g, '""')}"`,
        p.dateTaken ? `"${new Date(p.dateTaken).toISOString()}"` : '""',
        `"${(p.cameraModel || '').replace(/"/g, '""')}"`,
        p.aestheticScore || p.aiScore || '',
        `"${(p.tags || p.aiTags || []).join('; ').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SnapClean_Metadata_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      addNotification(
        language === 'ko' ? 'CSV 내보내기 완료' : 'CSV Exported',
        language === 'ko'
          ? `${selectedPhotos.length}개 항목의 메타데이터 CSV 파일이 다운로드되었습니다.`
          : `Exported metadata for ${selectedPhotos.length} photos.`,
        'success'
      );
      setShowExportModal(false);
    } catch (err: any) {
      addNotification('Export Failed', err?.message || 'Error exporting CSV', 'error');
    }
  };

  // Handle Bulk Delete Confirmation
  const handleBulkDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    setIsDeleting(true);

    try {
      const now = Date.now();
      // Soft-delete to Trash table in Dexie
      await db.photos.where('id').anyOf(selectedPhotoIds).modify({
        isDeleted: 1,
        deletedAt: now
      });

      // Synchronize with SystemAPI
      const pathsToDelete = selectedPhotos.map(p => p.path);
      await SystemAPI.deleteFiles(pathsToDelete);

      // Audit log
      await db.auditLogs.add({
        action: 'BULK_DELETE',
        timestamp: now,
        details: {
          count: selectedPhotoIds.length,
          photoIds: selectedPhotoIds,
          totalBytes: totalSizeBytes,
          paths: pathsToDelete.slice(0, 50)
        }
      });

      // Trigger reactive reload
      window.dispatchEvent(new CustomEvent('photos-database-updated'));

      addNotification(
        language === 'ko' ? '휴지통 이동 완료' : 'Moved to Trash',
        language === 'ko'
          ? `${selectedPhotoIds.length}장의 사진(${totalSizeFormatted})이 휴지통으로 이동되었습니다. 휴지통 탭에서 언제든 복원 가능합니다.`
          : `Moved ${selectedPhotoIds.length} photos (${totalSizeFormatted}) to Trash. You can restore them anytime.`,
        'success'
      );

      setShowDeleteConfirmModal(false);
      onClearSelection();
    } catch (err: any) {
      console.error('Bulk delete failed:', err);
      addNotification(
        language === 'ko' ? '삭제 실패' : 'Delete Failed',
        err?.message || (language === 'ko' ? '일괄 삭제 처리 중 오류가 발생했습니다.' : 'Failed to delete selected photos.'),
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllFilteredSelected = filteredPhotos.length > 0 && selectedPhotoIds.length === filteredPhotos.length;

  return (
    <>
      <AnimatePresence>
        {selectedPhotoIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`sticky top-3 z-40 w-full mb-5 ${className}`}
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-indigo-950/60 ring-1 ring-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-3 text-white">
              {/* Left: Selection Counter & Details */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                    <CheckSquare size={17} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                        {language === 'ko' 
                          ? `${selectedPhotoIds.length}장 선택됨` 
                          : `${selectedPhotoIds.length} Selected`}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/5">
                        {totalSizeFormatted}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {language === 'ko' 
                        ? `전체 ${allPhotos.length}장 중 선택됨 (필터링: ${filteredPhotos.length}장)`
                        : `of ${allPhotos.length} total photos (${filteredPhotos.length} filtered)`}
                    </div>
                  </div>
                </div>

                {/* Quick Select All Filtered / Toggle button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isAllFilteredSelected ? onClearSelection : onSelectAllFiltered}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 hover:border-indigo-400 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title={isAllFilteredSelected 
                      ? (language === 'ko' ? '선택 전체 해제' : 'Deselect All') 
                      : (language === 'ko' ? '현재 필터 사진 전체 선택' : 'Select All Filtered')}
                  >
                    {isAllFilteredSelected ? <Square size={11} /> : <CheckSquare size={11} />}
                    <span>
                      {isAllFilteredSelected 
                        ? (language === 'ko' ? '해제' : 'Deselect') 
                        : (language === 'ko' ? '필터 전체 선택' : 'Select All')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={language === 'ko' ? '선택 취소' : 'Clear Selection'}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Right: Three Core Bulk Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
                {/* 1. Move to Album */}
                <button
                  type="button"
                  onClick={() => setShowMoveToAlbumModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 hover:border-indigo-400 transition-all shadow-md shadow-indigo-900/20 cursor-pointer active:scale-95"
                >
                  <FolderPlus size={15} className="text-indigo-400" />
                  <span>{language === 'ko' ? '앨범으로 이동' : 'Move to Album'}</span>
                </button>

                {/* 2. Export Selected */}
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600/25 hover:bg-sky-600/45 text-sky-200 border border-sky-500/40 hover:border-sky-400 transition-all shadow-md shadow-sky-900/20 cursor-pointer active:scale-95"
                >
                  <Download size={15} className="text-sky-400" />
                  <span>{language === 'ko' ? '선택 항목 내보내기' : 'Export Selected'}</span>
                </button>

                {/* 3. Share Selected (Temporary Secure Link) */}
                <button
                  type="button"
                  onClick={() => setShowCollabShareModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-md shadow-emerald-950/20 cursor-pointer active:scale-95"
                  title={language === 'ko' ? '임시 보안 링크 생성 및 공유' : 'Generate temporary secure link & share'}
                >
                  <Share2 size={15} className="text-emerald-400" />
                  <span>{language === 'ko' ? '공유' : 'Share'}</span>
                </button>

                {/* 4. Bulk Delete */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/40 hover:border-rose-400 transition-all shadow-md shadow-rose-950/20 cursor-pointer active:scale-95"
                >
                  <Trash2 size={15} className="text-rose-400" />
                  <span>{language === 'ko' ? '일괄 삭제' : 'Bulk Delete'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL 1: MOVE TO ALBUM ===================== */}
      <AnimatePresence>
        {showMoveToAlbumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
                    <FolderPlus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {language === 'ko' ? '앨범으로 이동 / 지정' : 'Move to Album'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === 'ko'
                        ? `선택한 ${selectedPhotoIds.length}장의 사진을 보관할 앨범을 선택하세요.`
                        : `Assign ${selectedPhotoIds.length} selected photos to an album.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoveToAlbumModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Destination Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  {language === 'ko' ? '대상 앨범 선택' : 'Select Destination Album'}
                </label>

                {loadingAlbums ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                    <span>{language === 'ko' ? '앨범 목록 로딩 중...' : 'Loading albums...'}</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {/* Create New Album Option */}
                    <div
                      onClick={() => setSelectedAlbumId('new')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedAlbumId === 'new'
                          ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/40'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles size={16} className="text-amber-400" />
                        <div>
                          <span className="text-xs font-bold block">
                            {language === 'ko' ? '+ 새 앨범 생성' : '+ Create New Album'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {language === 'ko' ? '새로운 앨범을 만들어 사진들을 추가합니다.' : 'Create a fresh album for this selection'}
                          </span>
                        </div>
                      </div>
                      {selectedAlbumId === 'new' && <Check size={14} className="text-indigo-400" />}
                    </div>

                    {/* Existing Albums List */}
                    {existingAlbums.map(album => (
                      <div
                        key={album.id}
                        onClick={() => setSelectedAlbumId(album.id!)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedAlbumId === album.id
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/40'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Folder size={16} className="text-indigo-400" />
                          <div>
                            <span className="text-xs font-bold block">{album.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {album.photoCount || 0} {language === 'ko' ? '장의 사진' : 'photos'}
                            </span>
                          </div>
                        </div>
                        {selectedAlbumId === album.id && <Check size={14} className="text-indigo-400" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Input for New Album Name if 'new' is selected */}
                {selectedAlbumId === 'new' && (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {language === 'ko' ? '새 앨범 이름' : 'New Album Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'ko' ? '예: 2026 제주 여행, 베스트 인물컷' : 'e.g. Summer Memories, Nature Best'}
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowMoveToAlbumModal(false)}
                  disabled={isSubmittingAlbum}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleMoveToAlbum}
                  disabled={isSubmittingAlbum || (selectedAlbumId === 'new' && !newAlbumTitle.trim())}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingAlbum ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{language === 'ko' ? '이동 중...' : 'Moving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{language === 'ko' ? '이동 완료' : 'Confirm Move'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL 2: EXPORT SELECTED ===================== */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-slate-900 border border-sky-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-600/30 border border-sky-500/40 text-sky-400">
                    <Download size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {language === 'ko' ? '선택 사진 내보내기' : 'Export Selected Photos'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === 'ko'
                        ? `${selectedPhotoIds.length}장의 사진(${totalSizeFormatted})을 내보냅니다.`
                        : `Export ${selectedPhotoIds.length} photos (${totalSizeFormatted}).`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isExporting && setShowExportModal(false)}
                  disabled={isExporting}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {isExporting ? (
                <div className="py-6 space-y-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <Archive size={24} className="animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{exportStatusText}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {exportProgress !== null ? `${exportProgress}%` : ''}
                    </p>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="bg-sky-500 h-full transition-all duration-200"
                      style={{ width: `${exportProgress || 10}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Option 1: ZIP Archive */}
                  <button
                    type="button"
                    onClick={handleExportZip}
                    className="w-full p-3.5 rounded-2xl border border-sky-500/30 bg-sky-950/20 hover:bg-sky-600/20 transition-all cursor-pointer flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
                        <Archive size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {language === 'ko' ? '📦 ZIP 압축 파일로 다운로드' : '📦 Download as ZIP Package'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {language === 'ko' 
                            ? '모든 사진과 메타데이터 JSON을 단일 ZIP으로 묶어 저장합니다.' 
                            : 'Bundles all photos and manifest into a single ZIP.'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                  </button>

                  {/* Option 2: Copy Paths */}
                  <button
                    type="button"
                    onClick={handleCopyPaths}
                    className="w-full p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/10 text-indigo-400 group-hover:scale-110 transition-transform">
                        <Copy size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {language === 'ko' ? '📋 파일 경로 목록 복사' : '📋 Copy File Paths'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {language === 'ko' 
                            ? '외부 프로그램 및 스크립트용 전체 절대 경로를 클립보드에 복사합니다.' 
                            : 'Copies all full absolute file paths to clipboard.'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                  </button>

                  {/* Option 3: Export CSV */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                        <FileText size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {language === 'ko' ? '📊 메타데이터 명세서 (CSV)' : '📊 Metadata Report (CSV)'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {language === 'ko' 
                            ? '촬영일, 카메라, AI 점수, 태그, 해상도를 엑셀/스프레드시트용 CSV로 출력합니다.' 
                            : 'Generates spreadsheet CSV with date, camera, score, and tags.'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'ko' ? '닫기' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL 3: BULK DELETE CONFIRMATION ===================== */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-600/30 border border-rose-500/50 text-rose-400 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-200">
                    {language === 'ko' ? '선택 사진 일괄 삭제' : 'Confirm Bulk Deletion'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ko'
                      ? '선택된 사진들을 안전하게 휴지통으로 이동합니다.'
                      : 'Move selected photos safely to the Trash bin.'}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ko' ? '삭제 대상 수량:' : 'Photos to Delete:'}</span>
                  <span className="font-bold text-rose-300 font-mono">{selectedPhotoIds.length} {language === 'ko' ? '장' : 'items'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ko' ? '확보 예상 공간:' : 'Space to Reclaim:'}</span>
                  <span className="font-bold text-emerald-400 font-mono">{totalSizeFormatted}</span>
                </div>
                <div className="pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  {language === 'ko'
                    ? '💡 휴지통(Trash)으로 안전하게 이동되며, 30일 이내 또는 원할 때 언제든 휴지통 탭에서 즉시 복원할 수 있습니다.'
                    : '💡 Files are moved to Trash and can be restored at any time from the Trash Bin tab.'}
                </div>
              </div>

              {/* Sample Files Preview */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {language === 'ko' ? '대상 파일 목록 (일부)' : 'Affected Files (Sample)'}
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-slate-300">
                  {selectedPhotos.slice(0, 4).map((p, i) => (
                    <div key={p.id || i} className="truncate p-1 bg-white/5 rounded-md">
                      {p.path.split('/').pop() || p.path}
                    </div>
                  ))}
                  {selectedPhotos.length > 4 && (
                    <div className="text-slate-500 italic pl-1">
                      {language === 'ko' 
                        ? `...외 ${selectedPhotos.length - 4}개 파일` 
                        : `...and ${selectedPhotos.length - 4} more`}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{language === 'ko' ? '삭제 처리 중...' : 'Deleting...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>{language === 'ko' ? '휴지통으로 이동' : 'Move to Trash'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL 4: TEMPORARY SECURE SHARE MODAL ===================== */}
      <AnimatePresence>
        {showCollabShareModal && (
          <CollabShareModal
            photos={selectedPhotos}
            album={{
              id: `share_${Date.now()}`,
              title: language === 'ko' 
                ? `선택된 ${selectedPhotos.length}장의 사진` 
                : `${selectedPhotos.length} Selected Photos`,
              photoCount: selectedPhotos.length
            }}
            onClose={() => setShowCollabShareModal(false)}
            onLinkCopied={() => {
              addNotification(
                language === 'ko' ? '보안 링크 복사됨' : 'Secure Link Copied',
                language === 'ko'
                  ? '임시 암호화 공유 링크가 클립보드에 복사되었습니다.'
                  : 'Temporary encrypted share link copied to clipboard.',
                'success'
              );
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
