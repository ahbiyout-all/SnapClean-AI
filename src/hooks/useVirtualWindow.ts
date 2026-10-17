import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { uiPerformanceEngine } from '../services/uiPerformanceEngine';

export interface UseVirtualWindowOptions {
  totalCount: number;
  itemHeight: number;
  columns?: number;
  overscan?: number;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export interface VirtualWindowResult {
  startIndex: number;
  endIndex: number;
  startRow: number;
  endRow: number;
  topOffset: number;
  bottomOffset: number;
  totalHeight: number;
  renderedCount: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useVirtualWindow({
  totalCount,
  itemHeight,
  columns = 1,
  overscan = 3,
  scrollContainerRef,
  disabled = false
}: UseVirtualWindowOptions): VirtualWindowResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceId = useId();

  const cols = Math.max(1, columns);
  const totalRows = Math.ceil(totalCount / cols);
  const totalHeight = totalRows * itemHeight;

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  // Measure container or window scroll
  const updateScrollPosition = useCallback(() => {
    if (disabled || totalCount <= 12) return;

    if (scrollContainerRef && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      setScrollTop(el.scrollTop);
      setViewportHeight(el.clientHeight || 800);
    } else {
      // Window scroll relative to container top
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 800;
      setViewportHeight(vh);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerTop = rect.top + scrollY;
        const relativeScrollTop = Math.max(0, scrollY - containerTop);
        setScrollTop(relativeScrollTop);
      } else {
        setScrollTop(scrollY);
      }
    }
  }, [scrollContainerRef, disabled, totalCount]);

  useEffect(() => {
    if (disabled || totalCount <= 12) return;

    let ticking = false;
    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    updateScrollPosition();

    if (scrollContainerRef && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      return () => {
        el.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      window.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [updateScrollPosition, scrollContainerRef, disabled, totalCount]);

  // Virtual slice computation
  let startRow = 0;
  let endRow = totalRows;
  let startIndex = 0;
  let endIndex = totalCount;
  let topOffset = 0;
  let bottomOffset = 0;

  if (!disabled && totalCount > 12) {
    const rawStartRow = Math.floor(scrollTop / itemHeight);
    const rawEndRow = Math.ceil((scrollTop + viewportHeight) / itemHeight);

    startRow = Math.max(0, rawStartRow - overscan);
    endRow = Math.min(totalRows, rawEndRow + overscan);

    startIndex = startRow * cols;
    endIndex = Math.min(totalCount, endRow * cols);

    topOffset = startRow * itemHeight;
    bottomOffset = Math.max(0, (totalRows - endRow) * itemHeight);
  }

  const renderedCount = Math.max(0, endIndex - startIndex);

  // Sync with global telemetry
  useEffect(() => {
    uiPerformanceEngine.updateVirtualList(instanceId, totalCount, renderedCount);
    return () => {
      uiPerformanceEngine.unregisterVirtualList(instanceId);
    };
  }, [instanceId, totalCount, renderedCount]);

  return {
    startIndex,
    endIndex,
    startRow,
    endRow,
    topOffset,
    bottomOffset,
    totalHeight,
    renderedCount,
    containerRef
  };
}
