/**
 * 📏 Design System - Spacing Tokens
 * 8px base grid system
 * 
 * @critical Use ONLY these tokens for spacing
 * @usage import { spacing } from '@/design-system/tokens'
 */

export const spacing = {
  0: '0px',
  1: '4px',    // 0.5 unit
  2: '8px',    // 1 unit (base)
  3: '12px',   // 1.5 units
  4: '16px',   // 2 units
  5: '20px',   // 2.5 units
  6: '24px',   // 3 units
  8: '32px',   // 4 units
  10: '40px',  // 5 units
  12: '48px',  // 6 units
  16: '64px',  // 8 units
  20: '80px',  // 10 units
  24: '96px',  // 12 units
} as const;

// Touch target sizes (mobile-first)
export const touchTargets = {
  minimum: '44px',   // iOS minimum
  comfortable: '48px', // Android Material Design
  large: '56px',     // Large buttons
} as const;

export type SpacingToken = typeof spacing;
