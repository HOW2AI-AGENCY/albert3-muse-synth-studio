/**
 * Touch Gesture Handler Hook
 *
 * Provides unified touch gesture handling for mobile DAW interface:
 * - Tap
 * - Long press
 * - Drag (horizontal/vertical)
 * - Pinch zoom
 * - Two-finger scroll
 *
 * @module hooks/useTouchGestures
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { logInfo } from '@/utils/logger';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface GestureCallbacks {
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number, deltaX: number, deltaY: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onPinchStart?: (distance: number, centerX: number, centerY: number) => void;
  onPinchMove?: (scale: number, centerX: number, centerY: number) => void;
  onPinchEnd?: () => void;
  onTwoFingerScroll?: (deltaX: number, deltaY: number) => void;
}

interface UseTouchGesturesOptions extends GestureCallbacks {
  longPressDelay?: number; // ms
  tapMaxDistance?: number; // px
  pinchThreshold?: number; // px
}

export const useTouchGestures = (options: UseTouchGesturesOptions = {}) => {
  const {
    onTap,
    onLongPress,
    onDragStart,
    onDragMove,
    onDragEnd,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    onTwoFingerScroll,
    longPressDelay = 500,
    tapMaxDistance = 10,
    pinchThreshold = 10,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTouchRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const initialPinchDistanceRef = useRef(0);
  const lastPinchScaleRef = useRef(1);

  const [isLongPressing, setIsLongPressing] = useState(false);

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // Calculate distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch) => {
    return getDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY);
  }, [getDistance]);

  // Get center point between two touches
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };
      lastTouchRef.current = touchStartRef.current;

      if (e.touches.length === 1) {
        // Single finger - start long press timer
        isDraggingRef.current = false;

        longPressTimerRef.current = setTimeout(() => {
          if (!isDraggingRef.current && touchStartRef.current) {
            setIsLongPressing(true);
            onLongPress?.(touchStartRef.current.x, touchStartRef.current.y);
            logInfo('Long press detected', 'useTouchGestures', {
              x: touchStartRef.current.x,
              y: touchStartRef.current.y,
            });
          }
        }, longPressDelay);
      } else if (e.touches.length === 2) {
        // Two fingers - pinch or scroll
        clearLongPressTimer();
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const center = getTouchCenter(e.touches[0], e.touches[1]);

        initialPinchDistanceRef.current = distance;
        lastPinchScaleRef.current = 1;
        isPinchingRef.current = true;

        onPinchStart?.(distance, center.x, center.y);
      }
    },
    [
      onLongPress,
      onPinchStart,
      clearLongPressTimer,
      getTouchDistance,
      getTouchCenter,
      longPressDelay,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || !lastTouchRef.current) return;

      const touch = e.touches[0];
      const now = Date.now();

      if (e.touches.length === 1) {
        // Single finger - drag
        const deltaX = touch.clientX - lastTouchRef.current.x;
        const deltaY = touch.clientY - lastTouchRef.current.y;
        const totalDistance = getDistance(
          touch.clientX,
          touch.clientY,
          touchStartRef.current.x,
          touchStartRef.current.y
        );

        // Start dragging if moved beyond threshold
        if (totalDistance > tapMaxDistance && !isDraggingRef.current) {
          isDraggingRef.current = true;
          clearLongPressTimer();
          onDragStart?.(touchStartRef.current.x, touchStartRef.current.y);
        }

        // Continue dragging
        if (isDraggingRef.current) {
          onDragMove?.(touch.clientX, touch.clientY, deltaX, deltaY);
        }

        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        };
      } else if (e.touches.length === 2 && isPinchingRef.current) {
        // Two fingers - pinch zoom or scroll
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const scale = distance / initialPinchDistanceRef.current;

        // Detect if it's a pinch (distance change) or scroll (parallel movement)
        const distanceChange = Math.abs(distance - initialPinchDistanceRef.current);

        if (distanceChange > pinchThreshold) {
          // Pinch zoom
          onPinchMove?.(scale, center.x, center.y);
          lastPinchScaleRef.current = scale;
        } else {
          // Two-finger scroll
          const deltaX = center.x - (lastTouchRef.current?.x || center.x);
          const deltaY = center.y - (lastTouchRef.current?.y || center.y);
          onTwoFingerScroll?.(deltaX, deltaY);
        }

        lastTouchRef.current = {
          x: center.x,
          y: center.y,
          time: now,
        };
      }
    },
    [
      onDragStart,
      onDragMove,
      onPinchMove,
      onTwoFingerScroll,
      clearLongPressTimer,
      getTouchDistance,
      getTouchCenter,
      getDistance,
      tapMaxDistance,
      pinchThreshold,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      clearLongPressTimer();

      if (e.touches.length === 0) {
        // All fingers lifted
        if (isPinchingRef.current) {
          onPinchEnd?.();
          isPinchingRef.current = false;
          initialPinchDistanceRef.current = 0;
          lastPinchScaleRef.current = 1;
        } else if (isDraggingRef.current) {
          const touch = e.changedTouches[0];
          onDragEnd?.(touch.clientX, touch.clientY);
          isDraggingRef.current = false;
        } else if (!isLongPressing) {
          // Tap
          const touch = e.changedTouches[0];
          const distance = getDistance(
            touch.clientX,
            touch.clientY,
            touchStartRef.current.x,
            touchStartRef.current.y
          );

          if (distance <= tapMaxDistance) {
            onTap?.(touch.clientX, touch.clientY);
            logInfo('Tap detected', 'useTouchGestures', {
              x: touch.clientX,
              y: touch.clientY,
            });
          }
        }

        touchStartRef.current = null;
        lastTouchRef.current = null;
        setIsLongPressing(false);
      }
    },
    [
      onTap,
      onDragEnd,
      onPinchEnd,
      clearLongPressTimer,
      getDistance,
      tapMaxDistance,
      isLongPressing,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isLongPressing,
    isDragging: isDraggingRef.current,
    isPinching: isPinchingRef.current,
  };
};
