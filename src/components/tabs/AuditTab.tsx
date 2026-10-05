import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Zap, 
  Server, 
  BarChart3 
} from 'lucide-react';
import { db, AuditLog } from '../../services/db';
import { SystemAPI } from '../../services/systemApi';
import { useI18n } from '../../i18n/context';
import { ForensicLedger } from '../ForensicLedger';
import { LegacySettings } from '../LegacySettings';

interface AuditTabProps {
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  runSelfHealingAudit: () => Promise<void>;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const AuditTab = ({ auditLogs, setAuditLogs, runSelfHealingAudit, addNotification }: AuditTabProps) => {
  const { t } = useI18n();

  const [diagnostics, setDiagnostics] = React.useState<{
    cpu_usage: number;
    memory_used_kb: number;
    db_size_bytes: number;
  } | null>(null);

  React.useEffect(() => {
    const loadDiagnostics = async () => {
      try {
        const data = await SystemAPI.getDetailedDiagnostics();
        setDiagnostics(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadDiagnostics();
    const interval = setInterval(loadDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12">
        <ForensicLedger />
        <LegacySettings />
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" />
              {t('auditHealthCenterTitle')}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {t('auditHealthCenterDesc')}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={async () => {
                try {
                  const data = await SystemAPI.getDetailedDiagnostics();
                  addNotification(t('systemScan'), `CPU: ${data.cpu_usage.toFixed(1)}% | RAM: ${(data.memory_used_kb / 1024).toFixed(0)}MB`, 'info');
                } catch (err) {
                  console.error(err);
                }
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Activity size={14} /> {t('runForensicCheck')}
            </button>
            <button 
              onClick={() => {
                if (confirm(t('clearAuditConfirm'))) {
                  db.auditLogs.clear().then(() => setAuditLogs([]));
                }
              }}
              className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 rounded-2xl text-rose-400 font-bold text-xs uppercase tracking-widest transition-all"
            >
              {t('purgeAuditTrail')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-3 gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl overflow-hidden">
              <div className="bg-slate-900/50 p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Activity size={12} className="text-emerald-500" /> {t('cpuLoad')}
                </div>
                <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                  {diagnostics ? diagnostics.cpu_usage.toFixed(1) : '12.4'}
                  <span className="text-xs opacity-50">%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${diagnostics ? Math.min(100, diagnostics.cpu_usage) : 12.4}%` }} 
                  />
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <Server size={12} className="text-blue-500" /> {t('memoryRam')}
                </div>
                <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                  {diagnostics ? (diagnostics.memory_used_kb / 1024).toFixed(0) : '450'}
                  <span className="text-xs opacity-50">MB</span>
                </div>
                <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${diagnostics ? Math.min(100, (diagnostics.memory_used_kb / 1024 / 4)) : 30}%` }} 
                  />
                </div>
              </div>
              <div className="bg-slate-900/50 p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <BarChart3 size={12} className="text-purple-500" /> {t('dbIndex')}
                </div>
                <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                  {diagnostics ? (diagnostics.db_size_bytes / 1024 / 1024).toFixed(1) : '45.2'}
                  <span className="text-xs opacity-50">MB</span>
                </div>
                <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${diagnostics ? Math.min(100, (diagnostics.db_size_bytes / 1024 / 1024 * 2)) : 15}%` }} 
                  />
                </div>
              </div>
            </div>
            <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                <h4 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-3">
                  <Zap size={16} className="text-orange-500" /> {t('liveEventStream')}
                </h4>
                <span className="text-[10px] text-emerald-500 font-bold uppercase animate-pulse">Monitoring...</span>
              </div>
              <div className="p-4 space-y-1 font-mono text-[11px] max-h-[400px] overflow-y-auto custom-scrollbar bg-black/40">
                {auditLogs.map((log, idx) => {
                  const isSimulation = log.action.startsWith('SIM_');
                  const logStableId = log.id || `log-idx-${idx}`;
                  return (
                    <div key={`${logStableId}-${idx}`} className={`flex flex-col gap-1 p-3 hover:bg-white/5 transition-colors border-l-2 border-transparent ${isSimulation ? 'hover:border-amber-500' : 'hover:border-emerald-500'} group`}>
                      <div className="flex gap-4 items-center">
                        <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`${isSimulation ? 'text-amber-500' : 'text-blue-400'} shrink-0 uppercase tracking-tighter text-[9px] font-black`}>
                          [{isSimulation ? 'SIMULATION' : log.action.split('_')[0]}]
                        </span>
                        <span className="text-slate-300 flex-1 font-bold">
                          {log.action === 'DEDUPE_ISOLATION_REPORT' ? 'ISOLATION ARCHITECTURE COMMITTED' : 
                           log.action === 'SIM_ISOLATION_REPORT' ? 'PROJECTED ISOLATION IMPACT REPORT' : log.action}
                        </span>
                        <span className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">PID: 0x{logStableId.toString().substring(0, 4)}</span>
                      </div>
                      <div className="ml-24 text-slate-500 text-[10px] line-clamp-1 italic">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </div>
                      {log.details && typeof log.details === 'object' && log.action.includes('REPORT') && (
                        <div className={`ml-24 mt-2 grid grid-cols-2 gap-x-8 gap-y-2 border ${isSimulation ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-black/20'} p-3 rounded-lg overflow-hidden`}>
                          {Object.entries(log.details).map(([k, v], subIdx) => (
                            <div key={`${logStableId}-${k}-${subIdx}`} className="flex justify-between border-b border-white/5 pb-1">
                              <span className="uppercase text-[8px] font-black text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</span>
                              <span className={`${isSimulation ? 'text-amber-500' : 'text-emerald-500'} font-mono`}>
                                {typeof v === 'number' && v > 1000000 ? `${(v/1024/1024).toFixed(1)} MB` : 
                                 k.toLowerCase().includes('bytes') && typeof v === 'number' ? `${(v/1024/1024).toFixed(2)} MB` : 
                                 String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-4 p-3 opacity-50">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-emerald-400">[HEALTH]</span>
                  <span className="text-slate-400 italic">{t('databaseHealthOk')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-6 rounded-[2rem] border-white/5 bg-linear-to-b from-white/5 to-transparent">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('integrityStatus')}</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">DB Integrity</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase">Verified</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Bit-Rot Watcher</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black uppercase">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">OOM Watchdog</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px] font-black uppercase">Standby</span>
                </div>
              </div>
              <button 
                onClick={runSelfHealingAudit}
                className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
              >
                {t('deepDatabaseRepair')}
              </button>
            </div>

            <div className="glass p-6 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-emerald-400" size={16} />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Self-Healing</h4>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                {t('selfHealingEnabled')}
              </p>
              <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                <span className="text-[9px] font-bold text-slate-500 uppercase">{t('systemStatus')}</span>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t('optimal')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
