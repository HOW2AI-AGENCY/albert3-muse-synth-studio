/**
 * Design Tokens Utility
 * Single Source of Truth for design system
 * Phase 1.2 improvement from 2025-11-05 audit
 */

import tokens from '@/styles/tokens.json';

export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type FontSizeToken = keyof typeof tokens.typography.fontSize;
export type BorderRadiusToken = keyof typeof tokens.borderRadius;
export type ShadowToken = keyof typeof tokens.shadows;

/**
 * Get HSL color value from token
 */
export function getColor(token: ColorToken): string {
  return tokens.colors[token].hsl;
}

/**
 * Get spacing value from token
 */
export function getSpacing(token: SpacingToken): string {
  return tokens.spacing[token];
}

/**
 * Get font size value from token
 */
export function getFontSize(token: FontSizeToken): string {
  return tokens.typography.fontSize[token];
}

/**
 * Get border radius value from token
 */
export function getBorderRadius(token: BorderRadiusToken): string {
  return tokens.borderRadius[token];
}

/**
 * Get shadow value from token
 */
export function getShadow(token: ShadowToken): string {
  return tokens.shadows[token];
}

/**
 * Get animation duration
 */
export function getAnimationDuration(speed: 'fast' | 'normal' | 'slow'): string {
  return tokens.animations.duration[speed];
}

/**
 * Get animation easing
 */
export function getAnimationEasing(type: 'easeIn' | 'easeOut' | 'easeInOut'): string {
  return tokens.animations.easing[type];
}

/**
 * Export all tokens for direct access
 */
export { tokens as designTokens };

/**
 * CSS custom property helper
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}
