/**
 * 🎬 Design System - Animation Tokens
 * Transition durations and easing functions
 * 
 * @usage import { animations } from '@/design-system/tokens'
 */

export const animations = {
  // Transition durations
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Preset transitions
  transition: {
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms ease',
  },
} as const;

export type AnimationToken = typeof animations;
