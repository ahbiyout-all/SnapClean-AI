import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Github,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useUpdateChecker } from '../hooks/useUpdateChecker';
import { useI18n } from '../i18n/context';
import { UpdateNotificationModal } from './UpdateNotificationModal';

export const GitHubUpdateCard: React.FC = () => {
  const { language } = useI18n();
  const {
    status,
    hasUpdate,
    currentVersion,
    latestVersion,
    release,
    checkedAt,
    errorMessage,
    isSimulated,
    isChecking,
    isModalOpen,
    setIsModalOpen,
    autoCheck,
    setAutoCheck,
    checkForUpdates,
    simulateUpdate,
    ignoreCurrentVersion,
    repoConfig,
  } = useUpdateChecker();

  const [copied, setCopied] = useState(false);

  const handleCopyRepo = () => {
    navigator.clipboard.writeText(`https://github.com/${repoConfig.owner}/${repoConfig.repo}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass border-white/5 p-8 rounded-[2.5rem] space-y-6 text-white relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl shadow-lg">
            <Github size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black uppercase italic tracking-tight">
                {language === 'ko'
                  ? 'GitHub Releases 실시간 자동 업데이트'
                  : 'GitHub Releases Live Auto-Updater'}
              </h4>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {repoConfig.owner}/{repoConfig.repo}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {language === 'ko'
                ? '원격 GitHub Releases API와 실시간 동기화하여 최신 릴리스 및 패치 자동 감지'
                : 'Real-time synchronization with GitHub Releases API for instant version tracking'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => checkForUpdates(true)}
            disabled={isChecking}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>
              {isChecking
                ? (language === 'ko' ? '조회 중...' : 'Checking...')
                : (language === 'ko' ? '업데이트 확인' : 'Check for Updates')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => simulateUpdate('2.5.0')}
            className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-mono text-xs transition-all border border-white/10 flex items-center gap-1.5 cursor-pointer"
            title="새 릴리스 알림 시뮬레이션 데모"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>{language === 'ko' ? '시뮬레이터' : 'Simulate'}</span>
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Current Installed Version */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {language === 'ko' ? '현재 설치 버전' : 'Installed Version'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-white">v{currentVersion}</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
              Active
            </span>
          </div>
        </div>

        {/* Latest Remote Version */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {language === 'ko' ? '원격 릴리스 버전' : 'Remote Release'}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono font-bold ${
                hasUpdate ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              v{latestVersion}
            </span>
            {hasUpdate ? (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                Update Available
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Latest
              </span>
            )}
          </div>
        </div>

        {/* Real-time Status */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {language === 'ko' ? '검사 상태' : 'Check Status'}
          </span>
          <div className="flex items-center gap-2">
            {isChecking && (
              <span className="text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
                <RefreshCw size={12} className="animate-spin" />
                {language === 'ko' ? 'GitHub API 통신 중' : 'Connecting to API...'}
              </span>
            )}
            {!isChecking && hasUpdate && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-amber-300 hover:text-amber-200 underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'ko' ? '업데이트 내역 확인' : 'View Update Notes'}</span>
                <ArrowRight size={12} />
              </button>
            )}
            {!isChecking && !hasUpdate && status === 'up-to-date' && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={13} />
                {language === 'ko' ? '최신 상태 유지 중' : 'Up to date'}
              </span>
            )}
            {!isChecking && status === 'rate-limited' && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Clock size={13} />
                {language === 'ko' ? 'API 요청 대기' : 'Rate limited'}
              </span>
            )}
            {!isChecking && status === 'error' && (
              <span className="text-xs text-rose-400 flex items-center gap-1.5 font-medium truncate">
                <AlertCircle size={13} className="shrink-0" />
                <span className="truncate">{errorMessage || 'Error'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Platform Installers Grid (PC / Android / iPhone) */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            {language === 'ko' ? '플랫폼별 공식 설치 파일 (PC & 모바일)' : 'Multi-Platform Installation Packages'}
          </span>
          <span className="text-[10px] font-mono text-indigo-400">
            v{latestVersion || currentVersion}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Windows PC */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <span>💻 Windows PC</span>
                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">.exe</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">단일 무설치 포터블 실행 파일</p>
            </div>
            <a
              href={release?.primaryExecutableAsset?.downloadUrl || "/api/download/portable"}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
            >
              <Download size={12} />
              <span>{language === 'ko' ? 'PC용 EXE 다운로드' : 'Download PC .exe'}</span>
            </a>
          </div>

          {/* Android APK */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <span>📱 Android 모바일</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">.apk</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">스마트폰 직접 설치 APK 패키지</p>
            </div>
            <a
              href={release?.androidApkAsset?.downloadUrl || "/api/download/apk"}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
            >
              <Download size={12} />
              <span>{language === 'ko' ? '모바일 APK 다운로드' : 'Download Android .apk'}</span>
            </a>
          </div>

          {/* Mobile Web & PWA */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <span>🌐 모바일 웹 / PWA</span>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 rounded">Safari/Chrome</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {language === 'ko' ? '아이폰/스마트폰 무설치 웹앱' : 'Mobile Web & PWA install'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {language === 'ko' ? 'Safari [홈 화면에 추가] 지원' : 'Add to Home Screen'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Available Banner (if update found) */}
      {hasUpdate && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-300">
                {language === 'ko'
                  ? `SnapClean AI v${latestVersion} 업데이트 준비 완료!`
                  : `SnapClean AI v${latestVersion} is ready to install!`}
              </div>
              <div className="text-[11px] text-slate-400">
                {release?.primaryExecutableAsset?.name || `snapcleanai-portable-v${latestVersion}.exe`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Download size={14} />
              <span>{language === 'ko' ? '업데이트 다운로드' : 'Download Update'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Info & Config */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoCheck}
            onChange={(e) => setAutoCheck(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-indigo-500/30"
          />
          <span className="text-slate-300 font-medium">
            {language === 'ko'
              ? '앱 시작 시 최신 버전 자동 검사 (백그라운드)'
              : 'Automatically check for updates on startup'}
          </span>
        </label>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-500">
            {language === 'ko' ? '최근 확인:' : 'Checked:'}{' '}
            {checkedAt ? new Date(checkedAt).toLocaleTimeString() : 'N/A'}
          </span>

          <a
            href={repoConfig.releasesUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-medium"
          >
            <ExternalLink size={12} />
            <span>GitHub Releases</span>
          </a>

          <button
            type="button"
            onClick={handleCopyRepo}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="저장소 URL 복사"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <GitBranch size={12} />}
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <UpdateNotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        release={release}
        isSimulated={isSimulated}
        onIgnoreVersion={ignoreCurrentVersion}
      />
    </div>
  );
};
