/**
 * ✅ UPDATED: Uses centralized breakpoint config (v2.0.0)
 * 
 * Unified breakpoints hook
 * Provides consistent screen size detection across all components
 * 
 * @version 2.0.0
 * @returns Object with boolean flags for each breakpoint category
 */
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BREAKPOINTS, mediaQuery } from '@/config/breakpoints.config';

// Re-export for backward compatibility
export { BREAKPOINTS } from '@/config/breakpoints.config';

/**
 * @deprecated Use `const { isMobile } = useBreakpoints()` instead
 */
export const useIsMobile = () => {
  const { isMobile } = useBreakpoints();
  return isMobile;
};

export const useBreakpoints = () => {
  const isMobile = useMediaQuery(mediaQuery('md', 'max'));
  const isTablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
  const isDesktop = useMediaQuery(mediaQuery('lg', 'min'));
  const isXl = useMediaQuery(mediaQuery('xl', 'min'));
  const is2xl = useMediaQuery(mediaQuery('2xl', 'min'));
  const is3xl = useMediaQuery(mediaQuery('3xl', 'min'));
  const is4k = useMediaQuery(mediaQuery('4k', 'min'));
  
  return { 
    isMobile, 
    isTablet, 
    isDesktop,
    isXl,
    is2xl,
    is3xl,
    is4k,
  };
};
