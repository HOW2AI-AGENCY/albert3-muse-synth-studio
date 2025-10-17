# 🚨 Sentry Integration Guide

## 📋 Обзор

Sentry интегрирован в Albert3 Muse Synth Studio для мониторинга ошибок и производительности в production. Этот документ описывает настройку, использование и лучшие практики.

---

## 🎯 Возможности

### Frontend
- ✅ Автоматический захват JavaScript ошибок
- ✅ Unhandled Promise rejections
- ✅ React Error Boundaries
- ✅ Performance monitoring (Web Vitals)
- ✅ Breadcrumbs для трассировки событий
- ✅ User context (auth state)
- ✅ Маскирование чувствительных данных

### Edge Functions
- ✅ Захват необработанных исключений
- ✅ Performance transactions
- ✅ Structured logging
- ✅ Request context (headers, method, URL)
- ✅ Error tagging по функциям

---

## 🔧 Настройка

### 1. Frontend Configuration

#### Переменные окружения

Добавьте в `.env.production`:

```bash
# Sentry DSN (получите из Sentry dashboard)
VITE_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456

# Окружение (production/staging/development)
VITE_SENTRY_ENVIRONMENT=production

# Release версия (автоматически из package.json)
VITE_SENTRY_RELEASE=2.7.2

# Sampling rate для Performance monitoring (0.0 - 1.0)
# 0.1 = 10% транзакций отправляются в Sentry
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# Включить Sentry в development (по умолчанию false)
VITE_SENTRY_ENABLE_IN_DEV=false
```

#### Инициализация (уже настроена)

В `src/main.tsx`:

```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

---

### 2. Edge Functions Configuration

#### Переменные окружения

Добавьте через Supabase Dashboard → Settings → Edge Functions:

```bash
# Sentry DSN для Edge Functions
SENTRY_EDGE_DSN=https://xxxxx@o123456.ingest.sentry.io/123456

# Окружение
SENTRY_ENVIRONMENT=production

# Release версия
SENTRY_RELEASE=2.7.2

# Sampling rate для транзакций
SENTRY_TRACES_SAMPLE_RATE=0.0

# Debug режим (только для разработки)
SENTRY_DEBUG=false
```

#### Использование в Edge Functions

```typescript
import { withSentry } from '../_shared/sentry.ts';
import { logger } from '../_shared/logger.ts';

const handler = async (req: Request): Promise<Response> => {
  logger.info('Function invoked', { method: req.method });
  
  // Ваш код здесь
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// Обернуть handler в Sentry wrapper
export default withSentry(handler, {
  transaction: 'generate-music',
  tags: { provider: 'suno' },
});
```

---

## 📊 Dashboard & Alerts

### Sentry Dashboard

**URL**: https://sentry.io/organizations/albert3-studio/issues/

#### Основные метрики:
1. **Error Rate**: Процент запросов с ошибками
2. **Affected Users**: Количество пользователей, столкнувшихся с ошибками
3. **APDEX Score**: Оценка удовлетворенности пользователей
4. **Transaction Duration**: Время выполнения запросов

#### Фильтры:
- `environment:production` - только production
- `transaction:generate-music` - конкретная функция
- `level:error` - только ошибки
- `user.id:<uuid>` - ошибки конкретного пользователя

---

### Настройка алертов

#### 1. Критические ошибки (Slack)

**Path**: Alerts → Alert Rules → New Alert Rule

```yaml
Condition:
  - Event type: Error
  - Environment: production
  - Level: error
  - Event count > 10 in 5 minutes

Actions:
  - Send Slack notification to #alerts-production
  - Assign to @tech-lead
```

**Slack Integration**:
1. Settings → Integrations → Slack
2. Add to Workspace
3. Select channel: `#alerts-production`
4. Test notification

#### 2. Performance degradation (Email)

```yaml
Condition:
  - Transaction duration p95 > 2000ms
  - Over last 10 minutes

Actions:
  - Send email to qa-team@albert3.app
  - Create GitHub Issue
```

#### 3. Daily Digest

```yaml
Schedule: Every day at 09:00 UTC

Include:
  - Total errors
  - New issues
  - Regression issues
  - Top 10 issues by volume

Recipients:
  - qa-team@albert3.app
  - tech-lead@albert3.app
```

---

## 🔍 Отладка в Sentry

### 1. Анализ ошибки

При клике на issue в Sentry:

**Breadcrumbs** (хлебные крошки):
```
1. [info] User navigated to /workspace/generate
2. [info] Form submitted with prompt: "Jazz music"
3. [warn] API response slow: 1200ms
4. [error] Generation failed: Network timeout
```

**Stack Trace**:
```typescript
Error: Network timeout
  at generateMusic (MusicGenerator.tsx:45)
  at handleSubmit (MusicGenerator.tsx:78)
  at onClick (Button.tsx:12)
```

**Context**:
- User ID: `877dad52-4e02-4883-b179-38732ef95331`
- Browser: Chrome 120.0.0 (Linux)
- URL: `https://albert3.app/workspace/generate`
- Environment: production

---

### 2. Session Replay

Просмотр записи сессии пользователя:

1. Открыть issue
2. Перейти на вкладку "Replays"
3. Воспроизвести сессию (последние 30 секунд до ошибки)

**Что видно**:
- Клики мыши
- Ввод текста (masked)
- Навигация
- Network requests (timing)

---

### 3. Performance Monitoring

**Transaction**: `/workspace/generate`

Метрики:
- **Duration p50**: 450ms
- **Duration p95**: 1200ms
- **Duration p99**: 2500ms
- **Throughput**: 120 req/min

**Flamegraph**:
```
generateMusic (1200ms)
├─ improvePrompt (300ms)
├─ supabase.invoke (800ms)
│  └─ generate-suno (750ms)
└─ setState (100ms)
```

---

## 📈 Лучшие практики

### Frontend

#### 1. Использование logger вместо console

```typescript
// ❌ Плохо
console.error('Failed to generate music', error);

// ✅ Хорошо
import { logError } from '@/utils/logger';
logError('Failed to generate music', error, 'MusicGenerator', {
  prompt: musicPrompt,
  userId: user?.id,
});
```

#### 2. Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <MusicGenerator />
</ErrorBoundary>
```

#### 3. Добавление контекста

```typescript
import * as Sentry from '@sentry/react';

// Перед критической операцией
Sentry.setContext('music_generation', {
  prompt: musicPrompt,
  provider: 'suno',
  model: 'chirp-v3-5',
});

Sentry.setUser({
  id: user.id,
  email: user.email,
  subscription: user.subscription_tier,
});
```

---

### Edge Functions

#### 1. Структурированное логирование

```typescript
import { logger } from '../_shared/logger.ts';

// ✅ Хорошо структурированные логи
logger.info('Generation started', {
  operation: 'generate-music',
  userId: userId,
  provider: 'suno',
  model: 'chirp-v3-5',
});

logger.error('Generation failed', {
  operation: 'generate-music',
  error: error.message,
  duration: Date.now() - startTime,
});
```

#### 2. Тегирование ошибок

```typescript
import { sentry } from '../_shared/sentry.ts';

try {
  // Ваш код
} catch (error) {
  await sentry.captureException(error, {
    transaction: 'generate-music',
    tags: {
      provider: 'suno',
      model: 'chirp-v3-5',
      user_tier: 'premium',
    },
  });
  throw error;
}
```

---

## 🚨 Типичные проблемы

### 1. Sentry не отправляет события

**Проблема**: События не появляются в Sentry dashboard

**Решение**:
```bash
# Проверьте переменные окружения
echo $VITE_SENTRY_DSN

# Проверьте консоль браузера
# Должно быть: [Sentry] Initialized

# Проверьте Network tab
# Должны быть запросы к sentry.io/api/
```

---

### 2. Слишком много событий

**Проблема**: Превышен лимит events в месяц

**Решение**:
```typescript
// Увеличить sample rate только для важных транзакций
Sentry.init({
  tracesSampleRate: 0.1, // 10% вместо 100%
  
  // Игнорировать менее важные ошибки
  beforeSend(event, hint) {
    if (hint.originalException?.message?.includes('NetworkError')) {
      return null; // Не отправлять в Sentry
    }
    return event;
  },
});
```

---

### 3. Чувствительные данные в логах

**Проблема**: Токены, пароли попадают в Sentry

**Решение**: Logger автоматически маскирует данные

```typescript
// Автоматическая маскировка
logError('API failed', error, 'API', {
  token: 'sk_test_123456', // → "sk_***56"
  password: 'secret123',    // → "sec***23"
  apiKey: 'key_abcdef',     // → "key***ef"
});
```

---

## 📞 Контакты

**Экстренные ситуации**:
- Slack: `#alerts-production`
- Email: tech-lead@albert3.app

**Документация**:
- Sentry Docs: https://docs.sentry.io/
- Project README: `docs/README.md`

**Ответственные**:
- Tech Lead: @tech-lead
- QA Engineer: @qa-engineer
- DevOps: @devops-engineer

---

*Последнее обновление: 17 октября 2025*  
*Версия: 2.7.2*
