/**
 * Hook for calculating adaptive grid parameters
 * Dynamically adjusts columns, gaps, and card widths based on container width
 */
import { useMemo } from 'react';

const CARD_MIN_WIDTH = 280;
const CARD_MAX_WIDTH = 360;
const CARD_IDEAL_WIDTH = 320;

export interface AdaptiveGridParams {
  columns: number;
  gap: number;
  cardWidth: number;
}

export const useAdaptiveGrid = (containerWidth: number): AdaptiveGridParams => {
  return useMemo(() => {
    if (containerWidth === 0) {
      return { columns: 1, gap: 16, cardWidth: CARD_MIN_WIDTH };
    }

    // Calculate optimal number of columns
    const idealColumns = Math.floor(containerWidth / CARD_IDEAL_WIDTH);
    const minColumns = Math.max(1, Math.floor(containerWidth / CARD_MAX_WIDTH));
    const maxColumns = Math.max(1, Math.floor(containerWidth / CARD_MIN_WIDTH));
    
    const columns = Math.max(minColumns, Math.min(idealColumns, maxColumns));
    
    // Dynamic gap based on container width
    let gap = 24; // default
    if (containerWidth < 640) gap = 16;
    else if (containerWidth < 1024) gap = 20;
    else if (containerWidth < 1536) gap = 24;
    else gap = 32;
    
    // Calculate actual card width
    const availableWidth = containerWidth - (gap * (columns - 1));
    const cardWidth = Math.min(CARD_MAX_WIDTH, availableWidth / columns);
    
    return { columns, gap, cardWidth };
  }, [containerWidth]);
};
