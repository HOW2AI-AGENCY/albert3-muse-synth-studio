/**
 * Утилиты для оптимизации производительности UI компонентов
 */

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';

/**
 * Хук для дебаунса функций
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Хук для троттлинга функций
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - (now - lastCallRef.current));
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Хук для оптимизированного Intersection Observer
 */
export const useIntersectionObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = { threshold: 0.1 }
) => {
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => callback(entry),
      options
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);

  return elementRef;
};

/**
 * Хук для виртуализации списков
 */
export const useVirtualList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      offsetY: (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    containerProps: {
      style: { height: containerHeight, overflow: 'auto' },
      onScroll: handleScroll
    }
  };
};

/**
 * Хук для ленивой загрузки изображений
 */
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const imageRef = useIntersectionObserver(
    (entry) => {
      if (entry.isIntersecting && !isLoaded && !isError) {
        const img = new Image();
        img.onload = () => {
          setImageSrc(src);
          setIsLoaded(true);
        };
        img.onerror = () => {
          setIsError(true);
        };
        img.src = src;
      }
    },
    { threshold: 0.1 }
  );

  return {
    imageRef,
    imageSrc,
    isLoaded,
    isError
  };
};

/**
 * Хук для оптимизации анимаций
 */
export const useOptimizedAnimation = (
  animationCallback: () => void,
  dependencies: any[] = []
) => {
  const rafRef = useRef<number>();

  const animate = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(animationCallback);
  }, [animationCallback]);

  useEffect(() => {
    animate();
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, dependencies);

  return animate;
};

/**
 * Хук для мемоизации сложных вычислений
 */
export const useExpensiveComputation = <T>(
  computeFn: () => T,
  dependencies: any[]
): T => {
  return useMemo(computeFn, dependencies);
};

/**
 * Утилита для проверки поддержки браузером определенных функций
 */
export const browserSupports = {
  intersectionObserver: typeof IntersectionObserver !== 'undefined',
  webGL: (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  })(),
  webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
  requestIdleCallback: typeof requestIdleCallback !== 'undefined'
};

/**
 * Утилита для выполнения задач в idle time
 */
export const scheduleIdleTask = (callback: () => void, timeout: number = 5000) => {
  if (browserSupports.requestIdleCallback) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
};

/**
 * Хук для отслеживания производительности компонента
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartRef = useRef<number>();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
    renderCountRef.current += 1;
  });

  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;
      
      if (renderTime > 16) { // Больше одного кадра (60fps)
        console.warn(
          `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`
        );
      }
    }
  });

  return {
    renderCount: renderCountRef.current
  };
};