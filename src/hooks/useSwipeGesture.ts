/**
 * Swipe Gesture Hook
 * Detects swipe gestures for mobile navigation
 * Enhanced in Phase 3 with haptic feedback and logging
 */

import { useRef, useEffect, useCallback } from 'react';
import { hapticFeedback } from '@/utils/haptic';
import { logger } from '@/utils/logger';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /**
   * Minimum distance (in pixels) for swipe to register
   * @default 50
   */
  threshold?: number;
  /**
   * Enable haptic feedback on swipe
   * @default true
   */
  enableHaptic?: boolean;
  /**
   * Log swipe events for debugging
   * @default false
   */
  debug?: boolean;
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    enableHaptic = true,
    debug = false,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleSwipe = useCallback((direction: SwipeDirection, deltaX: number, deltaY: number) => {
    if (debug) {
      logger.debug('Swipe detected', 'gesture', { direction, deltaX, deltaY });
    }

    // Trigger haptic feedback
    if (enableHaptic) {
      hapticFeedback.swipe();
    }

    // Call appropriate callback
    switch (direction) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
      case 'down':
        onSwipeDown?.();
        break;
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, enableHaptic, debug]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Horizontal swipe
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        const direction = deltaX > 0 ? 'right' : 'left';
        handleSwipe(direction, deltaX, deltaY);
      }

      // Vertical swipe
      if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        const direction = deltaY > 0 ? 'down' : 'up';
        handleSwipe(direction, deltaX, deltaY);
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, handleSwipe]);

  return elementRef;
};

/**
 * Hook to handle back navigation swipe (swipe from left edge to right)
 * Common pattern for mobile apps
 *
 * @example
 * ```tsx
 * const containerRef = useBackSwipe(() => navigate(-1));
 * return <div ref={containerRef}>Content</div>;
 * ```
 */
export const useBackSwipe = (
  onBack: () => void,
  options: {
    edgeThreshold?: number;
    minDistance?: number;
  } = {}
) => {
  const { edgeThreshold = 50, minDistance = 100 } = options;
  const isEdgeSwipe = useRef(false);
  const touchStartXRef = useRef(0);

  return useSwipeGesture({
    threshold: minDistance,
    onSwipeRight: () => {
      // Only trigger if swipe started from left edge
      if (touchStartXRef.current <= edgeThreshold) {
        onBack();
      }
    },
    onSwipeLeft: () => {
      // Reset edge swipe flag
      isEdgeSwipe.current = false;
    },
  });
};
