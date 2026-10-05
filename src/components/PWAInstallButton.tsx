import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X } from 'lucide-react';

interface PWAInstallButtonProps {
  language?: 'ko' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language = 'ko' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install-app"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
        title={language === 'ko' ? '스마트폰에 앱으로 설치' : 'Install App to Home Screen'}
      >
        <Download size={14} className="animate-bounce" />
        <span>{language === 'ko' ? '앱 설치' : 'Install App'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
        >
          <Share2 size={13} />
          <span>{language === 'ko' ? '홈 화면에 추가' : 'Add to Home'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  {language === 'ko' ? '아이폰/아이패드 홈 화면에 추가' : 'Install on iPhone / iPad'}
                </h3>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed space-y-2">
                {language === 'ko' ? (
                  <>
                    1. Safari 하단의 <strong className="text-indigo-400">공유 버튼</strong>(네모+화살표)을 누릅니다.<br />
                    2. 메뉴를 아래로 내려 <strong className="text-emerald-400">홈 화면에 추가</strong>를 누릅니다.<br />
                    3. 우측 상단 <strong className="text-white font-semibold">추가</strong>를 누르면 홈 화면에 정식 앱으로 설치됩니다.
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari.<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                    3. Tap <strong>Add</strong> to complete installation.
                  </>
                )}
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white border border-slate-700 transition-colors"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
