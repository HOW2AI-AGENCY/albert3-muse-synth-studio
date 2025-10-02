import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from './ui/skeleton';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  className?: string;
}

/**
 * Обертка для ленивой загрузки компонентов с обработкой ошибок
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  className
}) => {
  const defaultFallback = fallback || <Skeleton className={className} />;
  
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * HOC для создания ленивых компонентов с оптимизацией
 */
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  
  return React.forwardRef<any, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyLoadWrapper>
  ));
};

/**
 * Хук для предзагрузки компонентов
 */
export const usePreloadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  const preload = React.useCallback(() => {
    importFn();
  }, [importFn]);

  return preload;
};

// Предопределенные ленивые компоненты для основных частей приложения
export const LazyMusicGenerator = createLazyComponent(
  () => import('./MusicGenerator').then(m => ({ default: m.default })),
  <div className="animate-pulse bg-card/50 rounded-xl h-96" />,
  <div className="text-center p-8 text-muted-foreground">
    Ошибка загрузки генератора музыки
  </div>
);

export const LazyGlobalAudioPlayer = createLazyComponent(
  () => import('./player/GlobalAudioPlayer'),
  <div className="animate-pulse bg-card/50 rounded-xl h-20" />,
  <div className="text-center p-4 text-muted-foreground">
    Ошибка загрузки аудиоплеера
  </div>
);

export const LazyTrackCard = createLazyComponent(
  () => import('./TrackCard'),
  <div className="animate-pulse bg-card/50 rounded-xl h-64" />,
  <div className="text-center p-4 text-muted-foreground">
    Ошибка загрузки карточки трека
  </div>
);