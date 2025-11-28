/**
 * ✅ Phase 6: Virtualized List Hook for Large Datasets
 * Оптимизация рендеринга больших списков треков
 *
 * ✅ FIX (2025-11-28): Added memoization to prevent re-render storm
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useResponsive } from './useResponsive';

interface VirtualizedListConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

interface VirtualizedListResult<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    offsetTop: number;
  }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToIndex: (index: number) => void;
}

export function useVirtualizedList<T>(
  items: T[],
  config: VirtualizedListConfig
): VirtualizedListResult<T> {
  const { itemHeight, overscan = 3, containerHeight = 600 } = config;
  const { isMobile } = useResponsive();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // ✅ FIX: Memoize startIndex calculation to prevent unnecessary recalculations
  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan]
  );

  // ✅ FIX: Memoize endIndex calculation
  const endIndex = useMemo(
    () => Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    ),
    [scrollTop, containerHeight, itemHeight, overscan, items.length]
  );

  // ✅ FIX: Memoize virtualItems array to prevent re-creating on every render
  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: i * itemHeight,
      });
    }
    return result;
  }, [startIndex, endIndex, items, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current) return;

    const offsetTop = index * itemHeight;
    containerRef.current.scrollTo({
      top: offsetTop,
      behavior: isMobile ? 'auto' : 'smooth',
    });
  }, [itemHeight, isMobile]);

  // ✅ FIX: Memoize totalHeight calculation
  const totalHeight = useMemo(
    () => items.length * itemHeight,
    [items.length, itemHeight]
  );

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollToIndex,
  };
}
