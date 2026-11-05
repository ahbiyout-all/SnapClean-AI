import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  Trash2,
  RefreshCw,
  Zap,
  ShieldCheck,
  Activity,
  HardDrive,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
  Info
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { fileWatcherService, FileWatcherStatus } from '../../services/fileWatcherService';
import { SystemAPI } from '../../services/systemApi';
import { LegacySettings } from '../LegacySettings';

interface SettingsTabProps {
  addNotification?: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  quickScanMode?: boolean;
  setQuickScanMode?: (val: boolean) => void;
  scanFormats?: string[];
  setScanFormats?: (formats: string[]) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  addNotification,
  quickScanMode = true,
  setQuickScanMode,
  scanFormats,
  setScanFormats,
}) => {
  const { t, language } = useI18n();

  // File Watcher Service status subscription
  const [watcherStatus, setWatcherStatus] = useState<FileWatcherStatus>(() => fileWatcherService.getStatus());
  const [isScanningNow, setIsScanningNow] = useState(false);
  const [newPathInput, setNewPathInput] = useState('');
  const [showAddPathForm, setShowAddPathForm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'legacy'>('general');

  useEffect(() => {
    const unsub = fileWatcherService.subscribe((status) => {
      setWatcherStatus(status);
    });
    return () => unsub();
  }, []);

  const handleToggleBackgroundScanning = async () => {
    const nextState = !watcherStatus.isEnabled;
    await fileWatcherService.setEnabled(nextState);

    if (addNotification) {
      addNotification(
        language === 'ko'
          ? (nextState ? '백그라운드 스캔 활성화됨' : '백그라운드 스캔 비활성화됨')
          : (nextState ? 'Background Scanning Enabled' : 'Background Scanning Disabled'),
        language === 'ko'
          ? (nextState
              ? '파일 감시자 서비스가 시작되었습니다. 앱 실행 시 자동으로 기동됩니다.'
              : '파일 감시자 서비스가 중지되었습니다.')
          : (nextState
              ? 'File watcher service started and will initialize automatically on application start.'
              : 'File watcher service stopped.'),
        nextState ? 'success' : 'info'
      );
    }
  };

  const handleManualScanNow = async () => {
    setIsScanningNow(true);
    const result = await fileWatcherService.triggerScanNow();
    setIsScanningNow(false);

    if (addNotification) {
      addNotification(
        language === 'ko' ? '백그라운드 스캔 검사 완료' : 'Background Scan Complete',
        result.message,
        result.success ? 'success' : 'warning'
      );
    }
  };

  const handleAddWatchPath = async () => {
    const trimmed = newPathInput.trim();
    if (!trimmed) return;

    await fileWatcherService.addWatchPath(trimmed);
    setNewPathInput('');
    setShowAddPathForm(false);

    if (addNotification) {
      addNotification(
        language === 'ko' ? '감시 경로 추가됨' : 'Watch Path Added',
        language === 'ko' ? `"${trimmed}" 경로가 실시간 모니터링 목록에 등록되었습니다.` : `Monitoring path "${trimmed}".`,
        'success'
      );
    }
  };

  const handlePickDirectoryForWatch = async () => {
    try {
      const selected = await SystemAPI.selectDirectory();
      if (selected) {
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (path) {
          await fileWatcherService.addWatchPath(path);
          if (addNotification) {
            addNotification(
              language === 'ko' ? '감시 폴더 등록 완료' : 'Folder Added to Watcher',
              path,
              'success'
            );
          }
        }
      }
    } catch (err) {
      console.warn('Directory selection bypassed:', err);
    }
  };

  const handleRemoveWatchPath = async (path: string) => {
    await fileWatcherService.removeWatchPath(path);
    if (addNotification) {
      addNotification(
        language === 'ko' ? '감시 경로 해제' : 'Watch Path Removed',
        language === 'ko' ? `"${path}" 경로의 감시를 중단했습니다.` : `Stopped monitoring "${path}".`,
        'info'
      );
    }
  };

  const formatLastScan = (timestamp: number | null) => {
    if (!timestamp) return language === 'ko' ? '기록 없음 (대기 중)' : 'None (Idle)';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return language === 'ko' ? '방금 전' : 'Just now';
    if (diff < 3600) return language === 'ko' ? `${Math.floor(diff / 60)}분 전` : `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-linear-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-3xl border border-indigo-500/30 shadow-xl shadow-indigo-500/5">
            <Settings size={28} className="animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white italic tracking-tight uppercase">
              {t('settings')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {language === 'ko'
                ? '백그라운드 파일 감시, 자동 동기화 및 시스템 환경설정을 관리합니다.'
                : 'Manage background file watcher services, auto-sync, and system preferences.'}
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher (General vs Digital Legacy) */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'general'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {language === 'ko' ? '스캔 및 감시자' : 'Scanning & Watcher'}
          </button>
          <button
            onClick={() => setActiveSubTab('legacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'legacy'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {language === 'ko' ? '디지털 유산 & 복구 키' : 'Digital Legacy'}
          </button>
        </div>
      </div>

      {activeSubTab === 'general' ? (
        <div className="space-y-8">
          {/* PRIMARY HERO CARD: Global 'Enable Background Scanning' Toggle */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/30 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="flex items-start gap-4">
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    watcherStatus.isEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  {watcherStatus.isEnabled ? (
                    <Eye size={28} className="animate-pulse" />
                  ) : (
                    <EyeOff size={28} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {t('enableBackgroundScanning')}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                        watcherStatus.isEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {watcherStatus.isEnabled ? t('backgroundScanningActive') : t('backgroundScanningDisabled')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {t('enableBackgroundScanningDesc')}
                  </p>
                </div>
              </div>

              {/* Prominent Global Toggle Switch */}
              <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={watcherStatus.isEnabled}
                  onClick={handleToggleBackgroundScanning}
                  className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400/50 ${
                    watcherStatus.isEnabled
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20'
                      : 'bg-slate-700 shadow-inner'
                  }`}
                  title={watcherStatus.isEnabled ? 'Disable Background Scanning' : 'Enable Background Scanning'}
                >
                  <span className="sr-only">Toggle Background Scanning</span>
                  <span
                    className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-slate-950 shadow-md ring-1 ring-white/20 transition-all duration-300 ease-in-out flex items-center justify-center text-xs font-black ${
                      watcherStatus.isEnabled ? 'translate-x-9 text-emerald-400' : 'translate-x-0 text-slate-400'
                    }`}
                  >
                    {watcherStatus.isEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Live Telemetry Bar */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {language === 'ko' ? '감시자 상태' : 'Watcher Status'}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      watcherStatus.isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-sm font-black font-mono text-white">
                    {watcherStatus.isRunning ? (language === 'ko' ? '동작 중' : 'RUNNING') : (language === 'ko' ? '정지됨' : 'STOPPED')}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {language === 'ko' ? '감시 대상 경로' : 'Watched Paths'}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Folder size={16} className="text-indigo-400" />
                  <span className="text-sm font-black font-mono text-white">
                    {watcherStatus.watchPaths.length} {language === 'ko' ? '개 디렉토리' : 'Dirs'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {language === 'ko' ? '마지막 증분 검사' : 'Last Check'}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-sm font-black font-mono text-slate-200">
                    {formatLastScan(watcherStatus.lastScanTime)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {language === 'ko' ? '즉시 검사 실행' : 'Manual Trigger'}
                </span>
                <button
                  onClick={handleManualScanNow}
                  disabled={isScanningNow}
                  className="mt-2 py-1.5 px-3 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-md shadow-indigo-600/10"
                >
                  <RefreshCw size={12} className={isScanningNow ? 'animate-spin' : ''} />
                  <span>{isScanningNow ? (language === 'ko' ? '검사 중...' : 'Scanning...') : t('backgroundScanningTriggerNow')}</span>
                </button>
              </div>
            </div>

            {/* Persistence Guarantee Note */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>
                {language === 'ko'
                  ? '설정 상태는 localStorage에 영구 보존되며, 앱 재실행 시 파일 감시자(File Watcher)가 자동으로 초기화됩니다.'
                  : 'State is persisted in localStorage and initializes the file watcher service automatically on startup.'}
              </span>
            </div>
          </div>

          {/* SECTION 2: Monitored Folders Management */}
          <div className="glass border-white/10 p-6 sm:p-8 rounded-[2.5rem] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2.5">
                  <Folder className="text-indigo-400" size={20} />
                  {t('monitoredDirectories')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('monitoredDirectoriesDesc')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickDirectoryForWatch}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FolderPlus size={14} className="text-indigo-400" />
                  <span>{language === 'ko' ? '폴더 찾아보기' : 'Browse Folder'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPathForm(!showAddPathForm)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <FolderPlus size={14} />
                  <span>{t('addMonitoredDirectory')}</span>
                </button>
              </div>
            </div>

            {/* Add Custom Path Input Box */}
            <AnimatePresence>
              {showAddPathForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={newPathInput}
                    onChange={(e) => setNewPathInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWatchPath()}
                    placeholder={language === 'ko' ? '감시할 절대 경로 입력 (예: /Users/username/Pictures)' : 'Enter absolute path to monitor (e.g., /Users/me/Pictures)'}
                    className="flex-1 px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddWatchPath}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {language === 'ko' ? '등록' : 'Add'}
                    </button>
                    <button
                      onClick={() => setShowAddPathForm(false)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      {language === 'ko' ? '취소' : 'Cancel'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Watched Paths List */}
            <div className="space-y-2">
              {watcherStatus.watchPaths.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-slate-500 text-xs">
                  {language === 'ko' ? '등록된 감시 경로가 없습니다. 폴더를 추가하여 자동 모니터링을 시작하세요.' : 'No directories currently monitored. Add a folder to start automated watching.'}
                </div>
              ) : (
                watcherStatus.watchPaths.map((path) => (
                  <div
                    key={path}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/15 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                        <Folder size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-200 truncate">
                          {path}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {watcherStatus.isRunning ? (language === 'ko' ? '실시간 감시 스레드 연결됨' : 'Real-time thread attached') : (language === 'ko' ? '대기 중' : 'Inactive')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveWatchPath(path)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                      title={language === 'ko' ? '감시 목록에서 제거' : 'Remove from Watcher'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: Scan Engine Speed & Presets */}
          {setQuickScanMode && (
            <div className="glass border-white/10 p-6 sm:p-8 rounded-[2.5rem] space-y-6">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-2.5">
                  <Zap className="text-amber-400" size={20} />
                  {language === 'ko' ? '스캔 엔진 검증 모드' : 'Scan Engine Verification Mode'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ko'
                    ? '초고속 스캔(Fast Mode)과 전수 이중 패리티 무결성 검증(Deep Mode) 사이를 조정합니다.'
                    : 'Toggle between ultra-fast Quick Scan and exhaustive Deep Parity Verification.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setQuickScanMode(true)}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    quickScanMode
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                      <Zap size={16} />
                      <span>{language === 'ko' ? '⚡ 고속 스캔 (Fast Mode)' : '⚡ Fast Quick Scan'}</span>
                    </div>
                    {quickScanMode && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'ko'
                      ? '무거운 비트롯 패리티 전수 검사를 생략하고 메타데이터와 시각적 해시로 초고속 색인합니다.'
                      : 'Bypasses exhaustive bit-rot checks for max scan speed and instant indexing.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickScanMode(false)}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    !quickScanMode
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-purple-400">
                      <ShieldCheck size={16} />
                      <span>{language === 'ko' ? '🛡️ 전수 검증 (Deep Mode)' : '🛡️ Deep Parity Mode'}</span>
                    </div>
                    {!quickScanMode && <CheckCircle2 size={16} className="text-purple-400" />}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'ko'
                      ? '모든 데이터 블록의 이중 패리티 정합성 및 비트롯 손상을 전수 검증하여 무결성을 보장합니다.'
                      : 'Runs full double-parity integrity verification and deep bit-rot detection.'}
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <LegacySettings />
        </div>
      )}
    </div>
  );
};
