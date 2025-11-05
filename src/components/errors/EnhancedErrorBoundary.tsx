/**
 * Enhanced Error Boundary with Sentry Integration
 * Provides user-friendly fallback UI and automatic error reporting
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to our logger
    logger.error('React Error Boundary caught error', error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    });

    // Capture with Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    this.setState({
      errorInfo,
      eventId: eventId || null,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleReportFeedback = (): void => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    We've encountered an unexpected error. Don't worry, we've been notified.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono text-muted-foreground">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} variant="default" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button onClick={this.handleReload} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>

                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>

                {this.state.eventId && (
                  <Button
                    onClick={this.handleReportFeedback}
                    variant="ghost"
                    className="w-full"
                  >
                    Report Feedback
                  </Button>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact support.</p>
                {this.state.eventId && (
                  <p className="mt-1">
                    Reference ID: <code className="text-xs">{this.state.eventId}</code>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Перенесено: HOC withErrorBoundary находится в файле '@/hoc/withErrorBoundary'
