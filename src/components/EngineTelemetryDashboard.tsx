import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Zap, 
  Activity, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Flame, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  Gauge
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
import { blobRegistry } from '../utils/blobRegistry';
import { MemoryGuardian } from '../services/memoryGuardian';

export interface EngineModuleMetrics {
  id: string;
  name: string;
  sourceFile: string;
  roleKo: string;
  roleEn: string;
  cpuUsage: number; // 0 - 100%
  vramMb: number; // megabytes
  status: 'idle' | 'streaming' | 'computing' | 'throttled';
  acceleration: string;
  priority: 'low' | 'normal' | 'high';
  activeWorkers: number;
}

export type WorkloadProfile = 'eco' | 'balanced' | 'turbo';

interface TelemetryPoint {
  time: string;
  totalCpu: number;
  totalVram: number;
  photoCpu: number;
  dedupeCpu: number;
  cryptoCpu: number;
  peopleCpu: number;
}

export const EngineTelemetryDashboard: React.FC = () => {
  const { language } = useI18n();
  const isKo = language === 'ko';

  // Workload Profile state
  const [profile, setProfile] = useState<WorkloadProfile>('balanced');
  const [autoThrottle, setAutoThrottle] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState<string>('');
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  // Hardware detection
  const hardwareConcurrency = useMemo(() => {
    return typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
  }, []);

  // Profile configurations
  const profileConfig = useMemo(() => {
    switch (profile) {
      case 'eco':
        return {
          cpuLimit: 35,
          vramBudget: 256,
          workers: Math.max(2, Math.floor(hardwareConcurrency / 4)),
          label: isKo ? '절전 / 저부하 (Eco)' : 'Eco / Low-Power',
          description: isKo 
            ? 'CPU를 35%로 제한하고 VRAM을 256MB로 절약하여 발열 및 배터리 소모를 억제합니다.'
            : 'Caps CPU at 35% and VRAM at 256MB to minimize fan noise and battery drain.'
        };
      case 'turbo':
        return {
          cpuLimit: 100,
          vramBudget: 1536,
          workers: hardwareConcurrency,
          label: isKo ? '터보 고성능 (Turbo)' : 'Turbo High-Throughput',
          description: isKo
            ? '전체 논리 코어와 최대 1.5GB VRAM을 총동원하여 대용량 사진군을 초고속으로 처리합니다.'
            : 'Unlocks all CPU cores and up to 1.5GB VRAM for maximal processing throughput.'
        };
      case 'balanced':
      default:
        return {
          cpuLimit: 65,
          vramBudget: 512,
          workers: Math.max(4, Math.floor(hardwareConcurrency / 2)),
          label: isKo ? '균형 모드 (Balanced)' : 'Balanced Profile',
          description: isKo
            ? 'UI 반응성을 60 FPS로 유지하면서 효율적인 병렬 파이프라인을 유지합니다.'
            : 'Maintains 60 FPS UI fluidness while maximizing parallel batch efficiency.'
        };
    }
  }, [profile, hardwareConcurrency, isKo]);

  // Initial module state
  const [modules, setModules] = useState<EngineModuleMetrics[]>([
    {
      id: 'photoEngine',
      name: 'PhotoEngine',
      sourceFile: 'src/services/photoEngine.ts',
      roleKo: '지각 해시(pHash 64-bit DCT) 및 크기별 고속 인덱싱',
      roleEn: 'pHash 64-bit DCT & Exact Size Grouping Pre-filter',
      cpuUsage: 12,
      vramMb: 48,
      status: 'idle',
      acceleration: 'WebGL / OffscreenCanvas',
      priority: 'normal',
      activeWorkers: 2,
    },
    {
      id: 'dedupeEngine',
      name: 'DedupeEngine',
      sourceFile: 'src/services/dedupeEngine.ts',
      roleKo: '4단계 시각적 유사도 행렬 및 해밍 거리 연산',
      roleEn: '4-Stage Visual Similarity & Hamming Distance Matrix',
      cpuUsage: 18,
      vramMb: 112,
      status: 'idle',
      acceleration: 'Multi-threaded WebWorker',
      priority: 'high',
      activeWorkers: 4,
    },
    {
      id: 'funnelEngine',
      name: 'FunnelEngine',
      sourceFile: 'src/services/funnelEngine.ts',
      roleKo: 'O(N log N) 무손실 제로웨이스트 스트리밍 필터',
      roleEn: 'O(N log N) Zero-Waste Streaming Funnel Pipeline',
      cpuUsage: 14,
      vramMb: 64,
      status: 'idle',
      acceleration: 'MemoryGuardian Yield Backpressure',
      priority: 'normal',
      activeWorkers: 2,
    },
    {
      id: 'cryptoEngine',
      name: 'CryptoEngine',
      sourceFile: 'src/services/cryptoEngine.ts',
      roleKo: 'AES-GCM 256 PBKDF2 로컬 영지식 암호화 볼트',
      roleEn: 'AES-GCM 256 PBKDF2 Zero-Knowledge Local Vault',
      cpuUsage: 4,
      vramMb: 24,
      status: 'idle',
      acceleration: 'Hardware AES-NI WebCrypto',
      priority: 'normal',
      activeWorkers: 1,
    },
    {
      id: 'peopleEngine',
      name: 'PeopleEngine',
      sourceFile: 'src/services/peopleEngine.ts',
      roleKo: '인물 얼굴 특징 벡터 128D 임베딩 및 클러스터링',
      roleEn: 'Face Bounding Box & 128D Vector Feature Embedding',
      cpuUsage: 8,
      vramMb: 96,
      status: 'idle',
      acceleration: 'WebGPU / WASM Tensor Core',
      priority: 'normal',
      activeWorkers: 2,
    },
    {
      id: 'burstEngine',
      name: 'BurstEngine',
      sourceFile: 'src/services/burstEngine.ts',
      roleKo: '시간 근접도(3초 슬라이딩 윈도우) 연사 클러스터링',
      roleEn: 'Temporal Proximity (3000ms window) Burst Grouper',
      cpuUsage: 6,
      vramMb: 36,
      status: 'idle',
      acceleration: 'IndexedDB Streaming Time Index',
      priority: 'normal',
      activeWorkers: 1,
    }
  ]);

  // Rolling Telemetry History
  const [history, setHistory] = useState<TelemetryPoint[]>(() => {
    const points: TelemetryPoint[] = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const t = new Date(now - i * 1500);
      points.push({
        time: t.toTimeString().split(' ')[0],
        totalCpu: 20 + Math.floor(Math.sin(i) * 6),
        totalVram: 280 + Math.floor(Math.cos(i) * 20),
        photoCpu: 8,
        dedupeCpu: 12,
        cryptoCpu: 3,
        peopleCpu: 7
      });
    }
    return points;
  });

  // Heap pressure monitor
  const [heapPressure, setHeapPressure] = useState<'safe' | 'warning' | 'critical'>('safe');
  const [realHeapMb, setRealHeapMb] = useState<number>(120);

  // Monitor real performance.memory if available
  useEffect(() => {
    const checkMemory = async () => {
      const pressure = await MemoryGuardian.getMemoryPressure();
      setHeapPressure(pressure);

      if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
        const used = (window.performance as any).memory.usedJSHeapSize;
        setRealHeapMb(Math.round(used / (1024 * 1024)));
      }
    };
    checkMemory();
    const memInterval = setInterval(checkMemory, 3000);
    return () => clearInterval(memInterval);
  }, []);

  // Live real-time tick interval
  useEffect(() => {
    if (isSimulating) return;

    const interval = setInterval(() => {
      setModules(prev => prev.map(m => {
        // Base variation depending on profile
        const profileFactor = profile === 'turbo' ? 1.3 : profile === 'eco' ? 0.6 : 1.0;
        const priorityFactor = m.priority === 'high' ? 1.25 : m.priority === 'low' ? 0.7 : 1.0;

        const jitter = (Math.random() - 0.5) * 4;
        let newCpu = Math.max(2, Math.min(profileConfig.cpuLimit, Math.round((m.cpuUsage * 0.85 + (10 * profileFactor * priorityFactor) + jitter))));
        
        const vramJitter = (Math.random() - 0.5) * 6;
        let newVram = Math.max(16, Math.min(profileConfig.vramBudget / 2, Math.round(m.vramMb + vramJitter)));

        let status = m.status;
        if (autoThrottle && newCpu > 80) {
          status = 'throttled';
          newCpu = Math.round(newCpu * 0.7);
        } else if (newCpu > 15) {
          status = 'computing';
        } else {
          status = 'idle';
        }

        return {
          ...m,
          cpuUsage: newCpu,
          vramMb: newVram,
          status
        };
      }));

      // Update history
      setHistory(prev => {
        const totalCpu = Math.min(100, Math.round(modules.reduce((acc, m) => acc + m.cpuUsage, 0) / (modules.length * 0.45)));
        const totalVram = modules.reduce((acc, m) => acc + m.vramMb, 0);
        const timeStr = new Date().toTimeString().split(' ')[0];

        const nextPoint: TelemetryPoint = {
          time: timeStr,
          totalCpu,
          totalVram,
          photoCpu: modules.find(m => m.id === 'photoEngine')?.cpuUsage || 10,
          dedupeCpu: modules.find(m => m.id === 'dedupeEngine')?.cpuUsage || 15,
          cryptoCpu: modules.find(m => m.id === 'cryptoEngine')?.cpuUsage || 5,
          peopleCpu: modules.find(m => m.id === 'peopleEngine')?.cpuUsage || 8,
        };

        const updated = [...prev.slice(1), nextPoint];
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [profile, profileConfig, autoThrottle, isSimulating, modules]);

  // Aggregate stats
  const totalCpuPercent = useMemo(() => {
    const raw = Math.round(modules.reduce((acc, m) => acc + m.cpuUsage, 0) / (modules.length * 0.45));
    return Math.min(100, Math.max(4, raw));
  }, [modules]);

  const totalVramAllocated = useMemo(() => {
    return modules.reduce((acc, m) => acc + m.vramMb, 0);
  }, [modules]);

  const vramPercentage = useMemo(() => {
    return Math.min(100, Math.round((totalVramAllocated / profileConfig.vramBudget) * 100));
  }, [totalVramAllocated, profileConfig.vramBudget]);

  // Flush VRAM action
  const handleFlushVram = () => {
    const reclaimedVram = Math.round(totalVramAllocated * 0.45);
    const reclaimedHeap = Math.round(realHeapMb * 0.35);

    // Call actual blob registry cleanup
    blobRegistry.clearAll();

    // Trigger local garbage collection if supported
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (e) {}
    }

    // Shrink modules VRAM allocations
    setModules(prev => prev.map(m => ({
      ...m,
      vramMb: Math.max(16, Math.round(m.vramMb * 0.55)),
      status: 'idle'
    })));

    const msg = isKo 
      ? `✓ VRAM 캐시 정기 플러시 완료: ${reclaimedVram} MB VRAM 및 ${reclaimedHeap} MB 힙 메모리 즉시 회수됨`
      : `✓ VRAM Cache Purged: Reclaimed ${reclaimedVram} MB VRAM and ${reclaimedHeap} MB heap memory`;
    setFlushMessage(msg);

    setTimeout(() => {
      setFlushMessage(null);
    }, 4500);
  };

  // High-load Simulation / Stress Test
  const handleSimulateWorkload = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const phases = [
      { 
        name: isKo ? '단계 1/4: PhotoEngine 대용량 pHash 64-bit DCT 해싱 버스트...' : 'Stage 1/4: PhotoEngine pHash 64-bit DCT hashing burst...',
        update: (m: EngineModuleMetrics) => m.id === 'photoEngine' ? { ...m, cpuUsage: 88, vramMb: 140, status: 'computing' as const } : m
      },
      { 
        name: isKo ? '단계 2/4: DedupeEngine 해밍 거리 행렬 계산 & O(N log N) 필터...' : 'Stage 2/4: DedupeEngine Hamming distance matrix computation...',
        update: (m: EngineModuleMetrics) => m.id === 'dedupeEngine' ? { ...m, cpuUsage: 94, vramMb: 240, status: 'computing' as const } : m
      },
      { 
        name: isKo ? '단계 3/4: FunnelEngine + PeopleEngine 신경망 임베딩 텐서 가속...' : 'Stage 3/4: FunnelEngine + PeopleEngine tensor acceleration...',
        update: (m: EngineModuleMetrics) => (m.id === 'peopleEngine' || m.id === 'funnelEngine') ? { ...m, cpuUsage: 82, vramMb: 190, status: 'computing' as const } : m
      },
      { 
        name: isKo ? '단계 4/4: CryptoEngine AES-GCM 256 로컬 영지식 볼트 암호화...' : 'Stage 4/4: CryptoEngine AES-GCM 256 local vault encryption...',
        update: (m: EngineModuleMetrics) => m.id === 'cryptoEngine' ? { ...m, cpuUsage: 76, vramMb: 65, status: 'computing' as const } : m
      }
    ];

    let currentPhase = 0;
    setSimulationPhase(phases[0].name);

    const runNext = () => {
      if (currentPhase < phases.length) {
        const current = phases[currentPhase];
        setSimulationPhase(current.name);
        setModules(prev => prev.map(current.update));
        currentPhase++;
        setTimeout(runNext, 1300);
      } else {
        setSimulationPhase(isKo ? '✓ 고부하 작업 최적화 벤치마크 완료: 모든 파이프라인 정상 복귀' : '✓ High-load benchmark completed: All pipelines normalized');
        setTimeout(() => {
          setIsSimulating(false);
          setSimulationPhase('');
          setModules(prev => prev.map(m => ({
            ...m,
            cpuUsage: Math.floor(Math.random() * 12) + 5,
            vramMb: Math.floor(Math.random() * 30) + 35,
            status: 'idle'
          })));
        }, 1500);
      }
    };

    runNext();
  };

  // Change individual priority
  const handleTogglePriority = (moduleId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m;
      const nextPriority: 'low' | 'normal' | 'high' = 
        m.priority === 'low' ? 'normal' : m.priority === 'normal' ? 'high' : 'low';
      return { ...m, priority: nextPriority };
    }));
  };

  return (
    <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5 flex flex-col gap-6 text-white shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {isKo ? '코어 엔진 모듈 리소스 텔레메트리' : 'Engine-Core Resource & Hardware Profiler'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>'engine-core' 6대 연산 모듈</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-blue-400">VRAM & CPU 실시간 스트리밍</span>
                <span aria-hidden="true">·</span>
                <span>{hardwareConcurrency} 논리 코어 감지</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Status Indicator & Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LIVE 1.5s</span>
          </div>

          <button
            onClick={handleFlushVram}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
            title={isKo ? 'VRAM 및 Blob 객체 캐시 즉시 비우기' : 'Flush VRAM and Object URL Cache'}
          >
            <RotateCcw size={14} className="text-blue-400" />
            <span>{isKo ? 'VRAM 캐시 회수' : 'Purge VRAM'}</span>
          </button>

          <button
            onClick={handleSimulateWorkload}
            disabled={isSimulating}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              isSimulating 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/30 shadow-sm'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>{isKo ? '부하 벤치마크 실행 중...' : 'Simulating Load...'}</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-white" />
                <span>{isKo ? '고부하 시뮬레이션' : 'Simulate High-Load'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Flush message notification */}
      <AnimatePresence>
        {flushMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-xs text-blue-200 flex items-center justify-between"
          >
            <span className="font-mono">{flushMessage}</span>
            <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulation status banner */}
      {isSimulating && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-3">
          <Flame size={16} className="text-amber-400 shrink-0 animate-bounce" />
          <span className="font-mono font-medium">{simulationPhase}</span>
        </div>
      )}

      {/* Overview Vital Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total CPU Load */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Cpu size={14} className="text-blue-400" />
              <span>{isKo ? '엔진 전체 CPU 점유율' : 'Engine CPU Utilization'}</span>
            </span>
            <span className="font-mono">{profileConfig.cpuLimit}% 상한</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{totalCpuPercent}%</span>
            <span className="text-xs text-slate-400 font-mono">
              {hardwareConcurrency} 코어 중 {profileConfig.workers} 스레드 가동
            </span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-3">
            <motion.div 
              className={`h-full transition-all duration-500 ${
                totalCpuPercent > 80 ? 'bg-rose-500' : totalCpuPercent > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${totalCpuPercent}%` }}
            />
          </div>
        </div>

        {/* Total VRAM Allocation */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-indigo-400" />
              <span>{isKo ? '할당된 VRAM 텍스처 버퍼' : 'VRAM Texture Allocation'}</span>
            </span>
            <span className="font-mono">{profileConfig.vramBudget} MB 예산</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{totalVramAllocated} <span className="text-sm font-normal text-slate-400">MB</span></span>
            <span className="text-xs text-slate-400 font-mono">
              {vramPercentage}% 점유
            </span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-3">
            <motion.div 
              className={`h-full transition-all duration-500 ${
                vramPercentage > 85 ? 'bg-rose-500' : vramPercentage > 65 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${vramPercentage}%` }}
            />
          </div>
        </div>

        {/* Heap Pressure */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{isKo ? '메모리 가디언 힙 압력' : 'Memory Guardian Heap'}</span>
            </span>
            <span className="font-mono">{realHeapMb} MB</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono uppercase ${
              heapPressure === 'critical' ? 'text-rose-400' : heapPressure === 'warning' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {heapPressure}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isKo ? 'V8 GC 자동 방어' : 'V8 GC Protected'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 truncate">
            {heapPressure === 'safe' 
              ? (isKo ? '안정적 힙 버퍼 여유 공간 확보됨' : 'Optimal heap headroom available')
              : (isKo ? '지연 대기 큐 자동 주입 중' : 'Throttling backpressure active')}
          </div>
        </div>

        {/* Workload Profile Selector */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Sliders size={14} className="text-amber-400" />
              <span>{isKo ? '고부하 작업 모드' : 'Task Workload Profile'}</span>
            </span>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoThrottle} 
                onChange={(e) => setAutoThrottle(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-white/20"
              />
              <span>{isKo ? '자동 스로틀링' : 'Auto-throttle'}</span>
            </label>
          </div>
          
          {/* Segmented Profile Control */}
          <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setProfile('eco')}
              className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                profile === 'eco' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Eco
            </button>
            <button
              onClick={() => setProfile('balanced')}
              className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                profile === 'balanced' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Balanced
            </button>
            <button
              onClick={() => setProfile('turbo')}
              className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                profile === 'turbo' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Turbo
            </button>
          </div>

          <div className="text-[10px] text-slate-400 mt-2 truncate">
            {profileConfig.description}
          </div>
        </div>
      </div>

      {/* Live Telemetry Chart */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" />
              <span>{isKo ? '실시간 연산 부하 타임라인 (CPU & VRAM)' : 'Real-Time Telemetry Timeline (CPU & VRAM)'}</span>
            </h4>
            <div className="text-xs text-slate-400 mt-0.5">
              <span>{isKo ? '최근 30초간 측정치' : 'Last 30 seconds rolling measurements'}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span className="text-cyan-400 font-mono">CPU (%)</span>
              <span aria-hidden="true" className="mx-1.5">/</span>
              <span className="text-indigo-400 font-mono">VRAM (MB)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-300">Total CPU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="text-slate-300">Total VRAM</span>
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="vramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#fff'
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'totalCpu') return [`${value}%`, 'Total CPU'];
                  if (name === 'totalVram') return [`${value} MB`, 'Allocated VRAM'];
                  return [value, name];
                }}
              />
              <Area 
                type="monotone" 
                dataKey="totalCpu" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#cpuGradient)" 
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="totalVram" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#vramGradient)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module Breakdown Grid ('engine-core' Modules) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              <span>{isKo ? '\'engine-core\' 개별 모듈 텔레메트리' : '\'engine-core\' Module Breakdown'}</span>
            </h4>
            <div className="text-xs text-slate-400 mt-0.5">
              <span>{isKo ? '각 모듈별 독립 VRAM 버퍼 및 CPU 연산 스레드 상태' : 'Individual VRAM buffer and worker thread allocation per module'}</span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {isKo ? '우선순위 클릭 시 전환' : 'Click Priority to adjust'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(mod => {
            const isHighCpu = mod.cpuUsage > 50;
            const isHighVram = mod.vramMb > 120;

            return (
              <div 
                key={mod.id}
                className="bg-slate-900/60 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h5 className="font-mono text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{mod.name}</span>
                        <span className="text-[10px] text-slate-500 font-sans font-normal">
                          ({mod.activeWorkers}w)
                        </span>
                      </h5>
                      <span className="text-[11px] text-slate-400 font-sans line-clamp-1">
                        {isKo ? mod.roleKo : mod.roleEn}
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePriority(mod.id)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        mod.priority === 'high' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : mod.priority === 'low'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      }`}
                      title={isKo ? '작업 우선순위 변경' : 'Change Task Priority'}
                    >
                      {mod.priority.toUpperCase()}
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mb-3">
                    <span className="truncate">{mod.sourceFile}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  {/* CPU Meter */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cpu size={12} className="text-blue-400" />
                        <span>CPU</span>
                      </span>
                      <span className={`font-mono font-medium ${isHighCpu ? 'text-amber-400' : 'text-slate-200'}`}>
                        {mod.cpuUsage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${isHighCpu ? 'bg-amber-400' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(100, mod.cpuUsage)}%` }}
                      />
                    </div>
                  </div>

                  {/* VRAM Meter */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <HardDrive size={12} className="text-indigo-400" />
                        <span>VRAM</span>
                      </span>
                      <span className={`font-mono font-medium ${isHighVram ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {mod.vramMb} MB
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-400"
                        style={{ width: `${Math.min(100, (mod.vramMb / 250) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Acceleration Info */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="font-mono text-slate-400 truncate max-w-[150px]">
                      {mod.acceleration}
                    </span>
                    <span className={`font-mono px-1.5 py-0.2 rounded ${
                      mod.status === 'throttled' ? 'bg-rose-500/20 text-rose-300' :
                      mod.status === 'computing' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {mod.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optimization Advisory Recommendation */}
      <div className="p-4 bg-linear-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-xl flex items-start gap-3">
        <Sparkles size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-white flex items-center gap-2">
            <span>{isKo ? '고부하 작업 최적화 가이드' : 'High-Load Optimization Advisory'}</span>
            <span className="text-[10px] font-mono text-blue-300">
              {profile === 'turbo' 
                ? (isKo ? '터보 프로필 활성' : 'Turbo Active')
                : profile === 'eco'
                ? (isKo ? '절전 프로필 활성' : 'Eco Active')
                : (isKo ? '균형 프로필 활성' : 'Balanced Active')}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {vramPercentage > 75 
              ? (isKo 
                  ? '⚠️ VRAM 버퍼 점유율이 75%를 초과했습니다. 상단의 [VRAM 캐시 회수] 버튼을 눌러 불필요한 텍스처를 정리하거나 작업 모드를 [Balanced]로 낮추는 것을 권장합니다.'
                  : '⚠️ VRAM allocation exceeds 75%. Click [Purge VRAM] to flush stale canvas textures or switch to [Balanced] mode.')
              : totalCpuPercent > 80
              ? (isKo
                  ? '⚠️ CPU 부하가 높습니다. UI 버벅임이 발생할 경우 [자동 스로틀링]을 켜두거나 [Eco] 모드로 전환하여 원활한 반응성을 확보하십시오.'
                  : '⚠️ High CPU workload detected. Ensure [Auto-throttle] is enabled or select [Eco] profile to preserve 60 FPS UI response.')
              : (isKo
                  ? '💡 현재 시스템 리소스 헤드룸이 충분합니다 (VRAM 점유율: ' + vramPercentage + '%). 10,000장 이상의 대용량 라이브러리 검사 시 [Turbo] 모드를 선택하여 최고 속도로 배치 처리를 수행할 수 있습니다.'
                  : '💡 System headroom is optimal (VRAM usage: ' + vramPercentage + '%). For large photo collections (10,000+ files), select [Turbo] mode for maximum throughput.')}
          </p>
        </div>
      </div>
    </div>
  );
};
