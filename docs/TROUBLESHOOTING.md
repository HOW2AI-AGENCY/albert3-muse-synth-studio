# 🔍 Руководство по отладке и логированию

## 📋 Содержание

1. [Централизованное логирование](#централизованное-логирование)
2. [Уровни логирования](#уровни-логирования)
3. [Контекстные поля](#контекстные-поля)
4. [Sentry интеграция](#sentry-интеграция)
5. [Edge Functions логирование](#edge-functions-логирование)
6. [Поиск и анализ логов](#поиск-и-анализ-логов)
7. [Частые проблемы](#частые-проблемы)

---

## 📝 Централизованное логирование

**Albert3 Muse Synth Studio** использует **централизованную систему логирования** для единообразного сбора и анализа событий как на фронтенде, так и на бэкенде (Edge Functions).

### Зачем нужен централизованный logger?

- ✅ **Единый формат логов** — все события имеют одинаковую структуру
- ✅ **Контекстные данные** — автоматическое добавление метаданных (timestamp, userId, trackId)
- ✅ **Sentry интеграция** — критичные ошибки автоматически попадают в Sentry
- ✅ **Безопасность** — автоматическая маскировка чувствительных данных (токены, пароли, API ключи)
- ✅ **Удобный поиск** — структурированные JSON логи легко фильтровать

### Основные принципы

```typescript
// ❌ НЕПРАВИЛЬНО: Прямое использование console.*
console.log('Track generated:', trackId);
console.error('Generation failed:', error);

// ✅ ПРАВИЛЬНО: Использование logger
import { logger } from '@/utils/logger';

logger.info('Track generated', 'MusicGenerator', { trackId, duration: 120 });
logger.error('Generation failed', error, 'MusicGenerator', { trackId, prompt });
```

---

## 🎯 Уровни логирования

### 1. **ERROR** — Критичные ошибки

**Когда использовать:**
- Ошибки генерации треков
- Сбои API запросов
- Ошибки авторизации
- Исключения, которые требуют немедленного внимания

**Примеры:**

```typescript
// Frontend
import { logError } from '@/utils/logger';

logError('Failed to generate track', error, 'MusicGenerator', {
  trackId,
  userId,
  provider: 'suno',
  prompt: userPrompt
});

// Edge Functions
import { logger } from '../_shared/logger.ts';

logger.error('Suno API request failed', {
  error,
  endpoint: 'https://api.sunoapi.org/...',
  trackId,
  retries: 3
});
```

### 2. **WARN** — Предупреждения

**Когда использовать:**
- Fallback на резервный endpoint
- Превышение квот
- Устаревшие треки в кэше
- Неожиданные, но не критичные ситуации

**Примеры:**

```typescript
logWarn('Storage quota exceeded, clearing cache', 'TrackCache', {
  quotaExceeded: true,
  cacheSize: 150
});

logger.warn('Suno API rate limit approaching', {
  remaining: 5,
  resetTime: new Date().toISOString()
});
```

### 3. **INFO** — Информационные события

**Когда использовать:**
- Успешная генерация трека
- Начало/завершение долгих операций
- Загрузка данных
- Изменение состояния

**Примеры:**

```typescript
logInfo('Track generated successfully', 'MusicGenerator', {
  trackId,
  duration: 130,
  provider: 'suno',
  userId
});

logger.info('Starting stem separation', {
  trackId,
  mode: 'separate_vocal',
  versionId
});
```

### 4. **DEBUG** — Отладочная информация

**Когда использовать:**
- Трассировка выполнения
- Детали внутренних состояний
- Параметры запросов
- Только в development режиме

**Примеры:**

```typescript
logDebug('Cache hit for track', 'TrackCache', {
  trackId,
  cachedAt: new Date(cacheTimestamp).toISOString()
});

logger.debug('Polling Suno task status', {
  taskId,
  attempt: 3,
  nextPollIn: 5000
});
```

---

## 🏷️ Контекстные поля

### Best Practices для структурированных логов

```typescript
// ✅ ПРАВИЛЬНО: Добавляем релевантный контекст
logger.info('Track playback started', 'AudioPlayer', {
  trackId,
  userId,
  duration: 180,
  hasVersions: true,
  queuePosition: 3
});

// ❌ НЕПРАВИЛЬНО: Без контекста
logger.info('Track started');
```

### Обязательные поля для разных сценариев

| Сценарий | Обязательные поля | Опциональные поля |
|----------|-------------------|-------------------|
| **Генерация трека** | `trackId`, `userId`, `provider` | `prompt`, `styleTags`, `duration` |
| **Воспроизведение** | `trackId`, `userId` | `duration`, `queuePosition`, `versionId` |
| **Ошибки API** | `endpoint`, `statusCode`, `trackId` | `retries`, `timeout`, `userId` |
| **Кэширование** | `operation`, `trackId` | `cacheSize`, `quotaExceeded`, `ttl` |
| **Аналитика** | `eventType`, `trackId`, `userId` | `duration`, `position`, `source` |

### Автоматическая маскировка чувствительных данных

Logger **автоматически маскирует** следующие поля:

- `token`, `apiKey`, `secret`, `password`, `authorization`, `cookie`, `credential`

```typescript
// Вы пишете:
logger.info('Auth successful', 'Auth', {
  userId: '123',
  token: 'supersecret_abc123', // ← будет замаскировано
  email: 'user@example.com'
});

// В логах появится:
{
  "userId": "123",
  "token": "sup***23", // ← маскировка применена
  "email": "user@example.com"
}
```

---

## 🛡️ Sentry интеграция

### Автоматическая отправка в Sentry

Все логи уровня **ERROR** автоматически попадают в Sentry вместе с:
- Stack trace
- Breadcrumbs (последние 50 событий)
- Пользовательский контекст (userId, email)
- Контекстные данные

```typescript
// Это автоматически создаст событие в Sentry:
logError('Track generation timeout', new Error('Timeout after 5 minutes'), 'MusicGenerator', {
  trackId,
  provider: 'suno',
  duration: 300
});
```

### Breadcrumbs

Логи уровня **INFO**, **WARN**, **DEBUG** добавляются как breadcrumbs в Sentry:

```typescript
logInfo('User clicked generate button', 'UI', { prompt: 'epic rock' });
logWarn('API response slow', 'ApiService', { latency: 3000 });
// ↓ Если произойдет ошибка, эти события будут видны в Sentry как breadcrumbs
logError('Generation failed', error, 'MusicGenerator', { trackId });
```

---

## ⚙️ Edge Functions логирование

### Использование logger в Deno Edge Functions

```typescript
// supabase/functions/generate-suno/index.ts
import { logger } from '../_shared/logger.ts';

Deno.serve(async (req) => {
  try {
    logger.info('Received generate request', {
      method: req.method,
      url: req.url
    });

    // ... ваша логика ...

    logger.info('Track generated successfully', {
      taskId,
      trackId,
      duration: 120
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    logger.error('Generation failed', {
      error,
      trackId,
      endpoint: 'generate-suno'
    });
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

### Структура логов Edge Functions

Edge Functions logger выводит **JSON** логи в следующем формате:

```json
{
  "timestamp": "2025-10-11T10:30:45.123Z",
  "level": "info",
  "message": "Track generated successfully",
  "context": {
    "taskId": "abc123",
    "trackId": "uuid-...",
    "duration": 120
  }
}
```

### Просмотр логов Edge Functions

```bash
# Локально (Supabase CLI)
supabase functions logs generate-suno --since 5m

# Production (Supabase Dashboard)
# https://supabase.com/dashboard/project/YOUR_PROJECT/logs/edge-functions
```

---

## 🔍 Поиск и анализ логов

### Frontend логи (Browser Console)

Логи форматируются с emoji для удобства:

```
🔴 2025-10-11T10:30:45.123Z [MusicGenerator] Track generation failed
   Context: {"trackId":"...","provider":"suno","error":"Timeout"}
```

### Фильтрация в Console

```javascript
// В DevTools Console:
localStorage.setItem('debug', 'true'); // Включить DEBUG логи
localStorage.removeItem('debug');      // Выключить DEBUG логи
```

### Поиск в Sentry

1. **По контексту**:
   - Фильтр: `context.trackId:"uuid-..."`
   - Фильтр: `context.provider:"suno"`

2. **По уровню**:
   - `level:error`
   - `level:warning`

3. **По сообщению**:
   - `message:"generation failed"`

### Экспорт логов

```typescript
import { logger } from '@/utils/logger';

// Получить все логи
const allLogs = logger.getLogs();

// Экспортировать в JSON
const jsonLogs = logger.exportLogs();

// Скачать файл
const blob = new Blob([jsonLogs], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `logs-${Date.now()}.json`;
a.click();
```

---

## ❓ Частые проблемы

### 1. **ESLint ругается на console.log**

```
error  Unexpected console statement  no-console
```

**Решение**: Используйте logger вместо console.*

```typescript
// ❌ Неправильно
console.log('Track generated');

// ✅ Правильно
import { logInfo } from '@/utils/logger';
logInfo('Track generated', 'MusicGenerator', { trackId });
```

---

### 2. **Infinite Loop в useTrackSync** (исправлено в v2.6.3)

**Проблема**: Бесконечные reconnect attempts при потере Realtime соединения.

**Решение**: Добавлена guard clause в retry logic:

```typescript
// Проверка перед reconnect
if (!channelRef.current && !isConnecting) {
  subscribeToChannel();
}
```

**Проверка**: Отключите интернет на 10 секунд и проверьте консоль - не должно быть Stack Overflow.

---

### 3. **Логи не появляются в Sentry**

**Возможные причины:**
- Sentry не инициализирован (проверьте `src/main.tsx`)
- DSN не настроен (проверьте `.env`)
- Уровень логирования ниже ERROR (breadcrumbs не видны до ошибки)

**Проверка:**

```typescript
import { hasSentryClient } from '@/utils/logger';

if (hasSentryClient()) {
  console.log('Sentry готов к работе');
} else {
  console.error('Sentry не инициализирован!');
}
```

---

### 3. **Слишком много логов в production**

**Решение**: Используйте правильные уровни логирования

```typescript
// ❌ Неправильно: INFO для каждого кадра анимации
setInterval(() => {
  logInfo('Animation frame rendered', 'Player', { frame: i++ });
}, 16);

// ✅ Правильно: DEBUG для частых событий
setInterval(() => {
  logDebug('Animation frame', 'Player', { frame: i++ });
}, 16);
```

---

### 4. **Не вижу Edge Function логов**

**Проверьте:**
1. Используете ли вы `logger` из `_shared/logger.ts`?
2. Деплой выполнен успешно?
3. Логи появляются не мгновенно (задержка ~10-30 сек)

**Локальная отладка:**

```bash
# Запустите Edge Functions локально
supabase functions serve generate-suno --inspect-mode brk

# Логи будут видны в терминале
```

---

### 5. **Логи содержат чувствительные данные**

Logger **автоматически маскирует** все поля с keywords:
- `token`, `key`, `secret`, `password`, `authorization`, `cookie`, `credential`

Если нужно добавить свой keyword:

```typescript
// src/utils/logger.ts
const SENSITIVE_KEYWORDS = [
  ...existingKeywords,
  'myCustomSecret', // добавьте свой
];
```

---

## 📚 Дополнительные ресурсы

- [Sentry Documentation](https://docs.sentry.io/)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)
- [Supabase Edge Functions Logging](https://supabase.com/docs/guides/functions/logging)

---

**Версия**: 1.0.0  
**Последнее обновление**: 2025-10-11  
**Авторы**: Albert3 Development Team
