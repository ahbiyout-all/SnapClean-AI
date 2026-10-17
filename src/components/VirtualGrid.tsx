import React, { useMemo } from 'react';
import { useVirtualWindow } from '../hooks/useVirtualWindow';

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number; // Estimated row height (px)
  columns?: number;
  overscan?: number;
  className?: string;
  gridClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  itemHeight = 300,
  columns = 1,
  overscan = 2,
  className = '',
  gridClassName = '',
  scrollContainerRef,
  disabled = false
}: VirtualGridProps<T>): React.ReactElement {
  const totalCount = items.length;

  const {
    startIndex,
    endIndex,
    topOffset,
    bottomOffset,
    containerRef
  } = useVirtualWindow({
    totalCount,
    itemHeight,
    columns,
    overscan,
    scrollContainerRef,
    disabled
  });

  const visibleItems = useMemo(() => {
    if (disabled || totalCount <= 12) {
      return items;
    }
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex, disabled, totalCount]);

  if (totalCount === 0) {
    return <div ref={containerRef} className={className} />;
  }

  // Small list fast-path: render directly without spacers
  if (disabled || totalCount <= 12) {
    return (
      <div ref={containerRef} className={className}>
        <div className={gridClassName}>
          {items.map((item, idx) => renderItem(item, idx))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative will-change-transform ${className}`}>
      {/* Top virtualization spacer */}
      {topOffset > 0 && (
        <div 
          style={{ height: `${topOffset}px` }} 
          aria-hidden="true" 
          className="w-full pointer-events-none transition-none"
        />
      )}

      {/* Visible DOM window */}
      <div className={gridClassName}>
        {visibleItems.map((item, offset) => {
          const actualIndex = startIndex + offset;
          return renderItem(item, actualIndex);
        })}
      </div>

      {/* Bottom virtualization spacer */}
      {bottomOffset > 0 && (
        <div 
          style={{ height: `${bottomOffset}px` }} 
          aria-hidden="true" 
          className="w-full pointer-events-none transition-none"
        />
      )}
    </div>
  );
}
