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
    minCardWidth: 140,
    maxCardWidth: 200,
    idealCardWidth: 160,
    minColumns: 2,
    maxColumns: 3,
  },
  tablet: {
    minCardWidth: 180,
    maxCardWidth: 240,
    idealCardWidth: 200,
    minColumns: 3,
    maxColumns: 4,
  },
  desktop: {
    minCardWidth: 220,
    maxCardWidth: 280,
    idealCardWidth: 250,
    minColumns: 4,
    maxColumns: 5,
  },
  wide: {
    minCardWidth: 220,
    maxCardWidth: 280,
    idealCardWidth: 250,
    minColumns: 5,
    maxColumns: 7,
  },
  ultrawide: {
    minCardWidth: 220,
    maxCardWidth: 280,
    idealCardWidth: 250,
    minColumns: 6,
    maxColumns: 9,
  },
};

export const useResponsiveGrid = (
  containerWidth: number,
  options: UseResponsiveGridOptions = {}
): ResponsiveGridParams => {
  const { isDetailPanelOpen = false, orientation = 'landscape' } = options;
  const { isMobile, isTablet, isDesktop, isXl, is2xl } = useBreakpoints();

  return useMemo(() => {
    if (containerWidth === 0) {
      return { 
        columns: 3, 
        gap: 16, 
        cardWidth: 220,
        screenCategory: 'desktop',
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
    if (orientation === 'portrait' && isTablet) {
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
    if (isMobile) gap = 12;
    else if (isTablet) gap = 16;
    else if (isDesktop) gap = 20;
    else if (isXl) gap = 24;
    else if (is2xl) gap = 32;

    // Calculate actual card width
    const availableWidth = containerWidth - (gap * (columns - 1));
    const cardWidth = Math.min(config.maxCardWidth, availableWidth / columns);

    return { 
      columns, 
      gap, 
      cardWidth,
      screenCategory,
    };
  }, [containerWidth, isDetailPanelOpen, orientation, isMobile, isTablet, isDesktop, isXl, is2xl]);
};
