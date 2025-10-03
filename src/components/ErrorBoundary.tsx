import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Обновляем состояние, чтобы показать fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку
    logError('ErrorBoundary caught an error:', error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    // Вызываем пользовательский обработчик ошибок, если он предоставлен
    this.props.onError?.(error, errorInfo);

    // Сохраняем информацию об ошибке в состоянии
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Если предоставлен пользовательский fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Стандартный fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Что-то пошло не так</CardTitle>
              <CardDescription>
                Произошла неожиданная ошибка. Мы уже работаем над её исправлением.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium text-destructive mb-2">
                    Ошибка разработки:
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Стек компонентов
                      </summary>
                      <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Попробовать снова
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  На главную
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC для оборачивания компонентов в Error Boundary
interface ErrorBoundaryOptions {
  fallback?: ReactNode;
  FallbackComponent?: React.ComponentType<{ error?: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: ErrorBoundaryOptions
) => {
  const { fallback, FallbackComponent, onError } = options || {};
  
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Специализированный Error Boundary для асинхронных операций
export const AsyncErrorBoundary: React.FC<Props> = ({ children, ...props }) => {
  return (
    <ErrorBoundary
      {...props}
      onError={(error, errorInfo) => {
        // Дополнительная обработка для асинхронных ошибок
        if (error.name === 'ChunkLoadError') {
          // Ошибка загрузки чанка - предлагаем перезагрузить страницу
          window.location.reload();
          return;
        }
        
        props.onError?.(error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};