# 🛡️ Error Handling Architecture

> **Последнее обновление**: 2025-10-31 (Sprint 31 Week 1)  
> **Статус**: ✅ Унифицировано

## 🎯 Стратегия обработки ошибок

Albert3 использует **многоуровневую систему обработки ошибок** для максимальной надёжности и user experience.

```
┌─────────────────────────────────────────────┐
│  User Interface (Graceful degradation)      │
├─────────────────────────────────────────────┤
│  GlobalErrorBoundary (Top-level catch-all)  │
├─────────────────────────────────────────────┤
│  ErrorBoundary (Component-level recovery)   │
├─────────────────────────────────────────────┤
│  Try-Catch Blocks (Function-level)          │
├─────────────────────────────────────────────┤
│  Error Service (Logging & Reporting)        │
└─────────────────────────────────────────────┘
```

---

## 🏗️ Компоненты системы

### 1. GlobalErrorBoundary (Top-Level)

**Расположение**: `src/components/errors/GlobalErrorBoundary.tsx`

**Назначение**: Перехват критических ошибок на уровне всего приложения

```tsx
// src/App.tsx
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary';

function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
        <Routes />
      </Router>
    </GlobalErrorBoundary>
  );
}
```

**Особенности**:
- ✅ Перехватывает **все** необработанные ошибки
- ✅ Логирует в Sentry (production)
- ✅ Показывает user-friendly fallback UI
- ✅ Кнопки "Try Again" и "Go Home"

**Fallback UI**:
```tsx
<Card className="w-full max-w-md mx-auto mt-8">
  <CardHeader>
    <AlertTriangle className="h-12 w-12 text-destructive" />
    <CardTitle>Что-то пошло не так</CardTitle>
    <CardDescription>
      Произошла критическая ошибка. Мы уже работаем над её исправлением.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button onClick={handleReset}>Попробовать снова</Button>
    <Button onClick={handleGoHome} variant="outline">
      На главную
    </Button>
  </CardContent>
</Card>
```

---

### 2. ErrorBoundary (Component-Level)

**Расположение**: `src/components/ErrorBoundary.tsx`

**Назначение**: Изоляция ошибок на уровне отдельных компонентов

```tsx
// Обернуть критический компонент
<ErrorBoundary fallback={<CustomFallback />}>
  <CriticalComponent />
</ErrorBoundary>

// Или использовать HOC
import { withErrorBoundary } from '@/hoc/withErrorBoundary';

const SafeComponent = withErrorBoundary(CriticalComponent, {
  fallback: <LoadingSpinner />,
  onError: (error, errorInfo) => {
    analytics.track('component_error', { error, errorInfo });
  }
});
```

**Особенности**:
- ✅ Локализованный error recovery
- ✅ Кастомный fallback UI
- ✅ Callback `onError` для аналитики
- ✅ Автоматический retry механизм

**Use Cases**:
- Тяжелые компоненты (audio player, visualizations)
- Third-party integrations
- Динамически загружаемые модули

---

### 3. AsyncErrorBoundary (Async Operations)

**Расположение**: `src/components/ErrorBoundary.tsx`

**Назначение**: Специализированная обработка асинхронных ошибок

```tsx
<AsyncErrorBoundary>
  <MusicGenerator />
  <TrackUploader />
</AsyncErrorBoundary>
```

**Особенности**:
- ✅ Обработка `ChunkLoadError` (lazy loading failures)
- ✅ Автоматический reload при ошибках загрузки модулей
- ✅ Network error detection
- ✅ Retry logic для временных сбоев

---

## 🔄 Error Recovery Strategies

### 1. Automatic Retry

```typescript
// src/utils/errorRecovery.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = 'exponential' } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = backoff === 'exponential' 
        ? delayMs * Math.pow(2, attempt)
        : delayMs * (attempt + 1);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unreachable');
}

// Использование
const data = await withRetry(
  () => supabase.from('tracks').select('*'),
  { maxRetries: 3, delayMs: 500, backoff: 'exponential' }
);
```

### 2. Graceful Degradation

```tsx
// Компонент с fallback'ами
function TrackCard({ track }: TrackCardProps) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Card>
      {imageError ? (
        // Fallback: Placeholder вместо изображения
        <div className="aspect-square bg-muted" />
      ) : (
        <img 
          src={track.cover_url} 
          onError={() => setImageError(true)}
          alt={track.title}
        />
      )}
      
      <CardContent>
        <h3>{track.title}</h3>
        {track.audio_url ? (
          <AudioPlayer src={track.audio_url} />
        ) : (
          // Fallback: Сообщение о недоступности
          <p className="text-muted-foreground">
            Аудио временно недоступно
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Error State Management

```typescript
// src/hooks/useErrorState.ts
export function useErrorState() {
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const handleError = useCallback((err: Error) => {
    setError(err);
    logger.error('Error caught', err);
  }, []);
  
  const retry = useCallback(async (fn: () => Promise<void>) => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await fn();
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError]);
  
  const clear = useCallback(() => {
    setError(null);
  }, []);
  
  return { error, isRetrying, handleError, retry, clear };
}

// Использование
function Component() {
  const { error, retry, clear } = useErrorState();
  
  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => retry(fetchData)}
        onDismiss={clear}
      />
    );
  }
  
  return <Content />;
}
```

---

## 📊 Error Logging & Monitoring

### Sentry Integration

```typescript
// src/utils/sentry.ts
import * as Sentry from '@sentry/react';

export const initSentry = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      
      // Custom error filtering
      beforeSend(event, hint) {
        // Игнорировать известные не-критичные ошибки
        if (hint.originalException?.message?.includes('ChunkLoadError')) {
          return null;
        }
        
        return event;
      },
      
      // Breadcrumbs для отладки
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
  }
};

// Кастомный error reporting
export const reportError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context?.component as string,
    },
  });
};
```

### Custom Logger

```typescript
// src/utils/logger.ts
export const logger = {
  error: (message: string, error: Error, context?: string, payload?: Record<string, unknown>) => {
    console.error(`[${context}] ${message}`, error, payload);
    
    // Отправка в Sentry (production)
    if (import.meta.env.PROD) {
      reportError(error, { message, context, ...payload });
    }
    
    // Отправка в analytics
    analytics.track('error_logged', {
      message,
      errorName: error.name,
      errorMessage: error.message,
      context,
      timestamp: Date.now(),
    });
  },
  
  warn: (message: string, context?: string, payload?: Record<string, unknown>) => {
    console.warn(`[${context}] ${message}`, payload);
  },
  
  info: (message: string, context?: string, payload?: Record<string, unknown>) => {
    console.info(`[${context}] ${message}`, payload);
  },
};
```

---

## 🎨 User-Facing Error Messages

### Toast Notifications

```typescript
// Хорошие практики для error toasts
import { useToast } from '@/hooks/use-toast';

function Component() {
  const { toast } = useToast();
  
  const handleError = (error: Error) => {
    // ✅ Хорошо: Понятное сообщение + действие
    toast({
      title: '❌ Не удалось загрузить трек',
      description: 'Проверьте подключение к интернету и попробуйте снова.',
      variant: 'destructive',
      action: (
        <Button onClick={retry}>
          Повторить
        </Button>
      ),
    });
    
    // ❌ Плохо: Технические детали для пользователя
    toast({
      title: 'Error',
      description: error.message, // "Failed to fetch at line 42..."
      variant: 'destructive',
    });
  };
}
```

### Error Categories

```typescript
// src/types/errors.ts
export const ERROR_MESSAGES = {
  NETWORK: {
    title: '🌐 Проблема с подключением',
    description: 'Нет связи с сервером. Проверьте интернет.',
  },
  AUTHENTICATION: {
    title: '🔐 Требуется авторизация',
    description: 'Пожалуйста, войдите в систему.',
  },
  GENERATION: {
    title: '🎵 Ошибка генерации',
    description: 'Не удалось создать трек. Попробуйте снова.',
  },
  RATE_LIMIT: {
    title: '⏱️ Превышен лимит',
    description: 'Слишком много запросов. Подождите немного.',
  },
  UNKNOWN: {
    title: '❓ Что-то пошло не так',
    description: 'Попробуйте обновить страницу.',
  },
} as const;
```

---

## 🧪 Testing Error Handlers

### Unit Tests

```typescript
// src/components/__tests__/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
  
  it('renders fallback on error', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
  });
  
  it('calls onError callback', () => {
    const onError = vi.fn();
    const ThrowError = () => { throw new Error('Test'); };
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalled();
  });
});
```

---

## 📋 Best Practices Checklist

### Development
- [ ] Обернуть критические компоненты в ErrorBoundary
- [ ] Добавить fallback UI для всех async операций
- [ ] Использовать try-catch для API calls
- [ ] Логировать ошибки с контекстом
- [ ] Тестировать error scenarios

### Production
- [ ] Настроен Sentry для error tracking
- [ ] User-friendly error messages (не технические)
- [ ] Retry механизмы для network errors
- [ ] Graceful degradation для optional features
- [ ] Monitoring dashboard для error metrics

### User Experience
- [ ] Понятные сообщения об ошибках
- [ ] Кнопки "Retry" для recoverable errors
- [ ] Не показывать stack traces пользователям
- [ ] Предлагать альтернативные действия
- [ ] Сохранять user input при ошибках

---

## 🔗 Дополнительные ресурсы

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Handling Best Practices](https://github.com/goldbergyoni/nodebestpractices#-6-error-handling-practices)

---

*Последнее обновление: 2025-10-31*  
*Версия: 1.0.0*  
*Автор: @tech-lead*
