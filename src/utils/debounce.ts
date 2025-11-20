/**
 * Debounce утилита для оптимизации частых вызовов
 * Используется в audio player для seekTo и setVolume
 */

export function debounce<A extends unknown[], R>(
  func: (...args: A) => R,
  wait: number
): (...args: A) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: A) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<A extends unknown[], R>(
  func: (...args: A) => R,
  limit: number
): (...args: A) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: A) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
