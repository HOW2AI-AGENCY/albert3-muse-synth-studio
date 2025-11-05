/**
 * Haptic Feedback Utility
 * Provides tactile feedback for touch interactions on mobile devices
 * Phase 2 improvement from 2025-11-05 audit (P1-M3)
 *
 * Supports:
 * - Vibration API (standard)
 * - iOS Haptic Engine (webkit)
 * - Android Vibration
 */

import { logger } from './logger';

/**
 * Haptic feedback types
 */
export type HapticType =
  | 'light'       // Subtle feedback for minor interactions
  | 'medium'      // Standard feedback for normal interactions
  | 'heavy'       // Strong feedback for important actions
  | 'success'     // Positive feedback
  | 'warning'     // Caution feedback
  | 'error'       // Error feedback
  | 'selection';  // Item selection feedback

/**
 * Vibration patterns for different feedback types (in milliseconds)
 */
const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],      // Double tap pattern
  warning: [20, 100, 20],      // Longer double tap
  error: [30, 50, 30, 50, 30], // Triple tap pattern
  selection: 15,               // Quick tap for selections
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  // Check Vibration API
  if ('vibrate' in navigator) {
    return true;
  }

  // Check iOS Haptic Engine (webkit)
  if ('Taptic Engine' in window || 'webkitTapticEngine' in window) {
    return true;
  }

  return false;
};

/**
 * Check if user has enabled haptic feedback in preferences
 */
const isHapticEnabled = (): boolean => {
  try {
    const preference = localStorage.getItem('haptic-feedback-enabled');
    // Default to true if no preference is set
    return preference === null || preference === 'true';
  } catch {
    return true;
  }
};

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 * @param force - Force feedback even if disabled in preferences
 */
export const triggerHaptic = (type: HapticType = 'medium', force: boolean = false): void => {
  // Check if haptics are enabled
  if (!force && !isHapticEnabled()) {
    return;
  }

  // Check if supported
  if (!isHapticSupported()) {
    logger.debug('Haptic feedback not supported', 'haptic', { type });
    return;
  }

  const pattern = VIBRATION_PATTERNS[type];

  try {
    // Use Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      logger.debug('Haptic feedback triggered', 'haptic', { type, pattern });
    }
  } catch (error) {
    logger.warn('Failed to trigger haptic feedback', 'haptic', { type, error });
  }
};

/**
 * Enable haptic feedback
 */
export const enableHaptic = (): void => {
  try {
    localStorage.setItem('haptic-feedback-enabled', 'true');
    logger.info('Haptic feedback enabled', 'haptic');
  } catch (error) {
    logger.error('Failed to enable haptic feedback', error instanceof Error ? error : new Error(String(error)), 'haptic');
  }
};

/**
 * Disable haptic feedback
 */
export const disableHaptic = (): void => {
  try {
    localStorage.setItem('haptic-feedback-enabled', 'false');
    logger.info('Haptic feedback disabled', 'haptic');
  } catch (error) {
    logger.error('Failed to disable haptic feedback', error instanceof Error ? error : new Error(String(error)), 'haptic');
  }
};

/**
 * Toggle haptic feedback
 */
export const toggleHaptic = (): boolean => {
  const enabled = isHapticEnabled();
  if (enabled) {
    disableHaptic();
  } else {
    enableHaptic();
    triggerHaptic('success', true); // Confirm with haptic
  }
  return !enabled;
};

/**
 * Haptic feedback hooks for common interactions
 */
export const hapticFeedback = {
  /**
   * Button press feedback
   */
  buttonPress: () => triggerHaptic('light'),

  /**
   * Like/favorite toggle feedback
   */
  like: () => triggerHaptic('success'),

  /**
   * Unlike/unfavorite feedback
   */
  unlike: () => triggerHaptic('light'),

  /**
   * Play/pause feedback
   */
  playPause: () => triggerHaptic('medium'),

  /**
   * Delete action feedback
   */
  delete: () => triggerHaptic('warning'),

  /**
   * Error feedback
   */
  error: () => triggerHaptic('error'),

  /**
   * Success feedback
   */
  success: () => triggerHaptic('success'),

  /**
   * Item selection feedback
   */
  selection: () => triggerHaptic('selection'),

  /**
   * Navigation feedback
   */
  navigation: () => triggerHaptic('light'),

  /**
   * Drag start feedback
   */
  dragStart: () => triggerHaptic('medium'),

  /**
   * Drop feedback
   */
  drop: () => triggerHaptic('heavy'),

  /**
   * Swipe feedback
   */
  swipe: () => triggerHaptic('light'),

  /**
   * Long press feedback
   */
  longPress: () => triggerHaptic('heavy'),
};

/**
 * React hook for haptic feedback
 * @returns Haptic feedback utilities
 */
export const useHaptic = () => {
  return {
    triggerHaptic,
    isSupported: isHapticSupported(),
    isEnabled: isHapticEnabled(),
    enable: enableHaptic,
    disable: disableHaptic,
    toggle: toggleHaptic,
    feedback: hapticFeedback,
  };
};

// Export for convenience
export default {
  triggerHaptic,
  isSupported: isHapticSupported,
  isEnabled: isHapticEnabled,
  enable: enableHaptic,
  disable: disableHaptic,
  toggle: toggleHaptic,
  feedback: hapticFeedback,
};
