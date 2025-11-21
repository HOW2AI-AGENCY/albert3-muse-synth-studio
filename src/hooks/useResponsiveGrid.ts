/**
 * 🔒 PROTECTED: Advanced responsive grid hook
 * 
 * Dynamic grid calculation based on:
 * - Container width
 * - Screen category (mobile/tablet/desktop/wide/ultrawide)
 * - Detail panel state
 * - Device orientation
 * 
 * @version 1.0.0
 * @protected
 */
import { useMemo } from 'react';
// @ts-expect-error - For future responsive features
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useBreakpoints } from './useBreakpoints';
import { getScreenCategory } from '@/config/breakpoints.config';

interface ResponsiveGridConfig {
  minCardWidth: number;
  maxCardWidth: number;
  idealCardWidth: number;
  minColumns: number;
  maxColumns: number;
}

interface ResponsiveGridParams {
  columns: number;
  gap: number;
  cardWidth: number;
  screenCategory: 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultrawide';
}

interface UseResponsiveGridOptions {
  isDetailPanelOpen?: boolean;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Grid configurations per screen category
 */
const GRID_CONFIGS: Record<string, ResponsiveGridConfig> = {
  mobile: {
    minCardWidth: 280, // ✅ Full width for single column on mobile
    maxCardWidth: 480, // ✅ Allow expansion on larger mobile devices
    idealCardWidth: 360,
    minColumns: 1, // ✅ Sprint 39: Single column on mobile (<768px)
    maxColumns: 1,
  },
  tablet: {
    minCardWidth: 200, // ✅ FIXED: Match TrackCard sm:min-w-[200px]
    maxCardWidth: 280,
    idealCardWidth: 240,
    minColumns: 3,
    maxColumns: 4,
  },
  desktop: {
    minCardWidth: 240,
    maxCardWidth: 320,
    idealCardWidth: 280,
    minColumns: 4,
    maxColumns: 5,
  },
  wide: {
    minCardWidth: 260,
    maxCardWidth: 340,
    idealCardWidth: 300,
    minColumns: 5,
    maxColumns: 6,
  },
  ultrawide: {
    minCardWidth: 280,
    maxCardWidth: 360,
    idealCardWidth: 320,
    minColumns: 6,
    maxColumns: 8,
  },
};

export const useResponsiveGrid = (
  containerWidth: number,
  options: UseResponsiveGridOptions = {}
): ResponsiveGridParams => {
  const { isDetailPanelOpen = false, orientation = 'landscape' } = options;

  return useMemo(() => {
    if (containerWidth === 0) {
      return { 
        columns: 3, 
        gap: 16, 
        cardWidth: 220,
        screenCategory: 'desktop' as const,
      };
    }

    // Determine screen category
    const screenCategory = getScreenCategory(containerWidth);
    
    // Get config for current screen
    const config = GRID_CONFIGS[screenCategory] || GRID_CONFIGS.desktop;

    // Adjust for detail panel (reduce columns)
    let { minColumns, maxColumns } = config;
    if (isDetailPanelOpen) {
      minColumns = Math.max(2, minColumns - 1);
      maxColumns = Math.max(minColumns, maxColumns - 2);
    }

    // Adjust for portrait orientation on tablets
    if (orientation === 'portrait' && screenCategory === 'tablet') {
      minColumns = Math.max(2, minColumns - 1);
      maxColumns = Math.max(minColumns, maxColumns - 1);
    }

    // Calculate optimal columns
    const idealColumns = Math.floor(containerWidth / config.idealCardWidth);
    const minCols = Math.max(minColumns, Math.floor(containerWidth / config.maxCardWidth));
    const maxCols = Math.min(maxColumns, Math.floor(containerWidth / config.minCardWidth));
    
    const columns = Math.max(
      minColumns, 
      Math.min(maxColumns, Math.max(minCols, Math.min(idealColumns, maxCols)))
    );

    // Dynamic gap based on screen category
    let gap = 24;
    if (screenCategory === 'mobile') gap = 12;
    else if (screenCategory === 'tablet') gap = 16;
    else if (screenCategory === 'desktop') gap = 20;
    else if (screenCategory === 'wide') gap = 24;
    else if (screenCategory === 'ultrawide') gap = 32;

    // Calculate actual card width
    const availableWidth = containerWidth - (gap * (columns - 1));
    const cardWidth = Math.min(config.maxCardWidth, availableWidth / columns);

    return { 
      columns, 
      gap, 
      cardWidth,
      screenCategory,
    };
  }, [containerWidth, isDetailPanelOpen, orientation]);
};
