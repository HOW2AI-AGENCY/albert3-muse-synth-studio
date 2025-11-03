/**
 * Inject breakpoint CSS custom properties into :root
 * Called once on app initialization
 */
import { breakpointCSSVars } from '@/config/breakpoints.config';

export const injectBreakpointsCSSVars = (): void => {
  const root = document.documentElement;
  
  Object.entries(breakpointCSSVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};
