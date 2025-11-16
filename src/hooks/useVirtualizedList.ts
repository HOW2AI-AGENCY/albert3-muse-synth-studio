/**
 * ✅ Phase 6: Virtualized List Hook for Large Datasets
 * Оптимизация рендеринга больших списков треков
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Generate virtual items
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      item: items[i],
      offsetTop: i * itemHeight,
    });
  }

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

  return {
    virtualItems,
    totalHeight: items.length * itemHeight,
    containerRef,
    scrollToIndex,
  };
}
