import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, X } from 'lucide-react';

interface SWUpdateToastProps {
  language?: 'ko' | 'en';
}

export const SWUpdateToast: React.FC<SWUpdateToastProps> = ({ language = 'ko' }) => {
  const [updateFn, setUpdateFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const handleNeedRefresh = (e: Event) => {
      const custom = e as CustomEvent<{ updateSW?: (reloadPage?: boolean) => Promise<void> }>;
      if (custom.detail?.updateSW) {
        setUpdateFn(() => custom.detail.updateSW!);
      }
    };

    const handleOfflineReady = () => {
      setOfflineReady(true);
      setTimeout(() => setOfflineReady(false), 4500);
    };

    window.addEventListener('snapclean-sw-need-refresh', handleNeedRefresh);
    window.addEventListener('snapclean-sw-offline-ready', handleOfflineReady);
    return () => {
      window.removeEventListener('snapclean-sw-need-refresh', handleNeedRefresh);
      window.removeEventListener('snapclean-sw-offline-ready', handleOfflineReady);
    };
  }, []);

  if (!updateFn && !offlineReady) return null;

  return (
    <div className="fixed bottom-22 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-[9990]">
      {updateFn ? (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <RefreshCw size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {language === 'ko' ? '새 버전이 준비되었습니다' : 'App update ready'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'ko' ? '새로고침하여 최신 오프라인 리소스를 적용하세요.' : 'Reload to apply the latest offline assets.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => updateFn(true)}
              className="px-3 py-2 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {language === 'ko' ? '업데이트' : 'Update'}
            </button>
            <button
              type="button"
              onClick={() => setUpdateFn(null)}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold text-emerald-100 truncate">
              {language === 'ko' ? '오프라인 실행 준비가 완료되었습니다' : 'App ready for offline use'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReady(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
