import { useEffect, useState, useRef } from 'react';

interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4k';
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  pixelRatio: number;
}

/**
 * useViewport — хук для отслеживания параметров окна (ширина/высота, брейкпоинт, ориентация, touch, pixelRatio)
 * Вынесен в отдельный файл для соответствия правилу Fast Refresh (экспорт только компонентов из файлов компонентов).
 */
export const useViewport = () => {
  // ✅ FIX [Memory Leak]: Использование useRef вместо глобальной переменной window.resizeTimeout
  // WHY: Глобальная переменная создавала memory leak и race conditions между экземплярами хука
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'lg',
    orientation: 'landscape',
    isTouch: false,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        breakpoint:
          width >= 2560 ? '4k' :
          width >= 1920 ? '3xl' :
          width >= 1536 ? '2xl' :
          width >= 1280 ? 'xl' :
          width >= 1024 ? 'lg' :
          width >= 768 ? 'md' :
          width >= 640 ? 'sm' : 'xs',
        orientation: width > height ? 'landscape' : 'portrait',
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        pixelRatio: window.devicePixelRatio,
      });
    };

    updateViewport();

    const handleResize = () => {
      // ✅ FIX [Memory Leak]: Использование ref вместо window.resizeTimeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateViewport, 100);
    };

    const handleOrientationChange = () => setTimeout(updateViewport, 200);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      // ✅ FIX [Memory Leak]: Очистка timeout через ref при unmount
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return viewport;
};

export default useViewport;