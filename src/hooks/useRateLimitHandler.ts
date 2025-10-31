import { useState, useCallback, useRef, useEffect } from 'react';

interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number; // seconds
  remainingTime: number; // seconds
}

/**
 * Hook for managing rate limit state with countdown timer
 */
export function useRateLimitHandler() {
  const [state, setState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    remainingTime: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleRateLimit = useCallback((retryAfterSeconds: number = 60) => {
    setState({
      isRateLimited: true,
      retryAfter: retryAfterSeconds,
      remainingTime: retryAfterSeconds,
    });

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const newRemaining = prev.remainingTime - 1;

        if (newRemaining <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return {
            isRateLimited: false,
            retryAfter: 0,
            remainingTime: 0,
          };
        }

        return {
          ...prev,
          remainingTime: newRemaining,
        };
      });
    }, 1000);
  }, []);

  const clearRateLimit = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState({
      isRateLimited: false,
      retryAfter: 0,
      remainingTime: 0,
    });
  }, []);

  return {
    ...state,
    handleRateLimit,
    clearRateLimit,
  };
}

/**
 * Format remaining time as MM:SS
 */
export function formatRemainingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
