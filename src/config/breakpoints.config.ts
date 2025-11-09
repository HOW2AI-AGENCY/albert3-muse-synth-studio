// Единый конфиг брейкпоинтов для медиазапросов и условной логики
// Синхронизирован с Tailwind по умолчанию

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  /** Tailwind 2xl */
  '2xl': 1536,
  /** Дополнительные внутренние категории для широких экранов */
  '3xl': 1920,
  /** 4k условный порог */
  '4k': 2560,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export function isBreakpoint(width: number, key: BreakpointKey): boolean {
  return width >= BREAKPOINTS[key];
}

/**
 * Формирует медиазапрос по ключу брейкпоинта
 * type: 'min' | 'max'
 * - min: (min-width: Xpx)
 * - max: (max-width: X-1px)
 */
export function mediaQuery(key: BreakpointKey, type: 'min' | 'max' = 'min'): string {
  const px = BREAKPOINTS[key];
  if (type === 'min') return `(min-width: ${px}px)`;
  return `(max-width: ${px - 1}px)`;
}

/**
 * Возвращает категорию экрана для responsive-логики
 */
export function getScreenCategory(width: number): 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultrawide' {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  if (width < BREAKPOINTS.xl) return 'desktop';
  if (width < BREAKPOINTS['2xl']) return 'wide';
  return 'ultrawide';
}

/**
 * CSS custom properties для использования в стилях
 * Инжектится через injectBreakpointsCSSVars()
 */
export const breakpointCSSVars: Record<string, string> = {
  '--bp-sm': `${BREAKPOINTS.sm}px`,
  '--bp-md': `${BREAKPOINTS.md}px`,
  '--bp-lg': `${BREAKPOINTS.lg}px`,
  '--bp-xl': `${BREAKPOINTS.xl}px`,
  '--bp-2xl': `${BREAKPOINTS['2xl']}px`,
  '--bp-3xl': `${BREAKPOINTS['3xl']}px`,
  '--bp-4k': `${BREAKPOINTS['4k']}px`,
};
