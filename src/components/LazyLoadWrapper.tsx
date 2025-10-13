import React, { Suspense, lazy, ComponentType, memo, useMemo } from 'react';
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
 * Мемоизирована для предотвращения лишних ререндеров
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = memo(({
  children,
  fallback,
  errorFallback,
  className
}) => {
  const defaultFallback = useMemo(() => 
    fallback || <Skeleton className={className} />, 
    [fallback, className]
  );
  
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

LazyLoadWrapper.displayName = 'LazyLoadWrapper';

/**
 * HOC для создания ленивых компонентов с оптимизацией
 * Кэширует созданные компоненты для повторного использования
 */
type LazyImport<P extends object> = () => Promise<{ default: ComponentType<P> }>;

const componentCache = new Map<string, ComponentType<unknown>>();

export const createLazyComponent = <P extends object>(
  importFn: LazyImport<P>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode,
  cacheKey?: string
) => {
  // Используем кэш для предотвращения создания дублирующих компонентов
  if (cacheKey && componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey) as ComponentType<P>;
  }

  const LazyComponent = lazy(importFn);

  const MemoizedLazyComponent = memo(React.forwardRef<unknown, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
      {/* Attach ref to a container to avoid passing it to non-forwardRef children */}
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <LazyComponent {...props} />
      </div>
    </LazyLoadWrapper>
  )));

  MemoizedLazyComponent.displayName = `LazyComponent(${cacheKey || 'Anonymous'})`;

  if (cacheKey) {
    componentCache.set(cacheKey, MemoizedLazyComponent as ComponentType<unknown>);
  }

  return MemoizedLazyComponent;
};

/**
 * Хук для предзагрузки компонентов с кэшированием
 */
const preloadCache = new Set<string>();

export const usePreloadComponent = <P extends object>(
  importFn: LazyImport<P>,
  cacheKey?: string
) => {
  const preload = React.useCallback(() => {
    if (cacheKey && preloadCache.has(cacheKey)) {
      return; // Уже предзагружен
    }
    
    importFn().then(() => {
      if (cacheKey) {
        preloadCache.add(cacheKey);
      }
    });
  }, [importFn, cacheKey]);

  return preload;
};

// Предопределенные ленивые компоненты для основных частей приложения

export const LazyGlobalAudioPlayer = createLazyComponent(
  () => import('./player/GlobalAudioPlayer'),
  <div className="animate-pulse bg-card/50 rounded-xl h-20" />,
  <div className="text-center p-4 text-muted-foreground">
    Ошибка загрузки аудиоплеера
  </div>,
  'GlobalAudioPlayer'
);

export const LazyTrackCard = createLazyComponent(
  async () => {
    const module = await import('@/features/tracks/components/TrackCard');
    return { default: module.TrackCard as ComponentType<unknown> };
  },
  <div className="animate-pulse bg-card/50 rounded-xl h-64" />,
  <div className="text-center p-4 text-muted-foreground">
    Ошибка загрузки карточки трека
  </div>,
  'TrackCard'
);