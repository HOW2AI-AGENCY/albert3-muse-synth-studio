/**
 * 🔒 CRITICAL: PROTECTED FILE - DO NOT MODIFY WITHOUT TEAM LEAD APPROVAL
 * 
 * Single Source of Truth for all breakpoint definitions
 * Used by: CSS, Tailwind, React hooks, media queries
 * 
 * @version 1.0.0
 * @protected
 * @critical
 * @author Team Lead
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

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Screen size categories for responsive design
 */
export const SCREEN_CATEGORIES = {
  mobile: { min: 0, max: BREAKPOINTS.md - 1 },
  tablet: { min: BREAKPOINTS.md, max: BREAKPOINTS.lg - 1 },
  desktop: { min: BREAKPOINTS.lg, max: BREAKPOINTS.xl - 1 },
  wide: { min: BREAKPOINTS.xl, max: BREAKPOINTS['2xl'] - 1 },
  ultrawide: { min: BREAKPOINTS['2xl'], max: Infinity },
} as const;

export type ScreenCategory = keyof typeof SCREEN_CATEGORIES;

/**
 * Generate media query string for a breakpoint
 * @param key - Breakpoint key
 * @param type - Query type (min or max)
 */
export const mediaQuery = (key: BreakpointKey, type: 'min' | 'max' = 'min'): string => {
  const value = BREAKPOINTS[key];
  const px = type === 'max' ? value - 1 : value;
  return `(${type}-width: ${px}px)`;
};

/**
 * Generate media query for screen category
 */
export const categoryQuery = (category: ScreenCategory): string => {
  const { min, max } = SCREEN_CATEGORIES[category];
  if (max === Infinity) {
    return `(min-width: ${min}px)`;
  }
  return `(min-width: ${min}px) and (max-width: ${max}px)`;
};

/**
 * CSS custom properties for dynamic breakpoints
 */
export const breakpointCSSVars = Object.entries(BREAKPOINTS).reduce((acc, [key, value]) => {
  acc[`--breakpoint-${key}`] = `${value}px`;
  return acc;
}, {} as Record<string, string>);

/**
 * Get screen category from width
 */
export const getScreenCategory = (width: number): ScreenCategory => {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  if (width < BREAKPOINTS.xl) return 'desktop';
  if (width < BREAKPOINTS['2xl']) return 'wide';
  return 'ultrawide';
};
