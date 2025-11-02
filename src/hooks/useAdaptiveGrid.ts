/**
 * Hook for calculating adaptive grid parameters
 * Dynamically adjusts columns, gaps, and card widths based on container width
 */
import { useMemo } from 'react';

const CARD_MIN_WIDTH = 220;
const CARD_MAX_WIDTH = 280;
const CARD_IDEAL_WIDTH = 250;

export interface AdaptiveGridParams {
  columns: number;
  gap: number;
  cardWidth: number;
}

interface UseAdaptiveGridOptions {
  isDetailPanelOpen?: boolean;
}

export const useAdaptiveGrid = (
  containerWidth: number,
  options: UseAdaptiveGridOptions = {}
): AdaptiveGridParams => {
  const { isDetailPanelOpen = false } = options;

  return useMemo(() => {
    if (containerWidth === 0) {
      return { columns: 3, gap: 16, cardWidth: CARD_MIN_WIDTH };
    }

    // Determine column constraints based on detail panel state
    const MIN_COLUMNS = isDetailPanelOpen ? 3 : 3;
    const MAX_COLUMNS = isDetailPanelOpen ? 3 : 5;

    // Calculate optimal number of columns
    const idealColumns = Math.floor(containerWidth / CARD_IDEAL_WIDTH);
    const minColumns = Math.max(MIN_COLUMNS, Math.floor(containerWidth / CARD_MAX_WIDTH));
    const maxColumns = Math.min(MAX_COLUMNS, Math.floor(containerWidth / CARD_MIN_WIDTH));
    
    const columns = Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.max(minColumns, Math.min(idealColumns, maxColumns))));
    
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
  }, [containerWidth, isDetailPanelOpen]);
};
