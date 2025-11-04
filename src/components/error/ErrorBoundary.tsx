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
import { DefaultErrorFallback } from './DefaultErrorFallback';

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
