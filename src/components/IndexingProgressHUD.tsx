import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Pause,
  Play,
  Square,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  TrendingUp,
  Activity,
  Gauge,
  FastForward
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n/context';
import { ScanStats } from '../types';

interface SpeedPoint {
  time: string;
  speed: number;
  timestamp: number;
}

interface IndexingProgressHUDProps {
  scanning: boolean;
  scanStats: ScanStats;
  isPaused: boolean;
  isStopped: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipDeepScan?: () => void;
  onViewDuplicates?: () => void;
}

export const IndexingProgressHUD: React.FC<IndexingProgressHUDProps> = ({
  scanning,
  scanStats,
  isPaused,
  isStopped,
  onPause,
  onResume,
  onStop,
  onSkipDeepScan,
  onViewDuplicates,
}) => {
  const { language } = useI18n();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [speedHistory, setSpeedHistory] = useState<SpeedPoint[]>([]);

  // Seed initial point when scan starts
  useEffect(() => {
    if (scanning && speedHistory.length === 0) {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
      setSpeedHistory([{ time: timeLabel, speed: scanStats.speed || 0, timestamp: Date.now() }]);
    }
  }, [scanning, scanStats.speed, speedHistory.length]);

  // Maintain 60-second rolling window buffer (1 sample / second)
  useEffect(() => {
    if (!scanning) {
      setSpeedHistory([]);
      return;
    }

    const interval = setInterval(() => {
      if (isPaused) return;

      const currentSpeed = scanStats.speed || 0;
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

      setSpeedHistory((prev) => {
        const newPoint: SpeedPoint = {
          time: timeLabel,
          speed: currentSpeed,
          timestamp: Date.now(),
        };
        // Retain last 60 points
        return [...prev, newPoint].slice(-60);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scanning, isPaused, scanStats.speed]);

  if (!scanning) return null;

  const total = scanStats.total || 0;
  const processed = scanStats.processed || 0;
  const percentage = total > 0 ? Math.min(100, Math.max(1, Math.round((processed / total) * 100))) : 0;
  const stage = scanStats.stage || 'indexing';

  const phaseStep = stage === 'deep_analysis' ? 3 : processed > 0 ? 2 : 1;

  const currentSpeed = scanStats.speed || 0;
  const peakSpeed = speedHistory.length > 0 ? Math.max(...speedHistory.map((p) => p.speed), currentSpeed) : currentSpeed;
  const avgSpeed = speedHistory.length > 0 ? Math.round(speedHistory.reduce((acc, p) => acc + p.speed, 0) / speedHistory.length) : currentSpeed;

  const formatEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    if (seconds > 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return language === 'ko' ? `${mins}분 ${secs}초` : `${mins}m ${secs}s`;
    }
    return language === 'ko' ? `${seconds}초` : `${seconds}s`;
  };

  const currentEta = formatEta(scanStats.etaSeconds);
  const discoveredCount = scanStats.discoveredDuplicatesCount || 0;
  const discoveredWasteBytes = scanStats.discoveredWasteBytes || 0;

  // Extract clean file name from path
  const currentFileName = scanStats.currentPath
    ? scanStats.currentPath.split(/[/\\]/).pop() || scanStats.currentPath
    : language === 'ko' ? '파일 준비 중...' : 'Preparing file...';

  // Custom Recharts Tooltip
  const CustomSpeedTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SpeedPoint;
      return (
        <div className="bg-slate-900/95 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px] font-mono flex flex-col gap-0.5 z-50">
          <span className="text-slate-400 text-[10px]">{data.time}</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
            <Zap size={12} className="animate-pulse" />
            <span>{data.speed} {language === 'ko' ? '개/초' : 'files/s'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6 left-2 right-2 sm:left-auto sm:right-6 sm:max-w-xl z-50 pointer-events-auto"
      >
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950/95 border border-indigo-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.25)] backdrop-blur-2xl text-white">
          {/* Animated Ambient Scanning Glow & Laser Line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
            {!isPaused && (
              <motion.div
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                className="absolute top-0 bottom-0 w-32 bg-linear-to-r from-transparent via-indigo-400/15 to-transparent skew-x-12 pointer-events-none"
              />
            )}
          </div>

          {/* Minimized Pill View */}
          {isMinimized ? (
            <div className="relative z-10 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex items-center justify-center p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Cpu size={16} className={isPaused ? '' : 'animate-pulse'} />
                  {!isPaused && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-300">
                      {isPaused
                        ? (language === 'ko' ? '색인 일시정지' : 'Scan Paused')
                        : (language === 'ko' ? '색인 작업 진행 중' : 'Indexing Active')}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-1.5 py-0.2 rounded">
                      {total > 0 ? `${percentage}%` : '...'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                    {currentFileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {stage === 'deep_analysis' && onSkipDeepScan && (
                  <button
                    onClick={onSkipDeepScan}
                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all cursor-pointer"
                    title={language === 'ko' ? 'AI 정밀분석 건너뛰기' : 'Skip AI Deep Scan'}
                  >
                    <FastForward size={14} fill="currentColor" />
                  </button>
                )}
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all cursor-pointer"
                    title={language === 'ko' ? '재개' : 'Resume'}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-all cursor-pointer"
                    title={language === 'ko' ? '일시정지' : 'Pause'}
                  >
                    <Pause size={14} fill="currentColor" />
                  </button>
                )}
                <button
                  onClick={onStop}
                  disabled={isStopped}
                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all cursor-pointer disabled:opacity-30"
                  title={language === 'ko' ? '중단' : 'Stop'}
                >
                  <Square size={14} fill="currentColor" />
                </button>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-all cursor-pointer ml-1"
                  title={language === 'ko' ? '상세 펼치기' : 'Expand'}
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Full Rich HUD View */
            <div className="relative z-10 p-4 sm:p-5 flex flex-col gap-3.5">
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative p-2.5 rounded-2xl bg-linear-to-br from-indigo-500/25 to-blue-500/25 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <Cpu size={18} className={isPaused ? '' : 'animate-spin-slow'} />
                    {!isPaused && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        {isPaused
                          ? (language === 'ko' ? '색인 작업 일시정지' : 'Indexing Paused')
                          : (language === 'ko' ? '⚡ 색인 및 스마트 분석 진행 중' : '⚡ Indexing & Analysis in Progress')}
                      </h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        isPaused
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse'
                      }`}>
                        {isPaused ? (language === 'ko' ? '일시정지' : 'PAUSED') : (language === 'ko' ? '실시간 처리' : 'LIVE')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {stage === 'deep_analysis'
                        ? (language === 'ko' ? 'AI 유사도 점수, pHash 및 시각적 특징을 심층 분석 중입니다.' : 'Evaluating AI visual similarities & perceptual hashes.')
                        : (language === 'ko' ? '선택한 폴더를 직접 탐색하며 메타데이터를 고속 색인 중입니다.' : 'Directly scanning files and indexing metadata.')}
                    </p>
                  </div>
                </div>

                {/* HUD Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {stage === 'deep_analysis' && onSkipDeepScan && (
                    <button
                      onClick={onSkipDeepScan}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      title={language === 'ko' ? 'AI 정밀분석 건너뛰고 바로 완료' : 'Skip AI Deep Scan & Complete'}
                    >
                      <FastForward size={12} fill="currentColor" />
                      <span className="hidden sm:inline">{language === 'ko' ? '정밀 건너뛰기' : 'Skip AI'}</span>
                    </button>
                  )}
                  {isPaused ? (
                    <button
                      onClick={onResume}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title={language === 'ko' ? '스캔 재개' : 'Resume Scan'}
                    >
                      <Play size={12} fill="currentColor" />
                      <span className="hidden sm:inline">{language === 'ko' ? '재개' : 'Resume'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPause}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title={language === 'ko' ? '스캔 일시정지' : 'Pause Scan'}
                    >
                      <Pause size={12} fill="currentColor" />
                      <span className="hidden sm:inline">{language === 'ko' ? '일시정지' : 'Pause'}</span>
                    </button>
                  )}
                  <button
                    onClick={onStop}
                    disabled={isStopped}
                    className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-xl transition-all cursor-pointer disabled:opacity-30"
                    title={language === 'ko' ? '스캔 중단' : 'Stop Scan'}
                  >
                    <Square size={12} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                    title={language === 'ko' ? '작게 접기' : 'Minimize'}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Multi-Step Pipeline Visualizer */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-white/5">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  phaseStep >= 1 ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-500'
                }`}>
                  <FileCheck2 size={12} className={phaseStep === 1 && !isPaused ? 'animate-bounce' : ''} />
                  <span className="text-[10px] truncate">{language === 'ko' ? '1. 파일 직접 탐색' : '1. Direct Scan'}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  phaseStep >= 2 ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30' : 'text-slate-500'
                }`}>
                  <Layers size={12} className={phaseStep === 2 && !isPaused ? 'animate-pulse' : ''} />
                  <span className="text-[10px] truncate">{language === 'ko' ? '2. 메타 색인' : '2. Fast Index'}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
                  phaseStep >= 3 ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-500'
                }`}>
                  <Sparkles size={12} className={phaseStep === 3 && !isPaused ? 'animate-spin' : ''} />
                  <span className="text-[10px] truncate">{language === 'ko' ? '3. AI 정밀분석' : '3. AI Deep Scan'}</span>
                </div>
              </div>

              {/* Skip Deep Analysis Callout Card */}
              {stage === 'deep_analysis' && onSkipDeepScan && (
                <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/40 border border-amber-500/40 shadow-inner">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                      <Zap size={14} className="animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-200 truncate">
                        {language === 'ko' ? '정밀 분석 시간이 오래 걸리나요?' : 'AI Deep Scan taking too long?'}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                        {language === 'ko' ? '건너뛰어도 고속 해시로 중복 파일은 100% 탐지됩니다.' : 'Fast hash duplicate detection remains 100% accurate.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onSkipDeepScan}
                    className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <FastForward size={12} fill="currentColor" />
                    <span>{language === 'ko' ? '건너뛰고 즉시 완료' : 'Skip & Finish'}</span>
                  </button>
                </div>
              )}

              {/* Progress Bar with Laser Ripple */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-indigo-300 flex items-center gap-1.5">
                    <span className="text-white font-extrabold text-sm">{percentage}%</span>
                    <span className="text-slate-400 font-normal">
                      ({processed.toLocaleString()} / {total > 0 ? total.toLocaleString() : '...'} {language === 'ko' ? '개' : 'files'})
                    </span>
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    {scanStats.speed !== undefined && scanStats.speed > 0 && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Zap size={11} className="animate-pulse" />
                        {scanStats.speed} {language === 'ko' ? '개/초' : 'items/s'}
                      </span>
                    )}
                    {currentEta && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {language === 'ko' ? `약 ${currentEta} 남음` : `${currentEta} left`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPaused
                        ? 'bg-amber-500'
                        : 'bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Real-time Velocity Line Chart (Recharts) */}
              <div className="flex flex-col gap-2 bg-slate-900/90 p-3 rounded-2xl border border-white/10 shadow-inner">
                {/* Header bar with stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                      {language === 'ko' ? '실시간 스캔 속도 트렌드 (최근 60초)' : 'Scan Speed Velocity (Last 60s)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                      {language === 'ko' ? '현재' : 'Now'}: {currentSpeed} {language === 'ko' ? '개/초' : 'f/s'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      {language === 'ko' ? '최고' : 'Peak'}: {peakSpeed} {language === 'ko' ? '개/초' : 'f/s'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hidden sm:inline">
                      {language === 'ko' ? '평균' : 'Avg'}: {avgSpeed} {language === 'ko' ? '개/초' : 'f/s'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowChart(!showChart)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
                      title={language === 'ko' ? '차트 접기/펼치기' : 'Toggle Chart'}
                    >
                      {showChart ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Chart Area */}
                {showChart && (
                  <div className="w-full h-28 pt-1">
                    {speedHistory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={speedHistory}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="speedGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                          <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                            tickLine={false}
                            minTickGap={20}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomSpeedTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="speed"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#speedGlow)"
                            isAnimationActive={false}
                            dot={false}
                            activeDot={{ r: 4, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        <Activity size={12} className="animate-spin mr-1 text-emerald-400" />
                        {language === 'ko' ? '속도 데이터 수집 중...' : 'Collecting speed metrics...'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live File Ticker & Duplicate Discoveries */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-full sm:max-w-[70%]" title={scanStats.currentPath}>
                  <Search size={12} className="text-indigo-400 shrink-0" />
                  <span className="text-slate-500 shrink-0">{language === 'ko' ? '현재:' : 'Active:'}</span>
                  <span className="text-slate-200 truncate">{currentFileName}</span>
                </div>

                {discoveredCount > 0 && onViewDuplicates && (
                  <button
                    onClick={onViewDuplicates}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-lg transition-all cursor-pointer self-end sm:self-auto shrink-0"
                  >
                    <Sparkles size={10} className="animate-pulse" />
                    <span>
                      {language === 'ko'
                        ? `중복 ${discoveredCount}그룹 발견`
                        : `${discoveredCount} Dup Groups`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
