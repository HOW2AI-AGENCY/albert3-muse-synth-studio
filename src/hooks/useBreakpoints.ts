import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Unified breakpoints configuration
 * Matches tailwind.config.ts screens configuration
 */
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4k': 2560,
} as const;

/**
 * Unified breakpoints hook
 * Provides consistent screen size detection across all components
 * 
 * @returns Object with boolean flags for each breakpoint category
 */
export const useBreakpoints = () => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);
  
  return { 
    isMobile, 
    isTablet, 
    isDesktop,
    isXl,
    is2xl,
  };
};
