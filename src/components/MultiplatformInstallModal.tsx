import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor,
  Smartphone,
  Apple,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Cpu,
  Info,
  Layers,
  Sparkles,
  X,
  FileCode,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { APP_VERSION_INFO } from '../version';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface MultiplatformInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ko' | 'en';
}

type PlatformTab = 'pc' | 'android' | 'ios';

export const MultiplatformInstallModal: React.FC<MultiplatformInstallModalProps> = ({
  isOpen,
  onClose,
  language = 'ko',
}) => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('android');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [safariHint, setSafariHint] = useState<string | null>(null);
  const { isInstallable, install: triggerPwaInstall } = usePWAInstall();

  if (!isOpen) return null;

  const version = APP_VERSION_INFO.version;
  const githubRepo = 'AhBiYout/AhBiYout-all';
  const releaseUrl = `https://github.com/${githubRepo}/releases/tag/v${version}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Download size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {language === 'ko' ? '멀티플랫폼 설치 및 배포 센터' : 'Multiplatform Download Center'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ko'
                  ? 'PC(Windows)와 모바일(Android APK), 아이폰(iOS) 전용 설치 파일을 지원합니다.'
                  : 'Deploy and install across PC, Android APK, and Apple iOS platforms.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'android'
                ? 'bg-slate-900 text-white border-white/15 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
            }`}
          >
            <Smartphone size={16} className={activeTab === 'android' ? 'text-emerald-400' : ''} />
            <span>{language === 'ko' ? '안드로이드 (APK)' : 'Android (APK)'}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              APK
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pc')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-slate-900 text-white border-white/15 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
            }`}
          >
            <Monitor size={16} className={activeTab === 'pc' ? 'text-blue-400' : ''} />
            <span>{language === 'ko' ? 'PC (Windows)' : 'PC (Windows)'}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
              EXE / DLL
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-slate-900 text-white border-white/15 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
            }`}
          >
            <Apple size={16} className={activeTab === 'ios' ? 'text-rose-400' : ''} />
            <span>{language === 'ko' ? '아이폰 (웹 PWA)' : 'iPhone (Web PWA)'}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/25">
              {language === 'ko' ? '무설치 PWA' : 'PWA App'}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================================= */}
          {/* TAB: IPHONE (iOS) */}
          {/* ========================================================================= */}
          {activeTab === 'ios' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* iOS Support Feasibility & Architecture Explanation */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <Apple size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{language === 'ko' ? '아이폰(iOS) 100% 온디바이스 완벽 지원' : 'iPhone (iOS) 100% On-Device Support'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      온디바이스
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'ko' ? (
                      <>
                        WebKit 하드웨어 가속 Canvas <strong>지각 해시(pHash)</strong>와 브라우저 독립 데이터베이스(Dexie.js / IndexedDB)를 사용하여, 
                        외부 서버 전송 없이 <strong>아이폰 기기 내부에서 100% 비공개</strong>로 사진 보관함의 중복 사진과 연사를 정리합니다.
                        노치, 다이내믹 아일랜드 및 Safe Area에 완벽 대응합니다.
                      </>
                    ) : (
                      <>
                        Powered by WebKit hardware-accelerated Canvas pHash and on-device IndexedDB storage.
                        Photos are analyzed 100% locally with complete privacy.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* iOS 3 Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. MobileConfig WebClip Profile */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">snapcleanai-ios.mobileconfig</h4>
                        <p className="text-xs text-slate-400 mt-0.5">아이폰 원클릭 앱 등록 프로파일</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Profile
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">형식:</span>
                        <span className="text-white">Apple WebClip Managed</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">설치 방식:</span>
                        <span className="text-emerald-300">Safari 다운로드 ➔ [설치]</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">실행 환경:</span>
                        <span>전체화면 단독 앱 모드</span>
                      </div>
                    </div>

                    <ol className="space-y-1 text-[11px] text-slate-400 list-decimal list-inside">
                      <li>아이폰 Safari에서 아래 버튼을 터치하여 프로파일을 받습니다.</li>
                      <li>아이폰 <strong>[설정] ➔ [프로파일이 다운로드됨] ➔ [설치]</strong> 터치.</li>
                      <li>홈 화면에 <strong>SnapClean AI</strong> 앱 아이콘이 바로 생성됩니다.</li>
                    </ol>
                  </div>

                  <div className="pt-2">
                    <a
                      href="/api/download/mobileconfig"
                      download="snapcleanai-ios.mobileconfig"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      <span>{language === 'ko' ? '아이폰 프로파일 다운로드' : 'Download iOS Profile'}</span>
                    </a>
                  </div>
                </div>

                {/* 2. Sideloading IPA */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">snapcleanai-ios-v{version}.ipa</h4>
                        <p className="text-xs text-slate-400 mt-0.5">사이드로딩용 iOS 패키지 (IPA)</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        IPA v{version}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bundle ID:</span>
                        <span className="text-purple-300">com.snapclean.app</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">호환 도구:</span>
                        <span>AltStore / Sideloadly / TrollStore</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">지원 OS:</span>
                        <span>iOS 14.0 이상</span>
                      </div>
                    </div>

                    <ol className="space-y-1 text-[11px] text-slate-400 list-decimal list-inside">
                      <li>IPA 파일을 PC 또는 아이폰으로 다운로드합니다.</li>
                      <li>AltStore 또는 Sideloadly로 내 애플 계정 서명 후 기기에 설치합니다.</li>
                      <li>아이폰 설정 ➔ [VPN 및 기기 관리]에서 신뢰 승인 후 실행합니다.</li>
                    </ol>
                  </div>

                  <div className="pt-2">
                    <a
                      href="/api/download/ipa"
                      download={`snapcleanai-ios-v${version}.ipa`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      <span>{language === 'ko' ? 'iOS IPA 패키지 다운로드' : 'Download iOS IPA'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 3. Safari Add to Home Screen Instructions */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400" />
                    <span>{language === 'ko' ? 'Safari에서 즉시 홈 화면에 추가 (무설치 PWA)' : 'Add to Home Screen (Instant PWA)'}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    3초 설치
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] text-indigo-400 font-bold block">STEP 1</span>
                    <div className="flex items-center gap-1.5 font-medium text-white">
                      <Share2 size={13} />
                      <span>공유 버튼 터치</span>
                    </div>
                    <p className="text-[11px] text-slate-400">아이폰 Safari 하단의 공유 아이콘을 누릅니다.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] text-indigo-400 font-bold block">STEP 2</span>
                    <div className="font-medium text-white">
                      <span>홈 화면에 추가</span>
                    </div>
                    <p className="text-[11px] text-slate-400">공유 메뉴를 올려 [홈 화면에 추가]를 선택합니다.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] text-indigo-400 font-bold block">STEP 3</span>
                    <div className="font-medium text-white">
                      <span>[추가] 터치 완료</span>
                    </div>
                    <p className="text-[11px] text-slate-400">우측 상단 추가를 누르면 앱 아이콘이 생성됩니다.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (isInstallable) {
                        triggerPwaInstall();
                      } else {
                        setSafariHint(
                          language === 'ko'
                            ? '아이폰 Safari 브라우저 하단의 공유 버튼(네모+화살표)을 누른 후 [홈 화면에 추가]를 터치하시면 3초 만에 앱 아이콘이 생성됩니다!'
                            : 'Open Safari, tap the Share icon, and select "Add to Home Screen" to install.'
                        );
                        setTimeout(() => setSafariHint(null), 5000);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>{language === 'ko' ? '홈 화면 바로가기 생성 (PWA 설치)' : 'Install PWA App'}</span>
                  </button>
                  {safariHint && (
                    <p className="mt-2 p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-xs text-indigo-200 animate-in fade-in duration-200 text-center">
                      {safariHint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ANDROID (APK) */}
          {/* ========================================================================= */}
          {activeTab === 'android' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{language === 'ko' ? '안드로이드 전용 APK 패키지' : 'Android APK Package'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      정식 빌드
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'ko'
                      ? '구글 플레이스토어를 거치지 않고 직접 안드로이드 스마트폰에 설치할 수 있는 독립 실행형 APK 파일입니다. Android 8.0 (API 26) 이상 모든 기기를 지원합니다.'
                      : 'Standalone Android package (APK). Supports Android 8.0+ devices.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* APK Card */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">snapcleanai-mobile-v{version}.apk</h4>
                      <p className="text-xs text-slate-400 mt-0.5">안드로이드 설치 패키지 (APK)</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      APK v{version}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Package ID:</span>
                      <span className="text-emerald-300">com.snapclean.app</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min SDK:</span>
                      <span>24 (Android 7.0+)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target SDK:</span>
                      <span>34 (Android 14)</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href="/api/download/apk"
                      download={`snapcleanai-mobile-v${version}.apk`}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                    >
                      <Download size={16} />
                      <span>{language === 'ko' ? 'APK 직접 다운로드 (즉시 설치)' : 'Download Android APK'}</span>
                    </a>
                  </div>
                </div>

                {/* Installation Steps */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{language === 'ko' ? '안드로이드 설치 방법' : 'Installation Guide'}</span>
                  </h4>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>
                      스마트폰에서 <strong className="text-emerald-300">APK 다운로드</strong> 버튼을 누릅니다.
                    </li>
                    <li>
                      다운로드 완료 알림을 누르고 <strong>[설치]</strong>를 선택합니다.
                    </li>
                    <li>
                      <em>'출처를 알 수 없는 앱'</em> 안내창이 뜨면 <strong>[이 출처의 앱 허용]</strong>을 켜고 설치를 완료합니다.
                    </li>
                    <li>
                      바탕화면의 <strong>SnapClean AI</strong> 아이콘을 눌러 사진 정리를 시작합니다.
                    </li>
                  </ol>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">GitHub Releases:</span>
                    <a
                      href={releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>릴리스 페이지</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PC (WINDOWS) */}
          {/* ========================================================================= */}
          {activeTab === 'pc' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{language === 'ko' ? 'PC (Windows 10 / 11) 배포 패키지' : 'PC (Windows) Distribution'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Tauri v2 + Rust Core
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'ko'
                      ? '초고속 멀티스레드 Rust 네이티브 코어(snapclean_core.dll)와 결합된 PC 전용 설치/무설치 포터블 패키지입니다. 수만 장의 대용량 사진 폴더를 수 초 만에 색인합니다.'
                      : 'High-performance desktop package powered by Rust core and Tauri v2.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Portable Exe */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">snapcleanai-portable-v{version}.exe</h4>
                      <p className="text-xs text-slate-400 mt-0.5">무설치 단독 실행 포터블 (USB 지원)</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Portable
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    설치 과정 없이 다운로드 즉시 더블클릭하여 실행할 수 있는 독립형 포터블 실행 파일입니다.
                  </p>

                  <a
                    href="/api/download/portable"
                    download={`snapcleanai-portable-v${version}.exe`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/40 transition-all cursor-pointer"
                  >
                    <Download size={16} />
                    <span>{language === 'ko' ? '포터블 EXE 다운로드' : 'Download Portable EXE'}</span>
                  </a>
                </div>

                {/* Build Script Automation */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive size={16} className="text-blue-400" />
                    <span>{language === 'ko' ? '원클릭 자동 빌드 스크립트' : 'Build Scripts'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    프로젝트 루트의 배치 스크립트를 더블클릭하여 언제든 최신 버전의 실행 파일과 모바일 패키지를 재생성할 수 있습니다:
                  </p>

                  <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                    <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                      <span className="text-emerald-400">build.bat</span>
                      <span className="text-slate-400 text-[10px]">PC 포터블 & DLL 빌드</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                      <span className="text-indigo-400">build-mobile.bat</span>
                      <span className="text-slate-400 text-[10px]">Android APK & iOS IPA/Profile</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                      <span className="text-amber-400">github-push.bat</span>
                      <span className="text-slate-400 text-[10px]">GitHub 자동 릴리스 푸시</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {language === 'ko'
                ? '모든 플랫폼 패키지가 Semantic Versioning(v2.4.0)에 맞춰 동기화되었습니다.'
                : 'All platform artifacts synchronized with SemVer v2.4.0.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
