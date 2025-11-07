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
    minCardWidth: 280, // ✅ FIXED: Match TrackCard min-w-[280px]
    maxCardWidth: 360, // ✅ Increased for better mobile experience
    idealCardWidth: 320,
    minColumns: 1, // ✅ Single column on small screens
    maxColumns: 2, // ✅ Max 2 columns on mobile
  },
  tablet: {
    minCardWidth: 320, // ✅ FIXED: Match TrackCard sm:min-w-[320px]
    maxCardWidth: 400,
    idealCardWidth: 350,
    minColumns: 2,
    maxColumns: 3,
  },
  desktop: {
    minCardWidth: 320,
    maxCardWidth: 420,
    idealCardWidth: 360,
    minColumns: 3,
    maxColumns: 4,
  },
  wide: {
    minCardWidth: 320,
    maxCardWidth: 420,
    idealCardWidth: 360,
    minColumns: 4,
    maxColumns: 5,
  },
  ultrawide: {
    minCardWidth: 320,
    maxCardWidth: 420,
    idealCardWidth: 360,
    minColumns: 5,
    maxColumns: 7,
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
