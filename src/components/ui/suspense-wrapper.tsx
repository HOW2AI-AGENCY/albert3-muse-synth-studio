/**
 * Suspense Wrapper Component
 * Phase 1, Week 4: Loading States & Skeletons
 * 
 * Wraps components with React Suspense and custom fallback
 */

import { Suspense, ReactNode } from 'react';
import { LoadingState } from './loading-state';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingMessage?: string;
}

export function SuspenseWrapper({ 
  children, 
  fallback,
  loadingMessage 
}: SuspenseWrapperProps) {
  return (
    <Suspense 
      fallback={fallback || <LoadingState message={loadingMessage} />}
    >
      {children}
    </Suspense>
  );
}

SuspenseWrapper.displayName = 'SuspenseWrapper';
