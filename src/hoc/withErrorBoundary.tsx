import React, { ComponentType, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

interface ErrorBoundaryOptions {
  fallback?: ReactNode;
  FallbackComponent?: React.ComponentType<{ error?: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: ErrorBoundaryOptions
) {
  const { fallback, FallbackComponent, onError } = options || {};

  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        {FallbackComponent ? (
          <FallbackComponent error={undefined} /> // Pass error prop if needed
        ) : (
          <WrappedComponent {...props} />
        )}
      </ErrorBoundary>
    );
  };
}
