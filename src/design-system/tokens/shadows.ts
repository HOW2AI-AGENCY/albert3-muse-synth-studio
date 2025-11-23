/**
 * 🌑 Design System - Shadow Tokens
 * Glassmorphism and elevation shadows
 * 
 * @usage import { shadows } from '@/design-system/tokens'
 */

export const shadows = {
  // Standard elevation shadows
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  
  // Glassmorphism effects
  glass: {
    sm: '0 4px 30px rgba(0, 0, 0, 0.1)',
    md: '0 8px 32px rgba(0, 0, 0, 0.2)',
    lg: '0 16px 48px rgba(0, 0, 0, 0.3)',
  },

  // Accent glow shadows (purple/pink)
  glow: {
    primary: '0 0 20px rgba(139, 92, 246, 0.4)',   // Purple glow
    secondary: '0 0 20px rgba(236, 72, 153, 0.4)', // Pink glow
    strong: '0 0 40px rgba(139, 92, 246, 0.6)',    // Strong purple
  },

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
  
  none: 'none',
} as const;

export type ShadowToken = typeof shadows;
