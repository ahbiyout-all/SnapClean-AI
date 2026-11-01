import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  ExternalLink,
  Github,
  Globe,
  CheckCircle2,
  X,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  User,
  Tag,
} from 'lucide-react';
import { UpdateInfo, OFFICIAL_SPECS } from '../services/githubUpdateChecker';
import { useI18n } from '../i18n/context';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onCheckAgain?: () => void;
  isChecking?: boolean;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  isChecking = false,
}) => {
  const { language } = useI18n();

  if (!isOpen) return null;

  const currentVer = updateInfo?.currentVersion || OFFICIAL_SPECS.currentVersion;
  const latestVer = updateInfo?.latestVersion || currentVer;
  const hasUpdate = updateInfo?.hasUpdate || false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900/95 border border-indigo-500/30 rounded-[2.5rem] shadow-2xl shadow-indigo-950/60 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Decorative Ambiance */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-amber-500/20 via-indigo-600/30 to-purple-600/20 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 p-6 sm:p-8 pb-4 flex items-start justify-between border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl text-amber-400 shadow-lg shrink-0">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {hasUpdate
                      ? (language === 'ko' ? '🚀 새 버전 출시' : '🚀 New Update Available')
                      : (language === 'ko' ? '✨ 최신 버전' : '✨ Up to Date')}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                    <User size={11} className="text-indigo-400" />
                    {OFFICIAL_SPECS.developer}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white italic tracking-tight mt-1">
                  {language === 'ko' ? '실시간 자동 업데이트 알림' : 'Real-Time Auto-Update System'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Body */}
          <div className="relative z-10 p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Version Badge Bar */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'ko' ? '현재 사용 버전' : 'Current Version'}
                </span>
                <span className="text-slate-300 font-extrabold text-sm mt-0.5">
                  v{currentVer}
                </span>
              </div>

              <ChevronRight size={20} className="text-amber-400 shrink-0" />

              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'ko' ? '릴리스 최신 버전' : 'Latest Release'}
                </span>
                <span className="text-amber-300 font-black text-sm mt-0.5">
                  {latestVer.startsWith('v') ? latestVer : `v${latestVer}`}
                </span>
              </div>
            </div>

            {/* Official Channels Banner */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>{language === 'ko' ? '공식 개발자 및 배포 채널' : 'Official Developer Channels'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <a
                  href={OFFICIAL_SPECS.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-slate-200 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <Github size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate font-bold">GitHub Storage</span>
                  <ExternalLink size={12} className="ml-auto text-slate-500" />
                </a>

                <a
                  href={OFFICIAL_SPECS.blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-slate-200 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <Globe size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate font-bold">Official Google Blog</span>
                  <ExternalLink size={12} className="ml-auto text-slate-500" />
                </a>
              </div>
            </div>

            {/* Release Notes / Changelog */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={13} className="text-amber-400" />
                {language === 'ko' ? '업데이트 내역 & 패치 노트' : 'Release Notes & Changelog'}
              </span>
              <div className="p-4 bg-slate-950/90 border border-white/5 rounded-2xl text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line max-h-48 overflow-y-auto custom-scrollbar">
                {updateInfo?.releaseNotes || (
                  language === 'ko'
                    ? '• 실시간 GitHub Release 파이프라인 연동\n• 무인 설치 및 방화벽 규칙 자동 등록 지원\n• AI 스마트 중복 사진 선별 알고리즘 고도화'
                    : '• GitHub Releases auto-update pipeline integration\n• Unattended installer with firewall rules\n• Smart AI duplicate selection engine'
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="relative z-10 p-6 sm:p-8 pt-4 border-t border-white/10 bg-slate-950/50 flex flex-col sm:flex-row items-center gap-3 justify-between">
            {onCheckAgain && (
              <button
                type="button"
                onClick={onCheckAgain}
                disabled={isChecking}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 justify-center"
              >
                <RefreshCw size={13} className={isChecking ? 'animate-spin text-amber-400' : ''} />
                <span>{language === 'ko' ? '업데이트 재확인' : 'Check Again'}</span>
              </button>
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ko' ? '나중에' : 'Later'}
              </button>

              <a
                href={updateInfo?.downloadUrl || OFFICIAL_SPECS.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>
                  {hasUpdate
                    ? (language === 'ko' ? '최신 설치 파일 다운로드' : 'Download Update')
                    : (language === 'ko' ? 'GitHub Releases 이동' : 'Open Releases')}
                </span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
