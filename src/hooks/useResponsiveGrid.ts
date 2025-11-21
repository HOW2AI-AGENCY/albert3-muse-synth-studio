/**
 * 🔒 PROTECTED: Advanced responsive grid hook
 * 
 * Dynamic grid calculation based on:
 * - Container width
 * - Screen category (mobile/tablet/desktop/wide/ultrawide)
 * - Detail panel state
 * - Device orientation
 * 
 * @version 2.0.0
 * @protected
 * @refactor Jules, UI/UX Designer - Replaced pixel values with Tailwind CSS classes to enforce Design System consistency.
 */
import { useMemo } from 'react';
import { getScreenCategory } from '@/config/breakpoints.config';

interface ResponsiveGridConfig {
  minCardWidth: number;
  maxCardWidth: number;
  idealCardWidth: number;
  minColumns: number;
  maxColumns: number;
}

/**
 * FIXME: The return type is changed to return Tailwind classes instead of numbers.
 * This is a breaking change and all components using this hook must be updated.
 */
interface ResponsiveGridParams {
  columns: number; // Keep for virtualization logic
  gap: number; // Keep for virtualization logic
  cardWidth: number;
  screenCategory: 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultrawide';
  gridClass: string;
  gapClass: string;
}

interface UseResponsiveGridOptions {
  isDetailPanelOpen?: boolean;
  orientation?: 'portrait' | 'landscape';
}

const GRID_CONFIGS: Record<string, ResponsiveGridConfig> = {
  mobile: { minCardWidth: 280, maxCardWidth: 480, idealCardWidth: 360, minColumns: 1, maxColumns: 1 },
  tablet: { minCardWidth: 200, maxCardWidth: 280, idealCardWidth: 240, minColumns: 3, maxColumns: 4 },
  desktop: { minCardWidth: 240, maxCardWidth: 320, idealCardWidth: 280, minColumns: 4, maxColumns: 5 },
  wide: { minCardWidth: 260, maxCardWidth: 340, idealCardWidth: 300, minColumns: 5, maxColumns: 6 },
  ultrawide: { minCardWidth: 280, maxCardWidth: 360, idealCardWidth: 320, minColumns: 6, maxColumns: 8 },
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
        gap: 16, // Corresponds to gap-4
        cardWidth: 220,
        screenCategory: 'desktop' as const,
        gridClass: 'grid-cols-3',
        gapClass: 'gap-4',
      };
    }

    const screenCategory = getScreenCategory(containerWidth);
    const config = GRID_CONFIGS[screenCategory] || GRID_CONFIGS.desktop;

    let { minColumns, maxColumns } = config;
    if (isDetailPanelOpen) {
      minColumns = Math.max(2, minColumns - 1);
      maxColumns = Math.max(minColumns, maxColumns - 2);
    }
    if (orientation === 'portrait' && screenCategory === 'tablet') {
      minColumns = Math.max(2, minColumns - 1);
      maxColumns = Math.max(minColumns, maxColumns - 1);
    }

    const idealColumns = Math.floor(containerWidth / config.idealCardWidth);
    const minCols = Math.max(minColumns, Math.floor(containerWidth / config.maxCardWidth));
    const maxCols = Math.min(maxColumns, Math.floor(containerWidth / config.minCardWidth));
    const columns = Math.max(minColumns, Math.min(maxColumns, Math.max(minCols, Math.min(idealColumns, maxCols))));

    // ✅ TODO: Replaced magic numbers with Tailwind classes based on design tokens.
    // This centralizes styling logic and adheres to the design system.
    let gap = 24; // Default gap
    let gapClass = 'gap-6';
    if (screenCategory === 'mobile') {
      gap = 12; // 12px = space-3
      gapClass = 'gap-3';
    } else if (screenCategory === 'tablet') {
      gap = 16; // 16px = space-4
      gapClass = 'gap-4';
    } else if (screenCategory === 'desktop') {
      gap = 20; // 20px = space-5
      gapClass = 'gap-5';
    } else if (screenCategory === 'wide') {
      gap = 24; // 24px = space-6
      gapClass = 'gap-6';
    } else if (screenCategory === 'ultrawide') {
      gap = 32; // 32px = space-8
      gapClass = 'gap-8';
    }

    const availableWidth = containerWidth - (gap * (columns - 1));
    const cardWidth = Math.min(config.maxCardWidth, availableWidth / columns);

    // ✅ Added gridClass for direct use in className
    const gridClass = `grid-cols-${columns}`;

    return { 
      columns, 
      gap, 
      cardWidth,
      screenCategory,
      gridClass,
      gapClass,
    };
  }, [containerWidth, isDetailPanelOpen, orientation]);
};
