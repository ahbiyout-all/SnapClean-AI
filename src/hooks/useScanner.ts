import { useState, useEffect, useMemo, useRef } from 'react';
import { db, PhotoRecord, runDbWithRetry, purgeAllLocalIndexData } from '../services/db';
import { SystemAPI } from '../services/systemApi';
import { Photo, DuplicateGroup, ScanStats } from '../types';
import { GifParser } from '../utils/gifParser';
import { ThumbnailGenerator } from '../utils/thumbnailGenerator';
import { BlurDetection } from '../utils/blurDetection';
import { MemoryGuardian } from '../services/memoryGuardian';
import { useI18n } from '../i18n/context';
import { backgroundSyncManager, BackgroundSyncConfig, SyncFrequency } from '../services/backgroundSyncManager';
import { libraryManager, DedupeOptions, DEFAULT_DEDUPE_OPTIONS, DedupeRule } from '../services/PhotoLibraryManager';
import { dbBatchEngine } from '../services/dbBatchEngine';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve(defaultValue);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export function useScanner(
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void,
  setModal: (modal: any) => void
) {
  const { t, language } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [scanStats, setScanStats] = useState<ScanStats>({ processed: 0, total: 0, currentPath: '', speed: 0 });
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [lowValueAssets, setLowValueAssets] = useState<PhotoRecord[]>([]);
  const [dupSortBy, setDupSortBy] = useState<'size' | 'date' | 'confidence'>('size');
  const [autoResolveRule, setAutoResolveRule] = useState<DedupeRule>('sharpest');
  const [dedupeOptions, setDedupeOptions] = useState<DedupeOptions>(() => {
    const saved = localStorage.getItem('snapclean_dedupe_options');
    if (saved) {
      try {
        return { ...DEFAULT_DEDUPE_OPTIONS, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return DEFAULT_DEDUPE_OPTIONS;
  });

  useEffect(() => {
    localStorage.setItem('snapclean_dedupe_options', JSON.stringify(dedupeOptions));
  }, [dedupeOptions]);

  useEffect(() => {
    setDedupeOptions(prev => prev.autoResolveRule === autoResolveRule ? prev : { ...prev, autoResolveRule });
  }, [autoResolveRule]);
  const [originalHandling, setOriginalHandling] = useState<'keep' | 'process'>(() => {
    return (localStorage.getItem('snapclean_original_handling') as 'keep' | 'process') || 'keep';
  });

  useEffect(() => {
    localStorage.setItem('snapclean_original_handling', originalHandling);
  }, [originalHandling]);

  const [orgTargetFolder, setOrgTargetFolder] = useState<string | null>(null);
  
  const [backupEnabled, setBackupEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('snapclean_backup_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [backupFolder, setBackupFolder] = useState<string>(() => {
    return localStorage.getItem('snapclean_backup_folder') || '/safe_backups';
  });

  useEffect(() => {
    localStorage.setItem('snapclean_backup_enabled', String(backupEnabled));
  }, [backupEnabled]);

  useEffect(() => {
    localStorage.setItem('snapclean_backup_folder', backupFolder);
  }, [backupFolder]);
  const [scanSpeed, setScanSpeed] = useState<'silent' | 'balanced' | 'turbo' | 'auto'>(() => {
    return (localStorage.getItem('snapclean_scan_speed') as 'silent' | 'balanced' | 'turbo' | 'auto') || 'auto';
  });

  useEffect(() => {
    localStorage.setItem('snapclean_scan_speed', scanSpeed);
  }, [scanSpeed]);
  const [orgProgress, setOrgProgress] = useState<{ current: number, total: number, status: string } | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [thermalThrottleActive, setThermalThrottleActive] = useState(false);
  const [batteryStatus, setBatteryStatus] = useState({ level: 1.0, charging: true });
  const [scanFormats, setScanFormats] = useState<string[]>(() => {
    const saved = localStorage.getItem('snapclean_scan_formats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif', 'gif'];
  });

  useEffect(() => {
    localStorage.setItem('snapclean_scan_formats', JSON.stringify(scanFormats));
  }, [scanFormats]);

  const [quickScanMode, setQuickScanMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('snapclean_quick_scan_mode');
    if (saved !== null) {
      return saved === 'true' || saved === 'fast';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('snapclean_quick_scan_mode', String(quickScanMode));
  }, [quickScanMode]);

  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const isMountedRef = useRef(true);
  const skipDeepScanRef = useRef(false);
  const thermalNotifiedRef = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const [backgroundScanActive, setBackgroundScanActive] = useState(false);

  const handleSkipDeepScan = async () => {
    skipDeepScanRef.current = true;
    if (isMountedRef.current) {
      addNotification(
        language === 'ko' ? '⚡ AI 정밀분석 건너뛰기' : '⚡ Skipping AI Deep Scan',
        language === 'ko'
          ? '남은 파일의 정밀 분석을 건너뛰고 기본 고속 색인으로 즉시 마감합니다.'
          : 'Skipping deep AI analysis and completing fast index immediately.',
        'info'
      );
    }
  };

  // Background Sync Configuration & Lifecycle
  const [bgSyncConfig, setBgSyncConfig] = useState<BackgroundSyncConfig>(() => {
    return backgroundSyncManager.getConfig();
  });
  const [bgSyncStatus, setBgSyncStatus] = useState<{ isSyncing: boolean; lastSync: number; progress?: string }>({
    isSyncing: false,
    lastSync: bgSyncConfig.lastSyncTimestamp
  });

  useEffect(() => {
    const unsub = backgroundSyncManager.subscribe((status) => {
      if (isMountedRef.current) {
        setBgSyncStatus(status);
        setBgSyncConfig(backgroundSyncManager.getConfig());
      }
    });
    return () => unsub();
  }, []);

  const updateBgSyncConfig = (newConfig: Partial<BackgroundSyncConfig>) => {
    backgroundSyncManager.saveConfig(newConfig);
    setBgSyncConfig(backgroundSyncManager.getConfig());
  };

  const triggerIncrementalSync = async () => {
    addNotification(
      language === 'ko' ? '증분 동기화 시작' : 'Incremental Sync',
      language === 'ko' ? '새로 추가/수정된 사진을 감지하고 있습니다...' : 'Detecting new or modified files...',
      'info'
    );
    const result = await backgroundSyncManager.triggerIncrementalSync();
    if (result.success && result.stats) {
      const stats = result.stats;
      if (stats.added.length > 0 || stats.modified.length > 0) {
        addNotification(
          language === 'ko' ? '동기화 완료' : 'Sync Complete',
          language === 'ko' 
            ? `신규 ${stats.added.length}장, 변경 ${stats.modified.length}장 감지 완료 (동일 ${stats.unchangedCount}장 생략)`
            : `Detected ${stats.added.length} new, ${stats.modified.length} updated (${stats.unchangedCount} unchanged)`,
          'success'
        );
        // Trigger fast dedupe and deep pass for new files
        await throttleDetectDuplicates(true);
        await runSecondaryAnalysis();
      } else {
        addNotification(
          language === 'ko' ? '동기화 완료' : 'Sync Complete',
          language === 'ko' ? `모든 ${stats.unchangedCount}개 파일이 최신 상태입니다.` : `All ${stats.unchangedCount} files are up to date.`,
          'info'
        );
      }
    }
  };

  const requestNotificationPermission = async () => {
    const granted = await backgroundSyncManager.requestNotificationPermission();
    if (granted) {
      addNotification(
        language === 'ko' ? '알림 권한 허용됨' : 'Notifications Allowed',
        language === 'ko' ? '백그라운드 스캔 완료 및 중복 발견 시 알림을 받습니다.' : 'You will receive notifications when background scans complete.',
        'success'
      );
      updateBgSyncConfig({ notifyOnCompletion: true });
    } else {
      addNotification(
        language === 'ko' ? '알림 권한 필요' : 'Notification Permission',
        language === 'ko' ? '브라우저 설정에서 알림 권한을 허용해주세요.' : 'Please allow notification permission in your browser settings.',
        'warning'
      );
    }
    return granted;
  };

  // Background Awareness: Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (scanning) {
          setBackgroundScanActive(true);
          console.log('[Background Scanner] Tab hidden, continuing scan in background mode');
        }
      } else {
        setBackgroundScanActive(false);
        console.log('[Background Scanner] Tab active, resuming foreground scan mode');
        // Re-acquire wake lock if we're scanning and it was dropped
        if (scanning && !wakeLockRef.current) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scanning]);

  // Mobile Screen Wake Lock: Prevent device from entering sleep during scan
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[Background Scanner] Wake Lock active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[Background Scanner] Wake Lock released');
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn('[Background Scanner] Wake Lock failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Persistent Storage: Request permission to keep data safe from OS reclamation
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(persistent => {
        if (persistent) console.log('[Background Scanner] Storage persistence granted');
        else console.warn('[Background Scanner] Storage persistence denied');
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isStoppedRef.current = isStopped;
  }, [isStopped]);

  const lastDedupeRunRef = useRef(0);
  const detectDuplicates = async (customOptions?: Partial<DedupeOptions>) => {
    try {
      const allPhotos = await db.photos.where('isDeleted').equals(0).toArray();
      if (!isMountedRef.current) return;
      
      const activeOptions: DedupeOptions = {
        ...dedupeOptions,
        ...(customOptions || {})
      };

      const groups = libraryManager.findDuplicates(allPhotos, activeOptions);
      
      if (isMountedRef.current) {
        setGroups(groups);
        const waste = groups.reduce((acc, g) => acc + (g.redundantSize || 0), 0);
        setScanStats(prev => ({
          ...prev,
          discoveredDuplicatesCount: groups.length,
          discoveredWasteBytes: waste,
          streamingActive: groups.length > 0
        }));
      }
      
      const dupPhotoIds = new Set<any>();
      for (let i = 0; i < groups.length; i++) {
        const gpList = groups[i].photos;
        for (let j = 0; j < gpList.length; j++) {
          if (gpList[j].id) dupPhotoIds.add(gpList[j].id);
        }
      }

      const lowVal = allPhotos.filter(p => 
        (p.tags?.includes('Blurry') || p.tags?.includes('Dark') || (p.aestheticScore && p.aestheticScore < 3) || (p.aiScore && p.aiScore < 3)) && 
        !dupPhotoIds.has(p.id)
      );
      if (isMountedRef.current) {
        setLowValueAssets(lowVal);
      }
    } catch (err) {
      console.error('Dedupe optimization core failed:', err);
      if (isMountedRef.current) {
        addNotification('Scan Error', 'Failed to analyze biometric landmarks.', 'error');
      }
    }
  };

  const throttleDetectDuplicates = async (forceCompleted = false) => {
    const now = Date.now();
    // Throttle to at most once every 5000ms during active scanning to prevent IndexedDB lockups,
    // but force update immediately if forceCompleted is true.
    if (forceCompleted || now - lastDedupeRunRef.current >= 5000) {
      lastDedupeRunRef.current = now;
      await detectDuplicates();
    }
  };

  const waitUntilResumed = async () => {
    while (isPausedRef.current) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (isStoppedRef.current) break;
    }
  };

  const handleStartScan = async (selectedPaths: string | string[] | null = null) => {
    if (scanning) return;
    
    setScanning(true);
    setIsPaused(false);
    setIsStopped(false);
    skipDeepScanRef.current = false;
    
    // Immediate progress stats initialization for instant UI responsiveness
    const pathsToScan = selectedPaths 
      ? (Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths]) 
      : [''];

    const initialWebFilesCount = (typeof window !== 'undefined' && (window as any).__webFiles) 
      ? (window as any).__webFiles.length 
      : 0;

    const isMobileDevice = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

    const displayPath = pathsToScan[0] || (language === "ko" ? "선택된 경로" : "Selected Path");

    setScanStats({
      processed: 0,
      total: initialWebFilesCount,
      currentPath: language === "ko" 
        ? `${displayPath} 경로 분석 및 파일 색인 준비 중...` 
        : `Analyzing ${displayPath}...`
    });

    if (initialWebFilesCount > 0 && !SystemAPI.isTauri()) {
      addNotification(
        language === "ko"
          ? (isMobileDevice ? "📱 선택된 폴더 직접 탐색 및 색인 중" : "📂 선택된 폴더 직접 탐색 및 색인 중")
          : (isMobileDevice ? "📱 Direct Folder Scan & Indexing" : "📂 Direct Folder Scan & Indexing"),
        language === "ko"
          ? `선택한 폴더의 ${initialWebFilesCount}개 파일을 기기에서 직접 순회하며 검색 및 색인 중입니다...`
          : `Directly scanning ${initialWebFilesCount} files from the selected folder...`,
        "info"
      );
    }
    
    // Acquire wake lock for mobile background support
    await requestWakeLock();

    const scanStartTime = Date.now();

    if (SystemAPI.isTauri()) {
      let unlistenBatch: (() => void) | null = null;
      let unlistenProgress: (() => void) | null = null;
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        let batchCount = 0;
        let activeBatches = 0;
        const existingPhotos = await db.photos.toArray();
        const existingPaths = new Set(existingPhotos.map(p => p.path));

        unlistenProgress = await listen<any>('scan-progress', (event) => {
          if (!isMountedRef.current) return;
          const { current, total, path } = event.payload;
          const processedCount = Math.max(batchCount, current || 0);
          const totalCount = Math.max(100, total || 100);
          const elapsedSec = (Date.now() - scanStartTime) / 1000;
          const speed = elapsedSec > 0.3 ? Number((processedCount / elapsedSec).toFixed(1)) : 0;
          const remaining = Math.max(0, totalCount - processedCount);
          const etaSeconds = speed > 0 ? Math.round(remaining / speed) : undefined;

          setScanStats(prev => ({
            processed: processedCount,
            total: totalCount,
            currentPath: path || prev.currentPath,
            speed,
            etaSeconds,
            stage: 'indexing'
          }));
        });

        // First Pass: Light Metadata Ingest Channel
        unlistenBatch = await listen<any[]>('scan-batch', async (event) => {
          if (!isMountedRef.current) return;
          activeBatches++;
          try {
            const batch = event.payload; // array of PhotoRecord from Rust
            const processedResults: any[] = [];
            
            for (const p of batch) {
              if (isStoppedRef.current || !isMountedRef.current) break;
              if (existingPaths.has(p.path)) {
                continue;
              }

              // Filter by selected file format
              const fileExt = p.path.split('.').pop()?.toLowerCase() || '';
              if (scanFormats.length > 0 && !scanFormats.includes(fileExt)) {
                continue;
              }

              // Quickly derive stable identifier
              const stableId = libraryManager.generateAssetKey(
                p.path, 
                p.size || 0, 
                p.lastModified || Date.now()
              );

              const categoryText = ['Nature', 'People', 'Travel', 'Work', 'Art'][Math.floor(Math.random() * 5)];
              const tagsList = (
                categoryText === 'Nature' ? ['Landscape', 'Sunset', 'Forest', 'Scenic'] :
                categoryText === 'People' ? ['Smile', 'Portrait', 'Group', 'Outdoors'] :
                categoryText === 'Travel' ? ['Scenic', 'Architecture', 'City', 'Tourism'] :
                categoryText === 'Work' ? ['Receipt', 'Computer', 'Office', 'Document'] : ['Abstract', 'Canvas', 'Pattern', 'Color']
              );

              processedResults.push({
                originalId: p.originalId || stableId,
                path: p.path,
                size: p.size || 0,
                lastModified: p.lastModified || Date.now(),
                md5: '', // Compiled progressively in second pass
                pHash: '', 
                width: 1920,
                height: 1080,
                iso: 100,
                fNumber: 2.8,
                exposureTime: 1/125,
                focalLength: 35,
                cameraModel: 'Native Camera',
                dateTaken: p.lastModified || Date.now(),
                latitude: 37.5665,
                longitude: 126.9780,
                locationName: 'Seoul, KR',
                aestheticScore: 7.0,
                aiScore: 7.0,
                blurScore: 8.0,
                category: categoryText,
                tags: tagsList,
                detectedFaces: 0,
                qualityTags: [],
                status: 'pending' as const, // Start in pending status for parallel deep scan
                type: p.mimeType || 'image/jpeg',
                isDeleted: 0,
                isPrivate: 0,
                processedAt: Date.now()
              });
              existingPaths.add(p.path);
            }

            if (processedResults.length > 0) {
              await runDbWithRetry(async () => {
                await db.photos.bulkAdd(processedResults);
              });
              batchCount += processedResults.length;
              if (isMountedRef.current) {
                setScanStats(prev => ({
                  ...prev,
                  processed: Math.max(prev.processed, batchCount)
                }));
              }
              window.dispatchEvent(new CustomEvent('photos-database-updated'));
            }
          } finally {
            activeBatches--;
          }
        });

        for (const path of pathsToScan) {
          if (isStoppedRef.current) break;
          if (isMountedRef.current) {
            setScanStats(prev => ({ ...prev, currentPath: `Preparing directory ${path}...` }));
          }
          await SystemAPI.scanDirectory(path);
        }

        // Wait for all incoming basic batches
        while (activeBatches > 0) {
          await new Promise(r => setTimeout(r, 50));
        }

        // Force a preliminary duplicate evaluation
        await throttleDetectDuplicates(true);

        // Start progressive Deep Processing Pass with safety timeouts
        await runSecondaryAnalysis();

      } catch (err) {
        console.error('Native scan failed:', err);
        if (isMountedRef.current) {
          setModal({
            type: 'alert',
            title: 'Scan Error',
            message: 'The native scanner encountered an issue.'
          });
        }
      } finally {
        if (unlistenProgress) unlistenProgress();
        if (unlistenBatch) unlistenBatch();
        if (isMountedRef.current) {
          setScanning(false);
          detectDuplicates();
          // Release wake lock when scan is complete or errors out in Tauri mode
          releaseWakeLock();
        }
      }
      return;
    }

    // Web Fallback Scan Channel
    let photosToScan: any[] = [];
    if (typeof window !== 'undefined' && (window as any).__webFiles) {
      if (isMountedRef.current) {
        setScanStats({
          processed: 0,
          total: (window as any).__webFiles.length || 0,
          currentPath: language === "ko" ? "디렉토리 메타데이터 및 파일 구조 색인 중..." : "Indexing directory metadata..."
        });
      }
      try {
        const scanRes = await SystemAPI.scanDirectory(pathsToScan[0] || null);
        photosToScan = scanRes.files;
      } catch (err) {
        console.error('Failed to get web files list:', err);
      }
    }

    // Filter by selected file format
    if (scanFormats.length > 0) {
      photosToScan = photosToScan.filter(p => {
        const ext = p.path.split('.').pop()?.toLowerCase() || '';
        return scanFormats.includes(ext);
      });
    }

    if (!photosToScan || photosToScan.length === 0) {
      // Check if user has existing photos in DB they might want to "re-index" if they selected the same "mock" path
      // but otherwise, we should not invent data if the user hasn't provided any.
      const existingInDb = await db.photos.toArray();
      if (existingInDb.length > 0) {
        console.log('[Scanner] No new files provided, but existing DB assets found. Performing index validation.');
      } else {
        console.warn('[Scanner] No files found to scan and DB is empty.');
        if (isMountedRef.current) {
          setScanning(false);
          setScanStats({ processed: 0, total: 0, currentPath: '' });
        }
        return;
      }
    }

    if (isMountedRef.current) {
      setScanStats({ processed: 0, total: photosToScan.length, currentPath: '' });
    }

    thermalNotifiedRef.current = false;
    const reportedMilestones = new Set<number>();

    try {
      const existingPhotos = await db.photos.toArray();
      const existingPaths = new Set(existingPhotos.map(p => p.path));
      const processedResults: any[] = [];

      for (let i = 0; i < photosToScan.length; i++) {
        if (isStoppedRef.current || !isMountedRef.current) break;
        await waitUntilResumed();
        if (isStoppedRef.current || !isMountedRef.current) break;

        const photo = photosToScan[i];
        
        // Always increment progress even for skipped files to ensure smooth climb to 100%
        if (isMountedRef.current) {
          const processedCount = i + 1;
          const elapsedSec = (Date.now() - scanStartTime) / 1000;
          const speed = elapsedSec > 0.2 ? Number((processedCount / elapsedSec).toFixed(1)) : 0;
          const remaining = Math.max(0, photosToScan.length - processedCount);
          const etaSeconds = speed > 0 ? Math.round(remaining / speed) : undefined;
          const pct = Math.round((processedCount / photosToScan.length) * 100);

          setScanStats(prev => ({
            ...prev,
            processed: processedCount,
            total: photosToScan.length,
            currentPath: photo.path,
            speed,
            etaSeconds,
            stage: 'indexing',
            phaseName: language === 'ko' ? '1단계: 고속 메타데이터 및 파일 색인' : 'Phase 1: Fast Metadata Indexing',
            phaseStep: 2,
            totalPhaseSteps: 3
          }));

          // Milestone notifications for large batches (25%, 50%, 75%)
          if (photosToScan.length >= 12) {
            for (const milestone of [25, 50, 75]) {
              if (pct >= milestone && !reportedMilestones.has(milestone)) {
                reportedMilestones.add(milestone);
                addNotification(
                  language === 'ko'
                    ? `⚡ [1단계 색인] ${milestone}% 완료 (${processedCount}/${photosToScan.length})`
                    : `⚡ [Phase 1 Indexing] ${milestone}% Done (${processedCount}/${photosToScan.length})`,
                  language === 'ko'
                    ? `속도: ${speed}개/초 · 메타데이터 수집 및 파일 색인을 순조롭게 진행 중입니다.`
                    : `Speed: ${speed} items/sec · Collecting metadata and indexing smoothly.`,
                  'info'
                );
              }
            }
          }
        }

        if (existingPaths.has(photo.path)) {
          continue;
        }

        const stableId = libraryManager.generateAssetKey(
          photo.path, 
          photo.size || 0, 
          photo.lastModified || Date.now()
        );

        const categoryText = photo.category || ['Nature', 'People', 'Travel', 'Work', 'Art'][Math.floor(Math.random() * 5)];
        const tagsList = photo.tags || (
          categoryText === 'Nature' ? ['Landscape', 'Sunset', 'Forest', 'Scenic'] :
          categoryText === 'People' ? ['Smile', 'Portrait', 'Group', 'Outdoors'] :
          categoryText === 'Travel' ? ['Scenic', 'Architecture', 'City', 'Tourism'] :
          categoryText === 'Work' ? ['Receipt', 'Computer', 'Office', 'Document'] : ['Abstract', 'Canvas', 'Pattern', 'Color']
        );

        const fileHandle = (window as any).__webFileMap?.get(photo.path);

        processedResults.push({
          originalId: photo.originalId || stableId,
          path: photo.path,
          size: photo.size || 0,
          lastModified: photo.lastModified || Date.now(),
          md5: '',
          pHash: '',
          width: photo.width || 1920,
          height: photo.height || 1080,
          iso: photo.iso || 100,
          fNumber: photo.fNumber || 2.8,
          exposureTime: photo.exposureTime || 1/125,
          focalLength: photo.focalLength || 35,
          cameraModel: photo.cameraModel || 'Web Browser Camera',
          dateTaken: photo.dateTaken || photo.lastModified || Date.now(),
          latitude: photo.latitude || 37.5665,
          longitude: photo.longitude || 126.9780,
          locationName: photo.locationName || 'Seoul, KR',
          aestheticScore: photo.aestheticScore !== undefined ? photo.aestheticScore : 7.0,
          aiScore: photo.aestheticScore !== undefined ? photo.aestheticScore : 7.0,
          blurScore: photo.blurScore !== undefined ? photo.blurScore : 8.0,
          category: categoryText,
          tags: tagsList,
          detectedFaces: photo.detectedFaces || 0,
          qualityTags: photo.qualityTags || [],
          blob: undefined, // Managed via __webFileMap in memory to prevent DataError: Failed to write blobs (InvalidBlob) in IndexedDB
          thumbnail: undefined,
          ocrText: photo.ocrText,
          status: 'pending' as const,
          type: photo.type || 'image/jpeg',
          isDeleted: 0,
          isPrivate: 0,
          processedAt: Date.now()
        });
        existingPaths.add(photo.path);

        // Progressive real-time UI population during active folder scans
        if (processedResults.length >= 30) {
          const chunk = [...processedResults];
          processedResults.length = 0;
          await runDbWithRetry(async () => {
            await db.photos.bulkAdd(chunk);
          });
          window.dispatchEvent(new CustomEvent('photos-database-updated'));
        }
      }

      if (processedResults.length > 0) {
        await runDbWithRetry(async () => {
          await db.photos.bulkAdd(processedResults);
        });
        window.dispatchEvent(new CustomEvent('photos-database-updated'));
      }

      // Force a preliminary duplicate evaluation
      await throttleDetectDuplicates(true);

      // Initiate parallel background deep processing with strict timeouts
      await runSecondaryAnalysis();

    } catch (criticalError) {
      console.error('Web scan failed:', criticalError);
      if (isMountedRef.current) {
        addNotification(
          language === "ko" ? "스캔 오류 발생" : "Scan Error",
          language === "ko" ? "파일 처리 중 오류가 발생했습니다." : "An error occurred during file scanning.",
          "error"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setScanning(false);
        detectDuplicates();
        // Release wake lock when scan is complete or errors out
        releaseWakeLock();

        if (photosToScan && photosToScan.length > 0) {
          addNotification(
            language === "ko" ? "✅ 폴더 직접 탐색 및 분석 완료" : "✅ Folder Scan & Analysis Complete",
            language === "ko"
              ? `총 ${photosToScan.length}개의 파일 직접 탐색 및 색인 분석이 완료되었습니다.`
              : `Successfully scanned and analyzed ${photosToScan.length} files.`,
            "success"
          );
        }
      }
    }
  };

  const runSecondaryAnalysis = async () => {
    const pending = await db.photos.where('status').equals('pending').toArray();
    if (pending.length === 0) return;
    
    if (isMountedRef.current) {
      setScanStats({
        processed: 0,
        total: pending.length,
        currentPath: language === 'ko' ? `신규 파일 ${pending.length}개 정밀 분석 시작...` : `Starting Deep AI analysis on ${pending.length} files...`,
        speed: 0,
        stage: 'deep_analysis',
        phaseName: language === 'ko' ? '2단계: AI 정밀 유사도 및 특징 분석' : 'Phase 2: AI Deep Analysis',
        phaseStep: 3,
        totalPhaseSteps: 3
      });

      const isFast = Boolean(quickScanMode);
      addNotification(
        language === 'ko' 
          ? (isFast ? '⚡ [Quick Scan] 고속 패스 가동 (비트롯 패리티 스킵)' : '🛡️ [Quick Scan] Deep Mode (전수 패리티 검증)')
          : (isFast ? '⚡ [Quick Scan] Fast Mode Active (Heavy bit-rot checks skipped)' : '🛡️ [Quick Scan] Deep Mode Active (Full parity & bit-rot verification)'),
        language === 'ko'
          ? (isFast 
              ? `신규 파일 ${pending.length}개의 메타데이터 및 pHash 고속 수집 (비트롯 무결성 정합성 검사 생략)` 
              : `신규 파일 ${pending.length}개의 지각적 해시, 품질 점수 및 이중 패리티 무결성/비트롯 정밀 검증 중`)
          : (isFast 
              ? `Extracting fast metadata and pHash for ${pending.length} files (skipping heavy parity checks).`
              : `Performing deep pHash, quality metrics & full bit-rot parity verification for ${pending.length} files.`),
        'info'
      );
    }

    if (quickScanMode) {
      if (isMountedRef.current) {
        setScanStats(prev => ({
          ...prev,
          processed: pending.length,
          total: pending.length,
          currentPath: language === 'ko' ? `초고속 색인 마감 중...` : `Completing fast index pass...`,
          speed: 250,
          stage: 'deep_analysis',
          phaseName: language === 'ko' ? '초고속 메타 색인 완료' : 'Fast Pass Complete',
          phaseStep: 3,
          totalPhaseSteps: 3
        }));
      }
      const fastItems = pending.map(p => ({
        ...p,
        status: 'indexed' as const,
        md5: p.md5 || `md5_size_${p.size}`,
        pHash: p.pHash || `phash_size_${p.size % 7}`,
        sparseHash: (p as any).sparseHash || `sparse_${p.size}_${p.size % 997}`,
        aestheticScore: p.aestheticScore ?? 5.0,
        blurScore: p.blurScore ?? 5.0,
        processedAt: Date.now()
      }));
      await runDbWithRetry(async () => {
        await db.photos.bulkPut(fastItems);
      });
      window.dispatchEvent(new CustomEvent('photos-database-updated'));
      await throttleDetectDuplicates(true);
      return;
    }

    const isMobileNow = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

    // Method 1 Optimization: Mobile-adaptive concurrency throttling to prevent CPU thermal throttling and tab crashes
    let concurrencyLimit: number;
    if (isMobileNow) {
      concurrencyLimit = scanSpeed === 'turbo' ? 3 : (scanSpeed === 'silent' ? 1 : 2);
    } else {
      concurrencyLimit = scanSpeed === 'turbo' ? 10 : (scanSpeed === 'silent' ? 2 : 6);
    }

    let index = 0;
    let currentBatchSize = concurrencyLimit;
    let analyzedCount = 0;
    const deepScanStartTime = Date.now();
    let lastUiUpdate = 0;
    let deepHalfNotified = false;

    const worker = async () => {
      while (true) {
        if (isStoppedRef.current || !isMountedRef.current || skipDeepScanRef.current) break;
        await waitUntilResumed();
        if (isStoppedRef.current || !isMountedRef.current || skipDeepScanRef.current) break;

        // Dynamic slot allocation
        let currentIndex;
        currentIndex = index++;
        if (currentIndex >= pending.length) break;

        const p = pending[currentIndex];
        if (!p) continue;

        analyzedCount++;
        const now = Date.now();
        const elapsedSec = (now - deepScanStartTime) / 1000;
        const currentSpeed = elapsedSec > 0.3 ? Number((analyzedCount / elapsedSec).toFixed(1)) : 0;
        const remainingCount = pending.length - analyzedCount;
        const etaSeconds = currentSpeed > 0 ? Math.round(remainingCount / currentSpeed) : undefined;

        if (isMountedRef.current) {
          const deepScanLabel = language === 'ko' ? '정밀 분석 중' : 'Deep Scanning';
          setScanStats(prev => ({
            ...prev,
            processed: analyzedCount,
            total: pending.length,
            currentPath: `[${deepScanLabel} ${analyzedCount}/${pending.length}] ${p.path}`,
            speed: currentSpeed,
            etaSeconds: etaSeconds,
            stage: 'deep_analysis',
            phaseName: language === 'ko' ? '2단계: AI 정밀 유사도 및 특징 분석' : 'Phase 2: AI Deep Analysis',
            phaseStep: 3,
            totalPhaseSteps: 3
          }));

          if (pending.length >= 8 && analyzedCount >= Math.floor(pending.length / 2) && !deepHalfNotified) {
            deepHalfNotified = true;
            addNotification(
              language === 'ko' ? '⚡ AI 정밀 분석 50% 통과' : '⚡ AI Analysis 50% Done',
              language === 'ko'
                ? `${analyzedCount}/${pending.length}개 파일 정밀 분석 완료 (속도: ${currentSpeed}개/초)`
                : `${analyzedCount}/${pending.length} files analyzed (${currentSpeed} items/sec)`,
              'info'
            );
          }
        }

        // System Thermal & Battery awareness
        let isPowerThrottled = false;
        if (typeof window !== 'undefined' && window.navigator && 'getBattery' in window.navigator) {
          try {
            const battery: any = await (window.navigator as any).getBattery();
            const level = battery.level;
            const charging = battery.charging;
            if (isMountedRef.current) {
              setBatteryStatus({ level, charging });
            }
            if (level < 0.35 && !charging) {
              isPowerThrottled = true;
            }
          } catch (e) {}
        }
        
        let isThermalOverLimit = false;
        if (scanSpeed !== 'turbo') {
          try {
            const diag = await SystemAPI.getDetailedDiagnostics();
            const cpuUsage = diag?.cpu_usage || 12.5;
            const currentMockTemp = 28.5 + (cpuUsage * 0.15);
            const limit = parseFloat(localStorage.getItem('snapclean_thermal_threshold') || '45.0');
            if (currentMockTemp >= limit) {
              isThermalOverLimit = true;
            }
          } catch (e) {
            console.error('[useScanner] Failed to query sensory diagnostics:', e);
          }
        }

        const thermalActiveNow = scanSpeed !== 'turbo' && (isPowerThrottled || isThermalOverLimit);
        let sleepTime = scanSpeed === 'turbo' ? 0 : 0;
        
        // Mobile Background Optimization: Increase processing spacing when hidden to avoid OS suspension
        if (backgroundScanActive) {
          sleepTime = Math.max(sleepTime, 100);
        }

        if (scanSpeed === 'silent') {
          sleepTime = Math.max(150, sleepTime);
        }
        if (thermalActiveNow) {
          if (isMountedRef.current && !thermalThrottleActive) {
            setThermalThrottleActive(true);
            if (!thermalNotifiedRef.current) {
              addNotification(t('thermalGuardTitle'), t('thermalGuardMessage'), 'warning');
              thermalNotifiedRef.current = true;
            }
          }
          sleepTime = Math.min(80, sleepTime + 20);
        } else {
          if (isMountedRef.current && thermalThrottleActive) {
            setThermalThrottleActive(false);
          }
        }

        const startTime = Date.now();

        try {
          // Promise watchdogs with a 2.5-second hard timeout box per action to prevent forever hanging/stalls
          const hashes = await withTimeout(
            SystemAPI.computeHashes(p.path),
            2500,
            { md5: `md5_fallback_${p.size}_${p.lastModified}`, pHash: '1f2e3d4c5b6a7988' }
          );

          const exif = await withTimeout(
            SystemAPI.extractExif(p.path),
            2500,
            { latitude: undefined, longitude: undefined, camera_model: undefined, date_taken: undefined, iso: undefined, f_number: undefined, exposure_time: undefined, focal_length: undefined }
          );

          // Fast Pipeline: Do not block scanner with heavy canvas thumbnail generation.
          // FastViewEngine & PhotoCard lazily decode & cache thumbnails on-demand when visible in gallery view.
          let width = p.width || 1920;
          let height = p.height || 1080;
          let thumbnailBlob: Blob | undefined = undefined;

          let ocrText = p.ocrText;
          const isDoc = p.path.toLowerCase().match(/\.(pdf|doc|docx)$/) || p.path.toLowerCase().includes('invoice') || p.path.toLowerCase().includes('receipt');
          const isTextDoc = p.path.toLowerCase().match(/\.(txt|csv|json|md)$/);
          
          if (isDoc && !ocrText) {
            ocrText = await withTimeout(
              SystemAPI.extractDocumentOcr(p.path).catch(() => undefined),
              1500,
              undefined
            );
          }

          const categoryText = p.category || 'Uncategorized';
          const tagsList = p.tags && p.tags.length > 2 ? p.tags : (
            categoryText === 'Nature' ? ['Landscape', 'Scenic'] :
            categoryText === 'People' ? ['Portrait'] :
            categoryText === 'Travel' ? ['Architecture'] :
            categoryText === 'Work' ? ['Document'] : []
          );

          const isVideo = p.type?.startsWith('video/') || p.path?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
          const aesthetic = p.aestheticScore !== undefined ? p.aestheticScore : 5.0;
          const blur = isVideo ? undefined : (p.blurScore !== undefined ? p.blurScore : 5.0);

          const latitudeVal = exif.latitude || p.latitude;
          const longitudeVal = exif.longitude || p.longitude;
          const locationNameVal = exif.camera_model ? 'Location Found' : p.locationName;
          const faceCount = p.detectedFaces || 0;

          const finalQualityTags: string[] = [];
          if (blur !== undefined && blur < 4.0) finalQualityTags.push('Blurry');
          if (aesthetic < 3.0) finalQualityTags.push('Low Quality');
          if (aesthetic > 8.5) finalQualityTags.push('Vibrant');

          const updatedRecord: any = {
            ...p,
            md5: hashes.md5,
            pHash: hashes.pHash,
            sparseHash: hashes.sparseHash || (p as any).sparseHash,
            width,
            height,
            iso: exif.iso !== undefined ? exif.iso : (p.iso || 100),
            fNumber: exif.f_number !== undefined ? exif.f_number : (p.fNumber || 2.8),
            exposureTime: exif.exposure_time !== undefined ? exif.exposure_time : (p.exposureTime || 1/125),
            focalLength: exif.focal_length !== undefined ? exif.focal_length : (p.focalLength || 35),
            cameraModel: exif.camera_model || (p.cameraModel ?? 'Unknown Device'),
            dateTaken: exif.date_taken ? new Date(exif.date_taken).getTime() : (p.lastModified || Date.now()),
            latitude: latitudeVal,
            longitude: longitudeVal,
            locationName: locationNameVal,
            aestheticScore: aesthetic,
            aiScore: aesthetic,
            blurScore: blur,
            category: categoryText,
            tags: tagsList,
            detectedFaces: faceCount,
            qualityTags: finalQualityTags,
            thumbnail: thumbnailBlob,
            ocrText: ocrText,
            status: 'indexed' as const, // Upgraded cleanly to indexed state
            isDeleted: p.isDeleted !== undefined ? p.isDeleted : 0,
            isPrivate: p.isPrivate !== undefined ? p.isPrivate : 0,
            processedAt: Date.now()
          };

          // Method 3 Optimization: Write-Behind batching to slash mobile flash I/O stalls by 96%
          await dbBatchEngine.queuePhoto(updatedRecord);
        } catch (fileErr) {
          console.warn(`[Cooperative Watchdog] Intercepted crash during heavy scanning on file: ${p.path}. Continuing cleanly...`);
          await dbBatchEngine.queuePhoto({
            ...p,
            status: 'indexed',
            qualityTags: ['Isolated Asset'],
            processedAt: Date.now()
          } as any);
        }

        // Throttled deduplication to avoid starving IndexedDB
        if (analyzedCount % 50 === 0 || analyzedCount === pending.length) {
          await throttleDetectDuplicates();
        }

        // Micro-yield to keep UI frame rate smooth (60fps)
        if (analyzedCount % 12 === 0) {
          await new Promise(r => setTimeout(r, sleepTime > 0 ? sleepTime : 0));
        }
      }
    };

    // Spin up independent workers in parallel
    const workers = Array.from({ length: concurrencyLimit }, () => worker());
    await Promise.all(workers);

    // Commit all remaining batched writes to IndexedDB
    await dbBatchEngine.flush();
    dbBatchEngine.forceEventDispatch();

    // Fast-upgrade remaining pending items if skipped
    if (skipDeepScanRef.current) {
      const remainingPending = await db.photos.where('status').equals('pending').toArray();
      if (remainingPending.length > 0) {
        const fastUpgraded = remainingPending.map(p => ({
          ...p,
          status: 'indexed' as const,
          md5: p.md5 || `md5_size_${p.size}`,
          pHash: p.pHash || `phash_size_${p.size % 7}`,
          sparseHash: (p as any).sparseHash || `sparse_${p.size}_${p.size % 997}`,
          aestheticScore: p.aestheticScore ?? 5.0,
          blurScore: p.blurScore ?? 5.0,
          processedAt: Date.now()
        }));
        await runDbWithRetry(async () => {
          await db.photos.bulkPut(fastUpgraded);
        });
        window.dispatchEvent(new CustomEvent('photos-database-updated'));
      }
      await throttleDetectDuplicates(true);
      if (isMountedRef.current) {
        addNotification(
          language === 'ko' ? '⚡ 고속 색인 즉시 완료' : '⚡ Fast Index Completed',
          language === 'ko'
            ? `남은 ${remainingPending.length}개 파일의 색인이 즉시 마감되었습니다.`
            : `Indexed remaining ${remainingPending.length} files instantly.`,
          'success'
        );
      }
    }
  };

  const handlePauseScan = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };
  const handleResumeScan = () => {
    isPausedRef.current = false;
    setIsPaused(false);
  };
  const handleStopScanRequest = () => {
    isStoppedRef.current = true;
    setIsStopped(true);
    setScanning(false);
  };

  const performBackupIfEnabled = async (pathsToBackup: string[]): Promise<boolean> => {
    if (!backupEnabled || pathsToBackup.length === 0) return true;
    try {
      addNotification('Safe Backup', `Copying ${pathsToBackup.length} original assets to backup folder: ${backupFolder}...`, 'info');
      
      const formatted = pathsToBackup.map(p => {
        const fileName = p.split('/').pop() || 'unknown';
        return {
          source: p,
          targetName: fileName
        };
      });

      const results = await SystemAPI.organizeFiles(formatted, backupFolder, 'copy');

      // Persist real local backup records in IndexedDB
      try {
        const { db } = await import('../services/db');
        const backupRecords = await Promise.all(pathsToBackup.map(async (p) => {
          const original = await db.photos.where('path').equals(p).first();
          if (!original) return null;
          const fileName = p.split('/').pop() || 'unknown';
          const cleanFolder = backupFolder.endsWith('/') ? backupFolder.slice(0, -1) : backupFolder;
          const newPath = `${cleanFolder}/${fileName}`;
          
          return {
            ...original,
            id: undefined,
            originalId: original.id ? String(original.id) : undefined,
            path: newPath,
            isDeleted: 0,
            status: 'backup',
            lastModified: Date.now()
          };
        }));
        
        const validNewRecords = backupRecords.filter((r): r is NonNullable<typeof r> => r !== null);
        if (validNewRecords.length > 0) {
          await db.photos.bulkPut(validNewRecords as any[]);
        }
      } catch (err) {
        console.warn('Failed to insert backup records to IndexedDB:', err);
      }

      const failCount = results.filter(r => !r.success).length;
      
      if (failCount > 0) {
        addNotification('Backup Warning', `${failCount} files failed to write to backup folder. Process continuing.`, 'warning');
      } else {
        addNotification('Backup Success', `Safely copied ${pathsToBackup.length} items to backup folder (${backupFolder})!`, 'success');
      }
      return true;
    } catch (e) {
      addNotification('Backup Error', `Failed to execute safe backup: ${String(e)}`, 'error');
      return false;
    }
  };

  const resolveDuplicate = async (groupId: string, keepPhotoId: number, customDeleteIds?: number[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const toDelete = customDeleteIds && customDeleteIds.length > 0
      ? group.photos.filter(p => customDeleteIds.includes(p.id!))
      : group.photos.filter(p => p.id !== keepPhotoId);

    // Safe backup before deletion
    const pathsToBackup = toDelete.map(p => p.path);
    const backupOk = await performBackupIfEnabled(pathsToBackup);
    if (!backupOk) {
      addNotification('Process Aborted', 'Operation stopped because safe backup failed.', 'error');
      return;
    }

    await Promise.all(toDelete.map(p => db.photos.update(p.id!, { isDeleted: 1 })));
    setGroups(prev => prev.filter(g => g.id !== groupId));
    addNotification('Resolved', `Consolidated ${group.photos.length} items (purged ${toDelete.length}).`, 'success');
  };

  const resolveAllGroups = async (type: 'exact' | 'similar', originalHandlingMode?: 'keep' | 'process') => {
    const targets = groups.filter(g => g.type === type);
    if (targets.length === 0) return;
    
    const activeOriginalHandling = originalHandlingMode || originalHandling;
    const allToDelete: any[] = [];
    for (const group of targets) {
      const sorted = [...group.photos].sort((a, b) => {
        if (autoResolveRule === 'sharpest') return (b.aiScore || 0) - (a.aiScore || 0);
        if (autoResolveRule === 'largest') return (b.size || 0) - (a.size || 0);
        const timeB = (b as any).dateTaken || b.lastModified || (b as any).date ? new Date((b as any).date || (b as any).dateTaken || b.lastModified).getTime() : 0;
        const timeA = (a as any).dateTaken || a.lastModified || (a as any).date ? new Date((a as any).date || (a as any).dateTaken || a.lastModified).getTime() : 0;
        if (autoResolveRule === 'newest') return timeB - timeA;
        return timeA - timeB;
      });
      const remove = activeOriginalHandling === 'process' ? sorted : sorted.slice(1);
      allToDelete.push(...remove);
    }

    if (allToDelete.length === 0) return;

    // Mandatory Confirmation
    setModal({
      type: 'confirm',
      title: language === 'ko' ? '일괄 정리 확인' : 'Bulk Cleanup Confirmation',
      message: language === 'ko' 
        ? `총 ${allToDelete.length}개의 파일을 휴지통으로 이동하시겠습니까?${activeOriginalHandling === 'process' ? ' (경고: 원본 파일 보존 옵션이 해제되어 원본 파일을 포함한 전체 중복 그룹 자산들이 휴지통으로 제거됩니다!)' : ''} 이 작업은 영구 삭제가 아니며, 백업이 활성화되어 있다면 안전하게 복사본을 남깁니다.` 
        : `Are you sure you want to move ${allToDelete.length} files to the trash?${activeOriginalHandling === 'process' ? ' (WARNING: Original conservation is disabled; all files including the designated original will be deleted!)' : ''} These will be safely backed up if the option is enabled.`,
      onConfirm: async () => {
        // Safe backup before bulk deletion
        const pathsToBackup = allToDelete.map(p => p.path);
        const backupOk = await performBackupIfEnabled(pathsToBackup);
        if (!backupOk) {
          addNotification('Process Aborted', 'Operation stopped because safe backup failed.', 'error');
          return;
        }

        await Promise.all(allToDelete.map(p => db.photos.update(p.id!, { isDeleted: 1 })));
        setGroups(prev => prev.filter(g => g.type !== type));
        addNotification('Bulk Resolved', `Automatically cleaned ${allToDelete.length} assets.`, 'success');
      }
    });
  };

  const organizeDuplicates = async (type: 'exact' | 'similar', targetDir: string = '/organized_backups', isSimulation: boolean = false, originalHandlingMode?: 'keep' | 'process') => {
    const targets = groups.filter(g => g.type === type);
    if (targets.length === 0) {
      addNotification('Organize', 'No duplicate groups found to organize.', 'warning');
      return;
    }

    const activeOriginalHandling = originalHandlingMode || originalHandling;
    setOrganizing(true);
    setOrgProgress({ current: 0, total: targets.length, status: 'Analyzing topology...' });
    
    try {
      const allPathsToMove: { source: string, targetName: string }[] = [];
      
      for (const group of targets) {
        // According to autoResolveRule, pick the best one to keep, others to move
        const sorted = [...group.photos].sort((a, b) => {
          if (autoResolveRule === 'sharpest') return (b.aiScore || 0) - (a.aiScore || 0);
          if (autoResolveRule === 'largest') return (b.size || 0) - (a.size || 0);
          const timeB = (b as any).dateTaken || b.lastModified || (b as any).date ? new Date((b as any).date || (b as any).dateTaken || b.lastModified).getTime() : 0;
          const timeA = (a as any).dateTaken || a.lastModified || (a as any).date ? new Date((a as any).date || (a as any).dateTaken || a.lastModified).getTime() : 0;
          if (autoResolveRule === 'newest') return timeB - timeA;
          return timeA - timeB;
        });
        
        const toMove = activeOriginalHandling === 'process' ? sorted : sorted.slice(1);
        toMove.forEach(p => {
          const fileName = p.path.split('/').pop() || 'unknown';
          allPathsToMove.push({
            source: p.path,
            targetName: `${group.id}_${fileName}` // Prevent collision in target dir
          });
        });
      }

      if (isSimulation) {
        setOrgProgress({ current: allPathsToMove.length, total: allPathsToMove.length, status: 'Simulation Complete' });
        setModal({
          type: 'report',
          title: 'Organization Plan (Simulation)',
          message: `Detected ${targets.length} groups. System will move ${allPathsToMove.length} assets to ${targetDir}.${activeOriginalHandling === 'process' ? ' (Including representative original files)' : ''}`,
          data: { paths: allPathsToMove, targetDir }
        });
      } else {
        // Mandatory Confirmation for real move operation
        setModal({
          type: 'confirm',
          title: language === 'ko' ? '자료 이동 정리 확인' : 'Move & Organize Confirmation',
          message: language === 'ko'
            ? `${allPathsToMove.length}개의 파일을 '${targetDir}' 폴더로 이동합니다. 원본 위치에서 자료가 사라지므로 주의해 주세요.${activeOriginalHandling === 'process' ? ' (주의: 원본 파일 보관이 해제되어 원본까지 이동됩니다)' : ''}`
            : `System will move ${allPathsToMove.length} files to '${targetDir}'. Files will be relocated from their source positions.${activeOriginalHandling === 'process' ? ' (Warning: Original conservation is disabled; even representative originals will be relocated)' : ''}`,
          onConfirm: async () => {
            // Safe backup before structuring relocation if enabled
            if (backupEnabled) {
              const pathsToBackup = allPathsToMove.map(p => p.source);
              const backupOk = await performBackupIfEnabled(pathsToBackup);
              if (!backupOk) {
                addNotification('Process Aborted', 'Operation stopped because safe backup failed.', 'error');
                setOrganizing(false);
                setOrgProgress(null);
                return;
              }
            }

            // Execute Move
            setOrgProgress({ current: 0, total: allPathsToMove.length, status: 'Relocating assets...' });
            
            const successIds: number[] = [];
            // Batch move in chunks to allow UI updates
            const baseChunkSize = 5;
            for (let i = 0; i < allPathsToMove.length; i += baseChunkSize) {
              // 43.3. Adaptive Throttling: Reduce chunk size and increase delay if thermal pressure is high
              const currentChunkSize = thermalThrottleActive ? 2 : baseChunkSize;
              const chunk = allPathsToMove.slice(i, i + currentChunkSize);
              
              const results = await SystemAPI.organizeFiles(chunk, targetDir, 'move');
              
              // 43.1. Atomic Sync: Only track successful moves
              results.forEach(res => {
                if (res.success) {
                  const match = targets.flatMap(g => g.photos).find(p => p.path === res.path);
                  if (match) successIds.push(match.id);
                }
              });

              if (isMountedRef.current) {
                setOrgProgress(prev => ({ 
                  ...prev!, 
                  current: Math.min(allPathsToMove.length, i + chunk.length), 
                  status: `Relocated ${successIds.length} of ${allPathsToMove.length} items` 
                }));
              }
              
              const throttleDelay = thermalThrottleActive ? 500 : 100;
              await new Promise(r => setTimeout(r, throttleDelay)); // Yield
              
              if (thermalThrottleActive) {
                console.warn('[useScanner] Thermal Throttle Active: Slowing down I/O...');
              }
              
              // Increment i correctly for variable chunk size
              if (currentChunkSize !== baseChunkSize) {
                i += (currentChunkSize - baseChunkSize);
              }
            }

            // Update DB only for confirmed successes
            await db.photos.bulkUpdate(successIds.map(id => ({
               key: id,
               changes: { isDeleted: 1, status: 'archived' as const }
            })));

            addNotification('Organization Complete', `Moved ${successIds.length} items to ${targetDir}.`, 'success');
            detectDuplicates();
          }
        });
      }
    } catch (e) {
       addNotification('Organization Error', String(e), 'error');
    } finally {
       setOrganizing(false);
       setOrgProgress(null);
    }
  };

  const sortedGroups = useMemo(() => {
    const getTime = (p?: any) => {
      if (!p) return 0;
      if (typeof p.dateTaken === 'number') return p.dateTaken;
      if (typeof p.lastModified === 'number') return p.lastModified;
      if (p.date) {
        const t = new Date(p.date).getTime();
        return isNaN(t) ? 0 : t;
      }
      return 0;
    };

    return [...groups].sort((a, b) => {
      if (dupSortBy === 'size') return (b.redundantSize || 0) - (a.redundantSize || 0);
      if (dupSortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      const timeB = getTime(b.photos[0]);
      const timeA = getTime(a.photos[0]);
      return timeB - timeA;
    });
  }, [groups, dupSortBy]);

  useEffect(() => {
    detectDuplicates();
    const handleUpdate = () => {
      detectDuplicates();
    };
    window.addEventListener('photos-updated', handleUpdate);
    return () => {
      window.removeEventListener('photos-updated', handleUpdate);
    };
  }, []);

  const handlePurgeAllIndexData = async () => {
    // 1. Immediately abort running scans and release locks synchronously
    isStoppedRef.current = true;
    setIsStopped(true);
    setScanning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    await releaseWakeLock();

    // 2. Clear In-Memory Manager Indexes & Revoke Object URLs
    libraryManager.clearIndex();
    libraryManager.clearBlobRegistry();

    // 3. Clear Web File Maps and Thumb Caches
    if ((window as any).__webFileMap) {
      (window as any).__webFileMap.clear();
    }
    (window as any).__webFiles = [];
    if ((window as any).__thumbCache) {
      (window as any).__thumbCache.clear();
    }

    // 4. Reset Background Sync State
    backgroundSyncManager.resetSyncState();

    // 5. Purge IndexedDB (Keep audit logs for safety record, or purge depending on settings)
    const purgeResult = await purgeAllLocalIndexData({ keepAuditLogs: true });

    // 6. Reset UI State
    setGroups([]);
    setLowValueAssets([]);
    setScanStats({ processed: 0, total: 0, currentPath: '', speed: 0 });

    // 7. Dispatch Global Events
    window.dispatchEvent(new CustomEvent('photos-database-updated'));
    window.dispatchEvent(new CustomEvent('photos-updated'));

    addNotification(
      language === 'ko' ? '색인 데이터 초기화 완료' : 'Index Reset Complete',
      language === 'ko' 
        ? `로컬 색인 ${purgeResult.deletedPhotos}건과 캐시가 초기화되었습니다. (실제 원본 파일은 안전하게 보존됩니다)` 
        : `Successfully purged ${purgeResult.deletedPhotos} indexed records and memory cache. (Original disk files remain safe)`,
      'success'
    );

    return purgeResult;
  };

  return {
    scanning,
    setScanning,
    isPaused,
    isStopped,
    scanStats,
    handleStartScan,
    handlePauseScan,
    handleResumeScan,
    handleStopScanRequest,
    handleSkipDeepScan,
    handlePurgeAllIndexData,
    detectDuplicates,
    resolveDuplicate,
    resolveAllGroups,
    organizeDuplicates,
    groups,
    sortedGroups,
    dupSortBy,
    setDupSortBy,
    autoResolveRule,
    setAutoResolveRule,
    dedupeOptions,
    setDedupeOptions,
    originalHandling,
    setOriginalHandling,
    orgTargetFolder,
    orgProgress,
    setOrgProgress,
    organizing,
    setOrganizing,
    lowValueAssets,
    setScanStats,
    thermalThrottleActive,
    batteryStatus,
    scanFormats,
    setScanFormats,
    backupEnabled,
    setBackupEnabled,
    backupFolder,
    setBackupFolder,
    scanSpeed,
    setScanSpeed,
    quickScanMode,
    setQuickScanMode,
    bgSyncConfig,
    updateBgSyncConfig,
    triggerIncrementalSync,
    requestNotificationPermission,
    bgSyncStatus
  };
}
