// Единый конфиг брейкпоинтов для медиазапросов и условной логики
// Синхронизирован с Tailwind по умолчанию

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536, // соответствует Tailwind 2xl
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export function isBreakpoint(width: number, key: BreakpointKey): boolean {
  return width >= BREAKPOINTS[key];
}
