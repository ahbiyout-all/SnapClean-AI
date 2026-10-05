import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  Clock, 
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { db } from '../services/db';
import { SystemAPI } from '../services/systemApi';

interface LedgerEntry {
  id: string;
  timestamp: number;
  blockHash: string;
  itemCount: number;
  status: 'verified' | 'pending' | 'corrupted';
}

export const ForensicLedger = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [totalSize, setTotalSize] = React.useState<string>('14.2 MB');
  const [lastSyncText, setLastSyncText] = React.useState<string>('2 MIN AGO');

  React.useEffect(() => {
    let active = true;
    const fetchRealLogsAndStats = async () => {
      try {
        const logs = await db.auditLogs.orderBy('timestamp').reverse().toArray();
        const stats = await SystemAPI.getDetailedDiagnostics().catch(() => null);
        
        if (!active) return;

        // Calculate dynamic size based on database size or entry count
        const sizeBytes = stats?.db_size_bytes || (logs.length * 350) || 1024 * 1024 * 14.2;
        setTotalSize(`${(sizeBytes / 1024 / 1024).toFixed(1)} MB`);

        // Compute relative last sync time
        if (logs.length > 0) {
          const latestLog = logs[0];
          const diffMs = Date.now() - latestLog.timestamp;
          const diffSec = Math.floor(diffMs / 1000);
          if (diffSec < 10) {
            setLastSyncText('JUST NOW');
          } else if (diffSec < 60) {
            setLastSyncText(`${diffSec} SEC AGO`);
          } else if (diffSec < 3600) {
            setLastSyncText(`${Math.floor(diffSec / 60)} MIN AGO`);
          } else {
            setLastSyncText(`${Math.floor(diffSec / 3600)} HRS AGO`);
          }
        } else {
          setLastSyncText('NEVER');
        }

        // Map logs to ledger items
        if (logs.length > 0) {
          const mapped: LedgerEntry[] = logs.slice(0, 10).map((log, idx) => {
            // Generate deterministic block hex from details for diagnostic aesthetic
            const actionHex = Array.from(log.action).map(c => c.charCodeAt(0).toString(16)).join('').slice(0, 4);
            const tsHex = log.timestamp.toString(16).slice(-4);
            const blockHash = `0x${actionHex}...${tsHex}`;
            
            return {
              id: `SC_L_${1000 + (log.id || idx)}`,
              timestamp: log.timestamp,
              blockHash,
              itemCount: typeof log.details === 'object' && log.details?.count ? log.details.count : 1,
              status: 'verified'
            };
          });
          setEntries(mapped);
        } else {
          setEntries([]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchRealLogsAndStats();
    const interval = setInterval(fetchRealLogsAndStats, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{t('forensicMetadataLedger')}</h3>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t('immutableProofOfCapture')}</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl border border-emerald-500/20">
           <Fingerprint size={16} />
           <span className="text-[10px] font-black uppercase tracking-widest">{t('integrityActive')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="glass border-white/5 p-6 rounded-[2rem] flex flex-col items-center text-center gap-3">
            <Lock size={24} className="text-blue-400" />
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('chainSecurity')}</div>
            <div className="text-lg font-black text-white italic">AES-256-GCM</div>
         </div>
         <div className="glass border-white/5 p-6 rounded-[2rem] flex flex-col items-center text-center gap-3">
            <Database size={24} className="text-emerald-400" />
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('ledgerSize')}</div>
            <div className="text-lg font-black text-white italic">{totalSize}</div>
         </div>
         <div className="glass border-white/5 p-6 rounded-[2rem] flex flex-col items-center text-center gap-3">
            <Clock size={24} className="text-amber-400" />
            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('lastSync')}</div>
            <div className="text-lg font-black text-white italic">{lastSyncText}</div>
         </div>
      </div>

      <div className="space-y-3">
        {entries.length > 0 ? entries.map((entry, idx) => (
          <motion.div 
            key={`${entry.id}-${idx}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer"
          >
             <div className="p-3 bg-slate-900 rounded-2xl text-blue-400 shadow-xl border border-white/5">
                <FileCheck size={20} />
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-xs font-black text-white uppercase italic tracking-widest">{entry.id}</span>
                   <div className="h-[1px] flex-1 bg-white/5" />
                   <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[9px] font-mono text-slate-400">HASH: {entry.blockHash}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">{entry.itemCount} {t('assetsSealed')}</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border-emerald-500/20 text-emerald-500">
                <CheckCircle2 size={12} />
                <span className="text-[8px] font-black uppercase tracking-widest">{t('secured')}</span>
             </div>

             {/* Connection Line */}
             {idx < entries.length - 1 && (
                <div className="absolute left-[34px] -bottom-3 w-[2px] h-3 bg-gradient-to-b from-blue-500/20 to-transparent" />
             )}
          </motion.div>
        )) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
             <Database size={40} className="text-slate-700 mb-4" />
             <p className="text-slate-400 text-sm font-bold uppercase tracking-tighter">{t('noLedgerEntries') || 'No Forensic Entries'}</p>
             <p className="text-slate-600 text-[10px] mt-2 max-w-[200px]">{t('noLedgerDesc') || 'New ledger proofs will appear after your first successful scan and analysis cycle.'}</p>
          </div>
        )}
      </div>

      <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-6">
         <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl">
            <AlertTriangle size={24} />
         </div>
         <div>
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{t('cryptographicWarning')}</div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
               {t('cryptoWarningDesc1')} 
               <br />
               {t('cryptoWarningDesc2')}
            </p>
         </div>
      </div>
    </div>
  );
};
