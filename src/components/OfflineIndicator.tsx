import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  language?: 'ko' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language = 'ko' }) => {
  const isOnline = useOnlineStatus();
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    const handleOutboxUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ pendingCount?: number; flushing?: boolean }>;
      if (typeof custom.detail?.pendingCount === 'number') {
        setPendingOutboxCount(custom.detail.pendingCount);
      }
      if (typeof custom.detail?.flushing === 'boolean') {
        setIsFlushing(custom.detail.flushing);
      }
    };

    window.addEventListener('ai-outbox-updated', handleOutboxUpdate);
    return () => window.removeEventListener('ai-outbox-updated', handleOutboxUpdate);
  }, []);

  if (isOnline && pendingOutboxCount === 0 && !isFlushing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b shrink-0 transition-colors ${
        !isOnline
          ? 'bg-amber-950/95 border-amber-500/30 text-amber-200'
          : 'bg-indigo-950/95 border-indigo-500/30 text-indigo-200'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={14} className="text-amber-400 shrink-0" />
          <span className="truncate">
            {language === 'ko'
              ? '오프라인 모드 — 로컬 라이브러리·중복 정리·캐시된 썸네일은 정상 작동합니다'
              : 'Offline mode — local library, dedupe & cached thumbnails work locally'}
          </span>
          {pendingOutboxCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono tabular-nums shrink-0">
              {language === 'ko' ? `대기 ${pendingOutboxCount}` : `${pendingOutboxCount} queued`}
            </span>
          )}
        </>
      ) : (
        <>
          {isFlushing ? (
            <RefreshCw size={14} className="text-indigo-400 animate-spin shrink-0" />
          ) : (
            <CloudUpload size={14} className="text-indigo-400 shrink-0" />
          )}
          <span className="truncate tabular-nums">
            {language === 'ko'
              ? `온라인 복귀 — 대기 중이던 AI 요청 ${pendingOutboxCount}건 동기화 중`
              : `Back online — syncing ${pendingOutboxCount} queued AI requests`}
          </span>
        </>
      )}
    </div>
  );
};
