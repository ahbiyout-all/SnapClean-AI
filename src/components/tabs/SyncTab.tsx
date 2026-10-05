import React from 'react';
import { 
  Share2, 
  Smartphone, 
  Activity, 
  Wifi, 
  Cpu, 
  Database, 
  Globe,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Key,
  ShieldCheck,
  Bell,
  Clock,
  BatteryCharging,
  Zap
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { backgroundSyncManager, BackgroundSyncConfig, SyncFrequency } from '../../services/backgroundSyncManager';
import { db } from '../../services/db';

interface ApiKeyRecord {
  id: string;
  label: string;
  keyValue: string;
  created: string;
}

export const SyncTab = () => {
  const { t, language } = useI18n();

  // Background Sync Manager Integration
  const [bgConfig, setBgConfig] = React.useState<BackgroundSyncConfig>(() => backgroundSyncManager.getConfig());
  const [bgStatus, setBgStatus] = React.useState<{ isSyncing: boolean; lastSync: number; progress?: string }>({
    isSyncing: false,
    lastSync: bgConfig.lastSyncTimestamp
  });
  const [totalIndexedCount, setTotalIndexedCount] = React.useState(0);
  const [syncFeedback, setSyncFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = backgroundSyncManager.subscribe((status) => {
      setBgStatus(status);
      setBgConfig(backgroundSyncManager.getConfig());
    });
    db.photos.count().then(setTotalIndexedCount);
    return () => unsub();
  }, []);

  const handleUpdateConfig = (updates: Partial<BackgroundSyncConfig>) => {
    backgroundSyncManager.saveConfig(updates);
    setBgConfig(backgroundSyncManager.getConfig());
  };

  const handleManualSync = async () => {
    setSyncFeedback(language === 'ko' ? '증분 검사 진행 중...' : 'Checking for changes...');
    const res = await backgroundSyncManager.triggerIncrementalSync();
    if (res.success && res.stats) {
      const { added, modified, unchangedCount } = res.stats;
      setSyncFeedback(
        language === 'ko'
          ? `동기화 완료: 신규 ${added.length}장, 변경 ${modified.length}장 감지 (동일 ${unchangedCount}장 생략)`
          : `Sync complete: ${added.length} added, ${modified.length} updated (${unchangedCount} unchanged)`
      );
    } else {
      setSyncFeedback(language === 'ko' ? '동기화 완료 (변경사항 없음)' : 'Sync complete (No changes)');
    }
    db.photos.count().then(setTotalIndexedCount);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleRequestNotification = async () => {
    const granted = await backgroundSyncManager.requestNotificationPermission();
    if (granted) {
      handleUpdateConfig({ notifyOnCompletion: true });
    }
  };

  // Interactive P2P states persistent in localStorage
  const [pairingCode, setPairingCode] = React.useState<string | null>(() => {
    return localStorage.getItem('snapclean_peer_code');
  });
  const [pairingStatus, setPairingStatus] = React.useState<'idle' | 'generating' | 'linked'>(() => {
    return (localStorage.getItem('snapclean_peer_status') as any) || 'idle';
  });

  // Swarm node states persistent in localStorage
  const [swarmStatus, setSwarmStatus] = React.useState<'standby' | 'connecting' | 'active'>(() => {
    return (localStorage.getItem('snapclean_swarm_status') as any) || 'standby';
  });
  const [swarmJobsCount, setSwarmJobsCount] = React.useState<number>(() => {
    return parseInt(localStorage.getItem('snapclean_swarm_jobs') || '0', 10);
  });

  // Dynamic API key state persistent in localStorage
  const [apiKeys, setApiKeys] = React.useState<ApiKeyRecord[]>(() => {
    const savedKeys = localStorage.getItem('snapclean_api_keys');
    if (savedKeys) {
      try {
        return JSON.parse(savedKeys);
      } catch (e) {
        console.error("Failed to parse apiKeys:", e);
      }
    }
    return [
      { id: '1', label: 'Lightroom Sync Extension', keyValue: 'sc_live_6f8490bde3c8724', created: '2026-05-20' }
    ];
  });
  const [showKeyCreator, setShowKeyCreator] = React.useState(false);
  const [newKeyLabel, setNewKeyLabel] = React.useState('');

  // Persist values on change
  React.useEffect(() => {
    if (pairingCode) {
      localStorage.setItem('snapclean_peer_code', pairingCode);
    } else {
      localStorage.removeItem('snapclean_peer_code');
    }
  }, [pairingCode]);

  React.useEffect(() => {
    localStorage.setItem('snapclean_peer_status', pairingStatus);
  }, [pairingStatus]);

  React.useEffect(() => {
    localStorage.setItem('snapclean_swarm_status', swarmStatus);
  }, [swarmStatus]);

  React.useEffect(() => {
    localStorage.setItem('snapclean_swarm_jobs', swarmJobsCount.toString());
  }, [swarmJobsCount]);

  React.useEffect(() => {
    localStorage.setItem('snapclean_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Handle peer pairing generator
  const triggerPairing = () => {
    setPairingStatus('generating');
    setTimeout(() => {
      const codePart = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `SNAPCLEAN-${codePart}-PEER`;
      setPairingCode(generatedCode);
      setPairingStatus('linked');
    }, 1500);
  };

  // Toggle decentralized swarm membership
  const toggleSwarm = () => {
    if (swarmStatus === 'active') {
      setSwarmStatus('standby');
    } else {
      setSwarmStatus('connecting');
      setTimeout(() => {
        setSwarmStatus('active');
        setSwarmJobsCount(Math.floor(Math.random() * 50) + 12);
      }, 2000);
    }
  };

  // Simulate remote peer task solver
  React.useEffect(() => {
    if (swarmStatus !== 'active') return;
    const interval = setInterval(() => {
      setSwarmJobsCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [swarmStatus]);

  // Generate an API token key
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    
    const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey: ApiKeyRecord = {
      id: Date.now().toString(),
      label: newKeyLabel.trim(),
      keyValue: `sc_live_${hex}`,
      created: new Date().toISOString().split('T')[0]
    };

    setApiKeys(prev => [newKey, ...prev]);
    setNewKeyLabel('');
    setShowKeyCreator(false);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
              <Share2 className="text-blue-500" />
              {t('connectivityHubTitle')}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {t('connectivityHubDesc')}
            </p>
          </div>
        </div>

        {/* Smart Background Indexer & Incremental Sync Section */}
        <div className="glass p-8 md:p-10 rounded-[3rem] border-white/10 mb-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                <ShieldCheck size={30} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold uppercase italic tracking-tight text-white">
                    {language === 'ko' ? '스마트 백그라운드 색인 & 증분 동기화' : 'Background Smart Indexing & Incremental Sync'}
                  </h4>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    PC / MOBILE ENGINE
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  {language === 'ko'
                    ? '전체 사진을 매번 다시 스캔할 필요 없이, 변경되거나 새로 추가된 파일만 0.1초 만에 스마트 감지합니다.'
                    : 'Intelligently tracks folder changes with 0.1s delta comparisons without rescanning unchanged photos.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={bgStatus.isSyncing}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw size={14} className={bgStatus.isSyncing ? "animate-spin" : ""} />
              <span>{bgStatus.isSyncing ? (language === 'ko' ? '동기화 중...' : 'Syncing...') : (language === 'ko' ? '지금 즉시 증분 검사' : 'Run Incremental Sync')}</span>
            </button>
          </div>

          {syncFeedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-mono flex items-center gap-2">
              <Check size={14} />
              <span>{syncFeedback}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Frequency Select */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Clock size={14} className="text-indigo-400" />
                <span>{language === 'ko' ? '자동 감시 주기' : 'Sync Frequency'}</span>
              </div>
              <select
                value={bgConfig.frequency}
                onChange={(e) => handleUpdateConfig({ frequency: e.target.value as SyncFrequency })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="realtime">{language === 'ko' ? '실시간 감시 (10분)' : 'Real-time (10m)'}</option>
                <option value="hourly">{language === 'ko' ? '1시간 주기' : 'Hourly (1h)'}</option>
                <option value="six_hours">{language === 'ko' ? '6시간 주기' : '6-Hourly (6h)'}</option>
                <option value="idle_charging">{language === 'ko' ? '유휴 및 충전 시' : 'Idle & Charging'}</option>
                <option value="manual">{language === 'ko' ? '수동 실행 전용' : 'Manual only'}</option>
              </select>
            </div>

            {/* 2. Battery Protection */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <BatteryCharging size={14} className="text-amber-400" />
                <span>{language === 'ko' ? '배터리 보호 모드' : 'Battery Saver'}</span>
              </div>
              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span className="text-xs text-slate-300">
                  {bgConfig.pauseOnBattery 
                    ? (language === 'ko' ? '배터리 20% 미만 시 중단' : 'Pause on low battery') 
                    : (language === 'ko' ? '항상 동기화' : 'Always sync')}
                </span>
                <input
                  type="checkbox"
                  checked={bgConfig.pauseOnBattery}
                  onChange={(e) => handleUpdateConfig({ pauseOnBattery: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </label>
            </div>

            {/* 3. Notification */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Bell size={14} className="text-emerald-400" />
                <span>{language === 'ko' ? '완료 알림' : 'Completion Alerts'}</span>
              </div>
              <button
                onClick={handleRequestNotification}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs text-slate-300 transition-all cursor-pointer"
              >
                <span>
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                    ? (language === 'ko' ? '알림 허용됨' : 'Allowed')
                    : (language === 'ko' ? '권한 요청' : 'Request Access')}
                </span>
                <span className={`w-2 h-2 rounded-full ${typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </button>
            </div>

            {/* 4. Total Indexed DB Cache */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Database size={14} className="text-blue-400" />
                <span>{language === 'ko' ? '색인된 캐시' : 'Indexed Cache'}</span>
              </div>
              <div className="text-lg font-mono font-black text-white">
                {totalIndexedCount.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-normal">{language === 'ko' ? '장' : 'items'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {language === 'ko' ? '마지막 검사:' : 'Last check:'} {bgConfig.lastSyncTimestamp ? new Date(bgConfig.lastSyncTimestamp).toLocaleTimeString() : (language === 'ko' ? '기록 없음' : 'Never')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-10 rounded-[3rem] border-white/5 flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600/20 rounded-[2rem] flex items-center justify-center border border-blue-500/20">
                  <Smartphone className="text-blue-400" size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-bold uppercase italic tracking-tight">{t('p2pDevicePairing')}</h4>
                  <p className="text-slate-500 text-xs">{t('p2pDevicePairingDesc')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950/50 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center gap-4 my-6 flex-1">
              {pairingStatus === 'generating' ? (
                <div className="w-48 h-48 rounded-3xl flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={36} className="text-blue-400 animate-spin" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">Allocating link...</span>
                </div>
              ) : pairingStatus === 'linked' && pairingCode ? (
                <div className="space-y-4">
                  <div className="w-36 h-36 bg-white p-3 rounded-2xl mx-auto flex flex-col justify-between items-center group relative border-4 border-emerald-500 shadow-lg shadow-emerald-500/10">
                    <div className="grid grid-cols-6 gap-1 w-full h-full opacity-80">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-sm ${(i * 7 + 3) % 5 === 0 || (i * 3) % 4 === 0 ? 'bg-slate-950' : 'bg-transparent'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      <Check size={12} className="stroke-[3]" /> SECURE CONNECTION READY
                    </span>
                    <p className="text-lg font-mono font-black tracking-wider text-white bg-slate-900 px-4 py-2 rounded-xl border border-white/5">
                      {pairingCode}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-36 h-36 bg-white/5 p-4 rounded-3xl border border-dashed border-white/10 flex items-center justify-center">
                    <Wifi size={40} className="text-slate-600 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-white uppercase tracking-widest">{t('scanToConnect')}</p>
                    <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed mx-auto">
                      Sync your mobile camera roll directly to this instance without cloud intermediaries or external relays.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <button 
              onClick={triggerPairing}
              disabled={pairingStatus === 'generating'}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer border border-white/5"
            >
              {pairingStatus === 'linked' ? 'REGENERATE BRIDGE ACCESS' : t('generateNewLink')}
            </button>
          </div>

          <div className="flex flex-col gap-8 text-white">
             <div className="glass p-8 rounded-[3rem] border-white/5 flex-1 flex flex-col justify-between min-h-[235px]">
                <div>
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                         <Globe size={24} />
                      </div>
                      <h4 className="text-lg font-bold uppercase italic tracking-tight">{t('distributedProcessing')}</h4>
                   </div>
                   <p className="text-slate-400 text-xs leading-relaxed mb-6">
                      Join the anonymous SnapClean swarm to accelerate other nodes' AI library narrations while contributing remaining idle CPU cores.
                   </p>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 font-mono">
                         <span className="text-xs font-bold uppercase text-slate-500 tracking-widest">{t('nodeStatus')}</span>
                         {swarmStatus === 'active' ? (
                           <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                             ACTIVE (CYCLES: {swarmJobsCount})
                           </span>
                         ) : swarmStatus === 'connecting' ? (
                           <span className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                             <RefreshCw size={10} className="animate-spin" /> JOINING Consensus SWARM...
                           </span>
                         ) : (
                           <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                             {t('standby')}
                           </span>
                         )}
                      </div>
                   </div>
                </div>
                <button 
                  onClick={toggleSwarm}
                  disabled={swarmStatus === 'connecting'}
                  className={`w-full mt-6 py-4 font-black rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer border ${
                    swarmStatus === 'active' 
                      ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border-rose-500/20' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                   {swarmStatus === 'active' ? 'LEAVE THE SWARM' : t('joinTheSwarm')}
                </button>
             </div>

             <div className="glass p-8 rounded-[3rem] border-white/5 flex-1 flex flex-col justify-between min-h-[235px]">
                <div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <Activity size={24} />
                         </div>
                         <h4 className="text-lg font-bold uppercase italic tracking-tight">{t('apiAccessTokens')}</h4>
                      </div>
                      <button 
                        onClick={() => setShowKeyCreator(!showKeyCreator)}
                        className="p-2 bg-white/5 rounded-xl text-indigo-400 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                   </div>
                   
                   {showKeyCreator ? (
                     <form onSubmit={handleCreateApiKey} className="space-y-4 my-2 p-4 bg-slate-900/80 rounded-2xl border border-white/10">
                       <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">New Token Descriptor</span>
                       <div className="flex gap-2">
                         <input 
                           type="text"
                           value={newKeyLabel}
                           onChange={(e) => setNewKeyLabel(e.target.value)}
                           placeholder="e.g. Lightroom Client, API Client"
                           className="flex-1 bg-white/5 text-xs text-white p-2 rounded-xl border border-white/5 focus:outline-none focus:border-indigo-500"
                           required
                         />
                         <button type="submit" className="px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500">
                           Save
                         </button>
                       </div>
                     </form>
                   ) : (
                     <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar my-2 pr-1">
                       {apiKeys.map(k => (
                         <div key={k.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5 font-mono text-[10px]">
                           <div>
                             <p className="font-bold text-slate-300 font-sans">{k.label}</p>
                             <p className="text-[9px] text-slate-500 tracking-wider mt-0.5">{k.keyValue}</p>
                           </div>
                           <button 
                             onClick={() => handleDeleteKey(k.id)}
                             className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                           >
                             <Trash2 size={12} />
                           </button>
                         </div>
                       ))}
                       {apiKeys.length === 0 && (
                         <p className="text-center text-xs text-slate-600 italic py-4">No tokens created yet.</p>
                       )}
                     </div>
                   )}
                </div>
                {!showKeyCreator && (
                  <button 
                    onClick={() => setShowKeyCreator(true)}
                    className="w-full mt-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                     {t('manageApiKeys')}
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

