import React from 'react';
import { 
  Image as ImageIcon, 
  Trash2, 
  Cpu, 
  ShieldCheck, 
  PieChart, 
  RefreshCw,
  BookOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PhotoRecord } from '../../services/db';
import { DedupeGroup } from '../../services/dedupeEngine';
import { useI18n } from '../../i18n/context';
import { StatCard } from '../StatCard';
import { MemoryMomentWidget } from '../MemoryMomentWidget';
import { StorageChart } from '../StorageChart';
import { EngineTelemetryDashboard } from '../EngineTelemetryDashboard';
import { getLocalizedCategory } from '../../utils/categoryUtils';
import { motion } from 'motion/react';

interface DashboardTabProps {
  memoryMoment: PhotoRecord | null;
  setSelectedPhotoId: (id: number | null) => void;
  dbCount: number;
  totalWaste: number;
  groups: DedupeGroup[];
  categoryStats: Record<string, { count: number, size: number }>;
  formatStats: Record<string, number>;
  dateStats: Record<string, number>;
  lowValueAssets?: PhotoRecord[];
  autoResolveRule?: 'sharpest' | 'largest' | 'newest' | 'oldest';
  setScanning?: (scanning: boolean) => void;
  setModal?: (modal: any) => void;
  deleteFromDisk?: (photos: PhotoRecord[]) => Promise<void>;
  detectDuplicates?: () => Promise<void>;
  addNotification?: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onOpenPhotobook?: () => void;
}

export const DashboardTab = ({
  memoryMoment,
  setSelectedPhotoId,
  dbCount,
  totalWaste,
  groups,
  categoryStats,
  formatStats,
  dateStats,
  onOpenPhotobook,
}: DashboardTabProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-8">
      {memoryMoment && (
        <MemoryMomentWidget photo={memoryMoment} onClick={(id) => setSelectedPhotoId(id)} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
        <StatCard icon={ImageIcon} label={t('assetIndex')} value={dbCount.toLocaleString()} subtext="SQLite" />
        <StatCard icon={Trash2} label={t('wasteDetected')} value={`${(totalWaste / 1024 / 1024).toFixed(1)} MB`} subtext={`${groups.length} ${t('photosCount')}`} />
        <StatCard icon={Cpu} label={t('hardwareAcceleration')} value={t('active')} subtext="8 Threads" />
        <StatCard icon={ShieldCheck} label={t('privacyBarrier')} value={t('onDevice')} subtext={t('noCloud')} />
      </div>

      {/* 📖 New Feature: 3D Digital Photobook Quick Launcher Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-950/80 via-slate-900 to-amber-950/50 border border-indigo-500/30 p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 shadow-xl shadow-amber-500/10">
            <BookOpen size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles size={11} /> NEW FEATURE
              </span>
              <h3 className="text-white font-bold text-base md:text-lg">
                인터랙티브 3D 디지털 사진첩 (Digital Photobook)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              정리 완료된 고화질 베스트 컷들로 책장을 직접 넘기는 3D 플립북을 생성하세요. 클래식 양장본, 모던 매거진, 빈티지 필름 테마와 감성 앰비언스 사운드를 지원합니다.
            </p>
          </div>
        </div>

        {onOpenPhotobook && (
          <button
            onClick={onOpenPhotobook}
            className="px-5 py-3 rounded-2xl bg-linear-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-black text-xs transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer group"
          >
            <span>사진첩 서재 열기</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Real-time VRAM & CPU Engine-Core Telemetry & High-Load Task Optimizer */}
      <EngineTelemetryDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">{t('storageInsights')}</h3>
            <PieChart size={20} className="text-slate-400" />
          </div>
          <div className="space-y-4">
            {(Object.entries(categoryStats) as [string, { count: number, size: number }][]).sort((a, b) => b[1].size - a[1].size).map(([cat, data], idx) => {
              const totalSize = (Object.values(categoryStats) as { size: number }[]).reduce((acc, curr) => acc + curr.size, 0);
              const percentage = totalSize > 0 ? (data.size / totalSize) * 100 : 0;
              return (
                <div key={`${cat}-${idx}`} className="group cursor-pointer">
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-slate-200 font-medium">{getLocalizedCategory(cat, t)}</span>
                    <span className="text-slate-400 font-mono">{(data.size / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-linear-to-r from-blue-500 to-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5 flex flex-col justify-center items-center text-center">
          <div className="flex items-center justify-between w-full mb-6">
            <h3 className="text-xl font-bold text-white">{t('formatMix')}</h3>
            <RefreshCw size={16} className="text-slate-400" />
          </div>
          <StorageChart data={formatStats} />
        </div>
      </div>

      <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5 h-72 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-white">{t('libraryTimeline')}</h3>
          <span className="text-xs text-slate-500 font-mono">{t('archiveVolume')}</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-1 px-4 mb-4 overflow-x-auto no-scrollbar">
          {Object.entries(dateStats).length > 0 ? (Object.entries(dateStats) as [string, number][]).sort().map(([year, count], idx) => {
            const max = Math.max(...(Object.values(dateStats) as number[]), 1);
            const height = (count / max) * 100;
            return (
              <div key={`${year}-${idx}`} className="flex-1 min-w-[60px] flex flex-col items-center gap-2 group h-full">
                <div className="w-full relative flex-1 flex items-end">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    className="w-full bg-linear-to-t from-blue-600/40 to-blue-500 rounded-t-lg group-hover:from-blue-500 group-hover:to-blue-400 transition-all"
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                    {count} {t('photosCount')}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">{year}</span>
              </div>
            );
          }) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm">
              {t('scanToSeeInsights')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
