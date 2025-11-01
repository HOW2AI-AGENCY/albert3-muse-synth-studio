/**
 * Error Boundary Component
 * Phase 1, Week 2: Stability & Error Handling
 * 
 * Catches React errors and provides fallback UI
 * - Prevents entire app crashes
 * - Logs errors to Sentry
 * - Provides recovery options
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    logger.error('ErrorBoundary caught error', error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Send to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Custom error handler
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetError);
        }
        return this.props.fallback;
      }

      // Default fallback
      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          reset={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-6 space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
        
        <p className="text-sm text-muted-foreground">
          Произошла ошибка при отображении этого компонента. Мы уже получили уведомление об этом.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Техническая информация
            </summary>
            <pre className="mt-2 p-4 text-xs bg-muted rounded-md overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Попробовать снова
          </button>
          
          <button
            onClick={() => window.location.href = '/workspace/dashboard'}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
