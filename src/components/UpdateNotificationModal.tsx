import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  X,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCode,
  AlertTriangle,
  Smartphone,
  Monitor,
  Apple,
  Info,
  QrCode,
  Share2,
} from 'lucide-react';
import { GitHubReleaseInfo } from '../services/updateChecker';
import { useI18n } from '../i18n/context';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  latestVersion: string;
  release?: GitHubReleaseInfo;
  isSimulated?: boolean;
  onIgnoreVersion?: () => void;
}

type PlatformTab = 'pc' | 'android' | 'ios';

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  latestVersion,
  release,
  isSimulated,
  onIgnoreVersion,
}) => {
  const { language } = useI18n();

  // Detect current client device
  const defaultTab: PlatformTab = (() => {
    if (typeof navigator === 'undefined') return 'pc';
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return 'pc';
  })();

  const [activePlatform, setActivePlatform] = useState<PlatformTab>(defaultTab);

  if (!isOpen) return null;

  const pcAsset = release?.primaryExecutableAsset;
  const androidAsset = release?.androidApkAsset;
  const iosIpaAsset = release?.iosIpaAsset;
  const iosProfileAsset = release?.iosMobileConfigAsset;

  const changelog = release?.parsedChangelog;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '64 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadPlatform = () => {
    if (activePlatform === 'pc') {
      const url = pcAsset?.downloadUrl || release?.htmlUrl;
      if (url) window.open(url, '_blank');
    } else if (activePlatform === 'android') {
      const url = androidAsset?.downloadUrl || release?.htmlUrl;
      if (url) window.open(url, '_blank');
    } else if (activePlatform === 'ios') {
      // For iOS: open mobileconfig profile for direct 1-click install, or IPA
      const profileUrl = iosProfileAsset?.downloadUrl;
      if (profileUrl) {
        window.open(profileUrl, '_blank');
      } else if (iosIpaAsset?.downloadUrl) {
        window.open(iosIpaAsset.downloadUrl, '_blank');
      } else if (release?.htmlUrl) {
        window.open(release.htmlUrl, '_blank');
      }
    }
  };

  const handleOpenReleasePage = () => {
    const url = release?.htmlUrl || 'https://github.com/AhBiYout-all/SnapClean-AI/releases';
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ring-1 ring-white/10 text-white"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border-b border-white/10 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400 mt-0.5">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    GitHub Releases
                  </span>
                  {isSimulated && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Multi-Platform Simulator
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight mt-1">
                  {language === 'ko' ? '새 버전 업데이트 발견 (PC / 모바일)' : 'New Release Available (PC / Mobile)'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'ko'
                    ? 'Windows PC, 안드로이드(APK), 아이폰(iOS) 전용 설치 파일이 준비되었습니다.'
                    : 'Install packages for Windows PC, Android (APK), and iPhone (iOS) are ready.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Version Comparison Bar */}
          <div className="px-6 py-3.5 bg-slate-950/50 border-b border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'ko' ? '현재 설치 버전' : 'Current Version'}
                </span>
                <span className="font-mono font-bold text-slate-300">v{currentVersion}</span>
              </div>

              <ArrowRight size={16} className="text-indigo-400" />

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {language === 'ko' ? '최신 릴리스 버전' : 'Latest Release'}
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">v{latestVersion}</span>
              </div>
            </div>

            {release?.publishedAt && (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                <Calendar size={13} className="text-slate-500" />
                <span>{release.publishedAt.slice(0, 10)}</span>
              </div>
            )}
          </div>

          {/* Platform Selector Tabs */}
          <div className="px-6 pt-4 pb-2 bg-slate-900 border-b border-white/5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePlatform('pc')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activePlatform === 'pc'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={15} />
              <span>PC (Windows)</span>
              <span className="text-[9px] font-mono text-indigo-400">.exe</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform('android')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activePlatform === 'android'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={15} />
              <span>{language === 'ko' ? '모바일 (안드로이드)' : 'Android'}</span>
              <span className="text-[9px] font-mono text-emerald-400">.apk</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlatform('ios')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activePlatform === 'ios'
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Apple size={15} />
              <span>{language === 'ko' ? '아이폰 (iOS)' : 'iPhone (iOS)'}</span>
              <span className="text-[9px] font-mono text-purple-400">.ipa / 프로필</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
            {/* Active Platform Banner & Info */}
            {activePlatform === 'pc' && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-300">
                    <Monitor size={16} />
                    <span>Windows PC 단일 무설치 포터블 실행 파일</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{formatSize(pcAsset?.size)}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  별도 설치 과정 없이 더블 클릭으로 즉시 실행되는 독립형 포터블 실행 파일입니다. Rust 네이티브 엔진 및 로컬 SQLite와 함께 고속 실행됩니다.
                </p>
                <div className="text-[11px] font-mono text-indigo-400 truncate">
                  📄 {pcAsset?.name || `snapcleanai-portable-v${latestVersion}.exe`}
                </div>
              </div>
            )}

            {activePlatform === 'android' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <Smartphone size={16} />
                    <span>안드로이드 스마트폰/태블릿 설치 파일 (APK)</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{formatSize(androidAsset?.size)}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  안드로이드 폰에서 바로 다운로드하여 설치할 수 있는 APK 패키지입니다.
                </p>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Info size={13} />
                    <span>안드로이드 간편 설치 방법:</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                    <li>아래 <strong>[APK 파일 다운로드]</strong> 버튼을 누릅니다.</li>
                    <li>알림창에서 다운로드 완료된 <strong>.apk</strong> 파일을 탭합니다.</li>
                    <li>보안 경고 시 <strong>[이 출처의 앱 허용]</strong>을 켜고 [설치]를 누르면 완료됩니다.</li>
                  </ol>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 truncate">
                  📄 {androidAsset?.name || `snapcleanai-mobile-v${latestVersion}.apk`}
                </div>
              </div>
            )}

            {activePlatform === 'ios' && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-purple-300">
                    <Apple size={16} />
                    <span>아이폰 / 아이패드 (iOS) 전용 설치 안내</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{formatSize(iosIpaAsset?.size)}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  아이폰은 Apple 보안 정책상 직접 APK 실행이 불가능하므로, 다음 3가지 공식 방식으로 100% 네이티브 구동을 지원합니다:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Option 1: MobileConfig Profile */}
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                    <div className="font-bold text-purple-400 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      <span>1초 원클릭 프로필 설치 (추천)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Apple 공식 구성 프로필(.mobileconfig)을 다운로드하여 홈 화면에 즉시 네이티브 풀스크린 앱으로 추가합니다.
                    </p>
                    <a
                      href={iosProfileAsset?.downloadUrl || `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${latestVersion}/snapcleanai-ios.mobileconfig`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-1 text-[11px] font-bold text-purple-300 hover:text-purple-200 underline"
                    >
                      프로필 다운로드 (.mobileconfig) &rarr;
                    </a>
                  </div>

                  {/* Option 2: Sideload IPA */}
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <FileCode size={13} />
                      <span>IPA 사이드로딩 (AltStore/Sideloadly)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PC의 AltStore 또는 Sideloadly 프로그램으로 IPA 파일을 아이폰에 직접 서명 설치할 수 있습니다.
                    </p>
                    <a
                      href={iosIpaAsset?.downloadUrl || `https://github.com/AhBiYout-all/SnapClean-AI/releases/download/v${latestVersion}/snapcleanai-ios-v${latestVersion}.ipa`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                    >
                      IPA 바이너리 다운로드 &rarr;
                    </a>
                  </div>
                </div>

                {/* Option 3: Safari PWA Add to Home Screen */}
                <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/20 text-[11px] text-slate-300 flex items-start gap-2">
                  <Share2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-300 block">Safari 홈 화면 추가 (무설치 즉시 사용):</span>
                    <span>아이폰 Safari 브라우저 하단의 <strong>[공유]</strong> 버튼 ➔ <strong>[홈 화면에 추가]</strong>를 탭하면 앱스토어 앱과 동일하게 작동합니다.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Categorized Changes */}
            {changelog && changelog.features.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>{language === 'ko' ? '새로운 기능 (Features)' : 'New Features'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 pl-4 border-l border-indigo-500/30">
                  {changelog.features.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {changelog && changelog.improvements.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>{language === 'ko' ? '개선 사항 (Improvements)' : 'Improvements'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 pl-4 border-l border-emerald-500/30">
                  {changelog.improvements.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {changelog && changelog.fixes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-amber-400" />
                  <span>{language === 'ko' ? '버그 수정 (Bug Fixes)' : 'Bug Fixes'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 pl-4 border-l border-amber-500/30">
                  {changelog.fixes.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-5 bg-slate-950/70 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onIgnoreVersion && (
                <button
                  type="button"
                  onClick={onIgnoreVersion}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {language === 'ko' ? '이 버전 건너뛰기' : 'Skip this version'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenReleasePage}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>GitHub Releases 전체 보기</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPlatform}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>
                  {activePlatform === 'pc' && `Windows PC 다운로드 (${formatSize(pcAsset?.size)})`}
                  {activePlatform === 'android' && `안드로이드 APK 다운로드 (${formatSize(androidAsset?.size)})`}
                  {activePlatform === 'ios' && `아이폰 프로필/IPA 다운로드`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
