import React, { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    resizeTimeout?: ReturnType<typeof setTimeout>;
  }
}

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
  enableSafeArea?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centerContent?: boolean;
}

interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4k';
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  pixelRatio: number;
}

/**
 * 🎯 ResponsiveLayout - Адаптивный компонент макета с mobile-first подходом
 * 
 * Особенности:
 * - Mobile-first дизайн с поддержкой всех разрешений от 320px до 4K
 * - Автоматическое определение устройства и ориентации
 * - Поддержка безопасных зон для мобильных устройств
 * - Оптимизация для высоких DPI экранов
 * - Адаптивные контейнеры и отступы
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className,
  enableSafeArea = true,
  maxWidth = 'full',
  padding = 'md',
  centerContent = false,
}) => {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'lg',
    orientation: 'landscape',
    isTouch: false,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  // Определение текущего брейкпоинта
  const getBreakpoint = (width: number): ViewportInfo['breakpoint'] => {
    if (width >= 2560) return '4k';
    if (width >= 1920) return '3xl';
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  };

  // Определение ориентации
  const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
    return width > height ? 'landscape' : 'portrait';
  };

  // Определение поддержки touch
  const getTouchSupport = (): boolean => {
    return typeof window !== 'undefined' && 
           ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  };

  // Обновление информации о viewport
  const updateViewport = () => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setViewport({
      width,
      height,
      breakpoint: getBreakpoint(width),
      orientation: getOrientation(width, height),
      isTouch: getTouchSupport(),
      pixelRatio: window.devicePixelRatio,
    });
  };

  useEffect(() => {
    updateViewport();

    const handleResize = () => {
      // Дебаунс для оптимизации производительности
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
      window.resizeTimeout = setTimeout(updateViewport, 100);
    };

    const handleOrientationChange = () => {
      // Задержка для корректного определения размеров после поворота
      setTimeout(updateViewport, 200);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
    };
  }, []);

  // Классы для максимальной ширины
  const maxWidthClasses = {
    xs: 'max-w-container-xs',
    sm: 'max-w-container-sm',
    md: 'max-w-container-md',
    lg: 'max-w-container-lg',
    xl: 'max-w-container-xl',
    '2xl': 'max-w-container-2xl',
    '3xl': 'max-w-container-3xl',
    '4xl': 'max-w-container-4xl',
    '5xl': 'max-w-container-5xl',
    '6xl': 'max-w-container-6xl',
    '7xl': 'max-w-container-7xl',
    full: 'max-w-full',
  };

  // Классы для отступов
  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-container py-4',
    lg: 'px-6 py-6 md:px-8 md:py-8',
    xl: 'px-8 py-8 md:px-12 md:py-12',
  };

  return (
    <div
      className={cn(
        // Базовые стили
        'w-full min-h-screen',
        
        // Безопасные зоны для мобильных устройств
        enableSafeArea && 'safe-area',
        
        // Максимальная ширина
        maxWidthClasses[maxWidth],
        
        // Отступы
        paddingClasses[padding],
        
        // Центрирование контента
        centerContent && 'mx-auto',
        
        // Оптимизация для touch устройств
        viewport.isTouch && 'touch-manipulation',
        
        // Адаптивные стили для разных брейкпоинтов
        {
          // Мобильные устройства (320px - 767px)
          'text-sm leading-relaxed': viewport.breakpoint === 'xs',
          
          // Планшеты (768px - 1023px)
          'text-base leading-normal': viewport.breakpoint === 'md',
          
          // Десктоп (1024px+)
          'text-lg leading-snug': viewport.breakpoint === 'lg' || viewport.breakpoint === 'xl',
          
          // Большие экраны (1920px+)
          'text-xl leading-tight': viewport.breakpoint === '3xl' || viewport.breakpoint === '4k',
        },
        
        className
      )}
      data-viewport-width={viewport.width}
      data-viewport-height={viewport.height}
      data-breakpoint={viewport.breakpoint}
      data-orientation={viewport.orientation}
      data-touch={viewport.isTouch}
      data-pixel-ratio={viewport.pixelRatio}
    >
      {children}
    </div>
  );
};

/**
 * 📱 MobileContainer - Специализированный контейнер для мобильных устройств
 */
interface MobileContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  scrollable?: boolean;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  className,
  fullHeight = false,
  scrollable = true,
}) => {
  return (
    <div
      className={cn(
        // Базовые стили для мобильных
        'w-full',
        fullHeight && 'h-screen',
        
        // Прокрутка
        scrollable && 'overflow-y-auto hide-scrollbar',
        
        // Оптимизация для мобильных
        '-webkit-overflow-scrolling-touch',
        'overscroll-behavior-y-contain',
        
        // Безопасные зоны
        'safe-area',
        
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * 🖥️ DesktopContainer - Специализированный контейнер для десктопа
 */
interface DesktopContainerProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
}

export const DesktopContainer: React.FC<DesktopContainerProps> = ({
  children,
  className,
  sidebar,
  sidebarWidth = 'md',
}) => {
  const sidebarWidths = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
  };

  return (
    <div className={cn('flex h-screen', className)}>
      {sidebar && (
        <aside className={cn(
          'hidden lg:flex flex-col',
          sidebarWidths[sidebarWidth],
          'border-r border-outline-variant',
          'bg-surface'
        )}>
          {sidebar}
        </aside>
      )}
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

/**
 * 🔄 AdaptiveGrid - Адаптивная сетка с автоматическим изменением колонок
 */
interface AdaptiveGridProps {
  children: ReactNode;
  className?: string;
  minItemWidth?: number;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
}

export const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  children,
  className,
  minItemWidth = 280,
  gap = 'md',
  autoFit = true,
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div
      className={cn(
        'grid w-full',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: autoFit 
          ? `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`
          : `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * 📐 FlexContainer - Гибкий контейнер с адаптивным направлением
 */
interface FlexContainerProps {
  children: ReactNode;
  className?: string;
  direction?: 'row' | 'column' | 'responsive';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FlexContainer: React.FC<FlexContainerProps> = ({
  children,
  className,
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = false,
  gap = 'md',
}) => {
  const directionClasses = {
    row: 'flex-row',
    column: 'flex-col',
    responsive: 'flex-col md:flex-row',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

// Хук для получения информации о viewport
export const useViewport = () => {
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
        breakpoint: width >= 2560 ? '4k' : 
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
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
      window.resizeTimeout = setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(updateViewport, 200));

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
    };
  }, []);

  return viewport;
};

export default ResponsiveLayout;