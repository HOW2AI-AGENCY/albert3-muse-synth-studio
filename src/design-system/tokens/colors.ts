/**
 * 🎨 Design System - Color Tokens
 * Based on mobile mockups: AI Audio Architect Platform & Aura AI
 * 
 * @critical DO NOT use colors directly in components
 * @usage import { colors } from '@/design-system/tokens'
 */

export const colors = {
  // Background layers
  background: {
    primary: 'hsl(240, 30%, 4%)',      // #0a0a0f - Main dark background
    secondary: 'hsl(240, 10%, 9%)',    // #18181b - Card backgrounds
    tertiary: 'hsl(240, 6%, 15%)',     // #27272a - Elevated surfaces
    glass: 'hsla(240, 20%, 8%, 0.85)', // Glassmorphism effect
    muted: 'hsl(240, 5%, 21%)',        // #36363a - Disabled/muted
  },

  // Accent colors (purple-pink gradient theme)
  accent: {
    primary: 'hsl(258, 84%, 65%)',     // #8b5cf6 - Primary purple
    secondary: 'hsl(330, 81%, 60%)',   // #ec4899 - Pink accent
    tertiary: 'hsl(189, 94%, 43%)',    // #06b6d4 - Cyan accent
    gradient: {
      from: 'hsl(258, 84%, 65%)',      // Purple
      via: 'hsl(300, 76%, 62%)',       // Magenta
      to: 'hsl(330, 81%, 60%)',        // Pink
    },
  },

  // Text colors
  text: {
    primary: 'hsl(0, 0%, 100%)',       // #ffffff - Main text
    secondary: 'hsl(240, 5%, 65%)',    // #a1a1aa - Secondary text
    tertiary: 'hsl(240, 5%, 45%)',     // #71717a - Muted text
    muted: 'hsl(240, 4%, 32%)',        // #52525b - Disabled text
    inverse: 'hsl(240, 30%, 4%)',      // Dark text on light backgrounds
  },

  // Status colors
  status: {
    success: 'hsl(142, 71%, 45%)',     // #22c55e - Success green
    warning: 'hsl(48, 96%, 53%)',      // #eab308 - Warning yellow
    error: 'hsl(0, 84%, 60%)',         // #ef4444 - Error red
    info: 'hsl(217, 91%, 60%)',        // #3b82f6 - Info blue
    processing: 'hsl(189, 94%, 43%)',  // Cyan for processing
  },

  // Interactive states
  interactive: {
    hover: 'hsla(258, 84%, 65%, 0.1)', // Subtle purple overlay
    active: 'hsla(258, 84%, 65%, 0.2)', // Stronger purple overlay
    focus: 'hsla(258, 84%, 65%, 0.3)',  // Focus ring
    disabled: 'hsl(240, 5%, 21%)',      // Disabled state
  },

  // Borders
  border: {
    default: 'hsl(240, 4%, 25%)',      // #3f3f46 - Default border
    subtle: 'hsl(240, 4%, 18%)',       // #27272a - Subtle border
    strong: 'hsl(240, 5%, 35%)',       // Stronger border
    accent: 'hsl(258, 84%, 65%)',      // Accent border
  },
} as const;

export type ColorToken = typeof colors;
