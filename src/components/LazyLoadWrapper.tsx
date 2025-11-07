import React, { Suspense, memo, useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { createLazyComponent } from '@/utils/lazyComponentFactory';

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
    return { default: module.TrackCard };
  },
  <div className="animate-pulse bg-card/50 rounded-xl h-64" />,
  <div className="text-center p-4 text-muted-foreground">
    Ошибка загрузки карточки трека
  </div>,
  'TrackCard'
);