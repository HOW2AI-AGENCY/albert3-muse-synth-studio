/**
 * Full Screen Player Gestures Hook
 * Handles swipe, double tap, and pinch gestures for mobile
 */

import { useRef, useCallback } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface UseFullScreenGesturesProps {
  onSwipeDown: () => void;
  onDoubleTap?: () => void;
  onPinchZoom?: (scale: number) => void;
}

export const useFullScreenGestures = ({
  onSwipeDown,
  onDoubleTap,
  onPinchZoom,
}: UseFullScreenGesturesProps) => {
  const { vibrate } = useHapticFeedback();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    } else if (e.touches.length === 2 && onPinchZoom) {
      // Calculate initial distance between two fingers
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [onPinchZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && onPinchZoom && initialDistanceRef.current) {
      // Calculate current distance between two fingers
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate scale
      const scale = currentDistance / initialDistanceRef.current;
      onPinchZoom(scale);
    }
  }, [onPinchZoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length > 0) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Swipe down to minimize (threshold: 100px, primarily vertical)
    if (absDeltaY > absDeltaX && deltaY > 100 && deltaTime < 300) {
      vibrate('medium');
      onSwipeDown();
      touchStartRef.current = null;
      return;
    }

    // Double tap to play/pause (threshold: 300ms, minimal movement)
    if (onDoubleTap && absDeltaX < 10 && absDeltaY < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        vibrate('light');
        onDoubleTap();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }

    touchStartRef.current = null;
    initialDistanceRef.current = 0;
  }, [onSwipeDown, onDoubleTap, vibrate]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
