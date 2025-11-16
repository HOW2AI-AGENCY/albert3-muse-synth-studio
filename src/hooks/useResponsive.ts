/**
 * useResponsive Hook
 * Phase 5: Adaptive Components
 * 
 * Provides responsive utilities and container query support
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ResponsiveState {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Mobile device detection (width < 768px) */
  isMobile: boolean;
  /** Tablet device detection (768px <= width < 1024px) */
  isTablet: boolean;
  /** Desktop device detection (width >= 1024px) */
  isDesktop: boolean;
  /** Touch device detection */
  isTouch: boolean;
  /** Orientation */
  orientation: 'portrait' | 'landscape';
  /** Device pixel ratio */
  pixelRatio: number;
}

/**
 * Hook для отслеживания responsive состояния приложения
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        orientation: 'landscape',
        pixelRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio: window.devicePixelRatio || 1,
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    setState({
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio: window.devicePixelRatio || 1,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Throttle resize events
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateState);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateState);
    };
  }, [updateState]);

  return state;
}

/**
 * Container Query Hook
 * Отслеживает размер контейнера вместо viewport
 */
export function useContainerQuery(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref]);

  return {
    ...size,
    isSmall: size.width < 480,
    isMedium: size.width >= 480 && size.width < 768,
    isLarge: size.width >= 768,
    isExtraLarge: size.width >= 1024,
  };
}

/**
 * Media Query Hook
 * Более производительная альтернатива для конкретных медиа-запросов
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    // Legacy browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/**
 * Предустановленные медиа-запросы
 */
export const mediaQueries = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  touch: '(hover: none) and (pointer: coarse)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersDarkMode: '(prefers-color-scheme: dark)',
  highDensity: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
} as const;

/**
 * Утилита для условного рендеринга на основе размера экрана
 */
export function useResponsiveComponent<T extends Record<string, React.ReactNode>>(
  components: T
): React.ReactNode {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile && components.mobile) return components.mobile;
  if (isTablet && components.tablet) return components.tablet;
  if (isDesktop && components.desktop) return components.desktop;

  return components.default || null;
}
