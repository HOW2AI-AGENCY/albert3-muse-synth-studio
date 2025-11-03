/**
 * Generic interval hook with automatic cleanup
 * 
 * @example
 * ```tsx
 * // Poll every 5 seconds
 * useInterval(() => {
 *   refetchData();
 * }, 5000);
 * 
 * // Conditional polling
 * useInterval(() => {
 *   refetchData();
 * }, isPolling ? 5000 : null);
 * ```
 */

import { useEffect, useRef } from 'react';

/**
 * Executes callback at specified interval
 * Pass null as delay to pause the interval
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up interval
  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}
