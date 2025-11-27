/**
 * Player Error Boundary
 *
 * ✅ MOBILE FIX #8 (v2.1.0):
 * - Изолированный Error Boundary для аудиоплеера
 * - Предотвращает краш всего приложения при ошибке плеера
 * - Показывает локальное сообщение об ошибке вместо fullscreen
 *
 * ПРОБЛЕМА (до исправления):
 * - Ошибки плеера перехватывались GlobalErrorBoundary
 * - Показывался fullscreen error на всё приложение
 * - Музыка продолжала играть, но UI был недоступен
 *
 * РЕШЕНИЕ:
 * - Создан специальный ErrorBoundary для плеера
 * - Ошибки плеера обрабатываются локально
 * - UI приложения остается рабочим при ошибке плеера
 *
 * @version 2.1.0
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PlayerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку плеера
    logger.error(
      'Player Error Boundary caught an error',
      error,
      'PlayerErrorBoundary',
      {
        componentStack: errorInfo.componentStack,
        errorMessage: error.message,
        errorStack: error.stack,
      }
    );

    // Отправляем в Sentry только в production
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            component: 'AudioPlayer',
          },
        });
      });
    }

    // Вызываем пользовательский обработчик
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });

    // Сбрасываем состояние плеера
    try {
      import('@/stores/audioPlayerStore').then(({ useAudioPlayerStore }) => {
        const store = useAudioPlayerStore.getState();
        store.clearCurrentTrack();
      });
    } catch (err) {
      logger.error('Failed to reset player state', err as Error, 'PlayerErrorBoundary');
    }
  };

  render() {
    if (this.state.hasError) {
      // Показываем компактное сообщение об ошибке вместо fullscreen
      return (
        <div
          className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in-fast"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-destructive/20 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Ошибка плеера</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {this.state.error?.message || 'Не удалось инициализировать аудиоплеер'}
                </p>

                {/* Error details in dev mode */}
                {import.meta.env.DEV && this.state.error?.stack && (
                  <pre className="text-[10px] bg-background/50 p-2 rounded mb-3 overflow-x-auto max-h-24">
                    {this.state.error.stack}
                  </pre>
                )}

                <Button
                  onClick={this.handleReset}
                  size="sm"
                  variant="default"
                  className="w-full"
                >
                  <RefreshCcw className="mr-2 h-3 w-3" />
                  Перезапустить плеер
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

PlayerErrorBoundary.displayName = 'PlayerErrorBoundary';
