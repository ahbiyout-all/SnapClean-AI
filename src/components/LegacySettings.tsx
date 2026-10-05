import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Key, 
  ShieldCheck, 
  Users, 
  Download, 
  Copy,
  Check,
  LifeBuoy,
  Archive,
  ArrowRight,
  Sparkles,
  FileCode,
  Layers,
  BookOpen
} from 'lucide-react';
import { SystemAPI } from '../services/systemApi';
import { useTranslation, useI18n } from '../i18n/context';
import { APP_VERSION_INFO } from '../version';
import { PatchNotesModal } from './PatchNotesModal';
import { GitHubUpdateCard } from './GitHubUpdateCard';
import { MultiplatformInstallModal } from './MultiplatformInstallModal';

export const LegacySettings = () => {
  const { t } = useTranslation();
  const { language } = useI18n();
  const [showMultiplatformModal, setShowMultiplatformModal] = React.useState(false);
  const [heritageKey, setHeritageKey] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showPatchNotes, setShowPatchNotes] = React.useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const key = await SystemAPI.generateHeritageKey("USER_REDMOON");
    setHeritageKey(key);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (heritageKey) {
      navigator.clipboard.writeText(heritageKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <div className="p-5 bg-rose-500/10 text-rose-500 rounded-[2rem] shadow-2xl shadow-rose-500/5 border border-rose-500/20">
           <Heart size={32} />
        </div>
        <div>
           <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('digitalLegacyManagement')}</h3>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t('preservingMemories')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass border-white/5 p-8 rounded-[3rem] space-y-6">
            <div className="p-4 w-fit bg-amber-500/10 text-amber-500 rounded-2xl">
               <Key size={24} />
            </div>
            <div>
               <h4 className="text-lg font-black text-white uppercase italic mb-2">{t('heritageRecoveryKey')}</h4>
               <p className="text-slate-400 text-xs leading-relaxed">
                  {t('heritageKeyDesc')}
               </p>
            </div>

            <div className="pt-4">
               {heritageKey ? (
                  <div className="space-y-4">
                     <div className="p-4 bg-black/40 border border-white/5 rounded-2xl font-mono text-[10px] text-emerald-400 break-all leading-loose">
                        {heritageKey}
                     </div>
                     <div className="flex gap-2">
                        <button 
                          onClick={handleCopy}
                          className="flex-1 py-4 glass border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                        >
                           {copied ? <><Check size={14} className="text-emerald-500" /> {t('keyCopied')}</> : <><Copy size={14} /> {t('copyKey')}</>}
                        </button>
                        <button 
                          className="px-6 py-4 bg-white text-black hover:bg-blue-600 hover:text-white rounded-2xl transition-all"
                          title="Download PDF Certificate"
                        >
                           <Download size={20} />
                        </button>
                     </div>
                  </div>
               ) : (
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 italic flex items-center justify-center gap-3"
                  >
                     {isGenerating ? t('generating') : <><LifeBuoy size={20} /> {t('generateHeritageKey')}</>}
                  </button>
               )}
            </div>
         </div>

         <div className="glass border-white/5 p-8 rounded-[3rem] space-y-6">
            <div className="p-4 w-fit bg-blue-500/10 text-blue-400 rounded-2xl">
               <Users size={24} />
            </div>
            <div>
               <h4 className="text-lg font-black text-white uppercase italic mb-2">{t('beneficiaryProtocols')}</h4>
               <p className="text-slate-400 text-xs leading-relaxed">
                  {t('beneficiaryProtocolsDesc')}
               </p>
            </div>

            <div className="space-y-3">
               {[
                  { name: t('familyArchive'), status: t('active') },
                  { name: t('personalMemoirs'), status: t('active') }
               ].map((protocol, idx) => (
                  <div key={`${protocol.name}-${idx}`} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <Archive size={16} className="text-slate-500" />
                        <span className="text-[10px] font-black text-white uppercase">{protocol.name}</span>
                     </div>
                     <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{protocol.status}</span>
                  </div>
               ))}
               <button className="w-full py-4 glass border-dashed border-white/10 hover:bg-white/5 text-slate-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                  + {t('addLegacyContact')}
               </button>
            </div>
         </div>
      </div>

      <div className="p-8 glass border-emerald-500/20 bg-emerald-500/5 rounded-[3rem] flex flex-col md:flex-row items-center gap-8">
         <div className="p-6 bg-emerald-500/10 text-emerald-500 rounded-full">
            <ShieldCheck size={48} />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="text-xl font-black text-white uppercase italic mb-2">{t('zeroKnowledgeHeritage')}</h4>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
               {t('zeroKnowledgeHeritageDesc')}
            </p>
         </div>
         <button className="px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest transition-all italic flex items-center gap-2 group cursor-pointer">
            {t('vaultHardening')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
         </button>
      </div>

      {/* GitHub Releases Real-time Live Auto-Updater Section */}
      <GitHubUpdateCard />

      {/* App Version & Documentation Section */}
      <div className="glass border-white/5 p-8 rounded-[3rem] space-y-6">
         <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                  <BookOpen size={24} />
               </div>
               <div>
                  <div className="flex items-center gap-2">
                     <h4 className="text-lg font-black text-white uppercase italic">
                        {language === 'ko' ? '시스템 정보 및 공식 문서' : 'System Info & Documentation'}
                     </h4>
                     <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold rounded-md">
                        v{APP_VERSION_INFO.version}
                     </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                     {language === 'ko' 
                        ? '자동 빌드 파이프라인, 아키텍처 문서 및 공식 릴리스 패치노트'
                        : 'Automated build pipeline, architecture specs, and release patch notes'}
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                 type="button"
                 onClick={() => setShowMultiplatformModal(true)}
                 className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                 <Download size={16} />
                 <span>{language === 'ko' ? '모바일 / PC 설치 파일' : 'Mobile / PC Downloads'}</span>
              </button>
              <button
                 type="button"
                 onClick={() => setShowPatchNotes(true)}
                 className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                 <Sparkles size={16} />
                 <span>{language === 'ko' ? '패치노트 전체 보기' : 'View Full Patch Notes'}</span>
              </button>
            </div>
          </div>

         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">App Version</span>
               <span className="text-xs font-black text-white font-mono">v{APP_VERSION_INFO.version}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Build Stamp</span>
               <span className="text-xs font-black text-slate-200 font-mono">{APP_VERSION_INFO.buildNumber}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Engine</span>
               <span className="text-xs font-black text-emerald-400 font-mono">{APP_VERSION_INFO.engineVersion}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Docs Directory</span>
               <span className="text-xs font-black text-indigo-400 font-mono">/docs/*.md</span>
            </div>
         </div>
      </div>

      <AnimatePresence>
         {showPatchNotes && (
            <PatchNotesModal 
               onClose={() => setShowPatchNotes(false)}
               addNotification={(title, msg, type) => {
                  console.log(title, msg, type);
               }}
            />
         )}
      </AnimatePresence>

      <MultiplatformInstallModal
         isOpen={showMultiplatformModal}
         onClose={() => setShowMultiplatformModal(false)}
         language={language as 'ko' | 'en'}
      />
    </div>
  );
};
