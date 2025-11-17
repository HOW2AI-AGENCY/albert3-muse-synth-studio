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
    minCardWidth: 140, // ✅ Уменьшено для лучшей адаптивности
    maxCardWidth: 180, // ✅ Компактнее для мобильных
    idealCardWidth: 160,
    minColumns: 2, // ✅ 2 колонки на мобильных
    maxColumns: 2,
  },
  tablet: {
    minCardWidth: 180, // ✅ Уменьшено для лучшей адаптивности
    maxCardWidth: 260,
    idealCardWidth: 220,
    minColumns: 2, // ✅ Минимум 2 колонки при открытой панели
    maxColumns: 4,
  },
  desktop: {
    minCardWidth: 220,
    maxCardWidth: 300,
    idealCardWidth: 260,
    minColumns: 3, // ✅ Минимум 3 колонки
    maxColumns: 5,
  },
  wide: {
    minCardWidth: 240,
    maxCardWidth: 320,
    idealCardWidth: 280,
    minColumns: 4,
    maxColumns: 6,
  },
  ultrawide: {
    minCardWidth: 260,
    maxCardWidth: 340,
    idealCardWidth: 300,
    minColumns: 5,
    maxColumns: 8,
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

    // Adjust for detail panel (reduce columns more aggressively)
    let { minColumns, maxColumns } = config;
    if (isDetailPanelOpen) {
      // Более агрессивное уменьшение для панели деталей
      if (isMobile) {
        minColumns = 1;
        maxColumns = 2;
      } else if (isTablet) {
        minColumns = 2;
        maxColumns = 3;
      } else {
        minColumns = Math.max(2, minColumns - 1);
        maxColumns = Math.max(minColumns, maxColumns - 2);
      }
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
