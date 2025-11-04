import React, { lazy, memo, type ComponentType } from 'react';
import { LazyLoadWrapper } from '@/components/LazyLoadWrapper';

export type LazyImport<P extends object> = () => Promise<{ default: ComponentType<P> }>;

const componentCache = new Map<string, ComponentType<unknown>>();

export const createLazyComponent = <P extends object>(
  importFn: LazyImport<P>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode,
  cacheKey?: string
) => {
  if (cacheKey && componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey) as ComponentType<P>;
  }

  const LazyComponent = lazy(importFn);

  const MemoizedLazyComponent = memo(React.forwardRef<unknown, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback} errorFallback={errorFallback}>
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

// Предзагрузочный кэш для предотвращения лишних импортов
const preloadCache = new Set<string>();

export const createPreloader = <P extends object>(
  importFn: LazyImport<P>,
  cacheKey?: string
) => {
  return () => {
    if (cacheKey && preloadCache.has(cacheKey)) {
      return;
    }
    importFn().then(() => {
      if (cacheKey) {
        preloadCache.add(cacheKey);
      }
    });
  };
};