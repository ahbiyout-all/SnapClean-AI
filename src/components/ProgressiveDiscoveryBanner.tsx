import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Bell, 
  RefreshCw, 
  Clock, 
  Zap, 
  ArrowRight, 
  BatteryCharging, 
  CheckCircle2,
  HardDrive,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n/context';
import { ScanStats } from '../types';
import { BackgroundSyncConfig } from '../services/backgroundSyncManager';

interface ProgressiveDiscoveryBannerProps {
  scanning: boolean;
  scanStats: ScanStats;
  bgSyncConfig: BackgroundSyncConfig;
  bgSyncStatus: { isSyncing: boolean; lastSync: number; progress?: string };
  onReviewDiscovered: () => void;
  onTriggerSync: () => void;
  onRequestNotification: () => void;
  onOpenSyncSettings?: () => void;
}

export const ProgressiveDiscoveryBanner: React.FC<ProgressiveDiscoveryBannerProps> = ({
  scanning,
  scanStats,
  bgSyncConfig,
  bgSyncStatus,
  onReviewDiscovered,
  onTriggerSync,
  onRequestNotification,
  onOpenSyncSettings
}) => {
  const { language } = useI18n();
  const [notificationGranted, setNotificationGranted] = React.useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const discoveredCount = scanStats.discoveredDuplicatesCount || 0;
  const discoveredWasteBytes = scanStats.discoveredWasteBytes || 0;
  const discoveredWasteMB = (discoveredWasteBytes / (1024 * 1024)).toFixed(1);
  const discoveredWasteGB = (discoveredWasteBytes / (1024 * 1024 * 1024)).toFixed(2);

  const formatLastSync = (ts: number) => {
    if (!ts || ts === 0) return language === 'ko' ? '기록 없음' : 'Never';
    const diffSec = Math.round((Date.now() - ts) / 1000);
    if (diffSec < 60) return language === 'ko' ? '방금 전' : 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}${language === 'ko' ? '분 전' : 'm ago'}`;
    return `${Math.floor(diffSec / 3600)}${language === 'ko' ? '시간 전' : 'h ago'}`;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. Live Streaming Discovery Highlight (Shown when scanning is active and duplicates were discovered in real-time) */}
      <AnimatePresence>
        {scanning && discoveredCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="w-full bg-linear-to-r from-emerald-950/80 via-indigo-950/70 to-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {language === 'ko' ? '즉시 발견됨' : 'Instant Discovery'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {scanStats.stage === 'deep_analysis' ? (language === 'ko' ? '정밀 AI 분석과 병행 중' : 'Parallel AI Scan') : (language === 'ko' ? '초기 고속 색인 완료' : 'Fast Pass')}
                  </span>
                </div>
                <h4 className="text-sm md:text-base font-bold text-white mt-1">
                  {language === 'ko'
                    ? `중복 사진 ${discoveredCount}개 그룹 (약 ${discoveredWasteBytes > 1024 * 1024 * 1024 ? `${discoveredWasteGB} GB` : `${discoveredWasteMB} MB`} 절약 가능)을 먼저 찾았습니다!`
                    : `Discovered ${discoveredCount} duplicate groups (~${discoveredWasteBytes > 1024 * 1024 * 1024 ? `${discoveredWasteGB} GB` : `${discoveredWasteMB} MB`} recoverable)!`}
                </h4>
              </div>
            </div>

            <button
              onClick={onReviewDiscovered}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>{language === 'ko' ? '발견된 사진 즉시 정리' : 'Review & Clean Now'}</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Reassuring Background Sync & Non-Blocking Privacy Card */}
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5 md:mt-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs md:text-sm font-bold text-white">
                {language === 'ko' ? '백그라운드 스마트 증분 감시' : 'Background Smart Incremental Sync'}
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {bgSyncConfig.frequency === 'realtime' ? (language === 'ko' ? '실시간 감시 (10분)' : 'Real-time (10m)') :
                 bgSyncConfig.frequency === 'hourly' ? (language === 'ko' ? '1시간 주기' : 'Hourly') :
                 bgSyncConfig.frequency === 'six_hours' ? (language === 'ko' ? '6시간 주기' : '6-Hourly') :
                 bgSyncConfig.frequency === 'idle_charging' ? (language === 'ko' ? '충전/유휴 시' : 'Idle & Charging') :
                 (language === 'ko' ? '수동 동기화' : 'Manual')}
              </span>
              {bgSyncStatus.isSyncing && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 animate-pulse">
                  <RefreshCw size={10} className="animate-spin" />
                  {language === 'ko' ? '증분 검사 중...' : 'Syncing...'}
                </span>
              )}
            </div>
            <p className="text-[11px] md:text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              {language === 'ko'
                ? '🔒 사진 원본은 100% 기기 내부에서 비공개 처리되며, 앱을 닫거나 다른 작업을 하셔도 백그라운드에서 안전하게 분석됩니다.'
                : '🔒 Photos are processed 100% locally. You can close or switch apps anytime while background sync keeps your library up to date.'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-stretch sm:self-end md:self-auto shrink-0">
          {!notificationGranted && (
            <button
              onClick={async () => {
                await onRequestNotification();
                if (typeof window !== 'undefined' && 'Notification' in window) {
                  setNotificationGranted(Notification.permission === 'granted');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              title={language === 'ko' ? '스캔 완료 시 알림 수신' : 'Get notified on completion'}
            >
              <Bell size={13} />
              <span>{language === 'ko' ? '완료 알림 켜기' : 'Enable Alerts'}</span>
            </button>
          )}

          <button
            onClick={onTriggerSync}
            disabled={bgSyncStatus.isSyncing || scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title={language === 'ko' ? '새로 추가/수정된 사진만 빠른 증분 동기화' : 'Check for new or modified photos'}
          >
            <RefreshCw size={13} className={bgSyncStatus.isSyncing ? "animate-spin text-indigo-400" : ""} />
            <span>{language === 'ko' ? '증분 검사' : 'Check Changes'}</span>
          </button>

          {onOpenSyncSettings && (
            <button
              onClick={onOpenSyncSettings}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 text-xs transition-all cursor-pointer"
              title={language === 'ko' ? '동기화 주기 및 백그라운드 설정' : 'Sync Settings'}
            >
              <Clock size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
