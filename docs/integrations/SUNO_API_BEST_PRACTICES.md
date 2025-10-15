# Suno API Integration Best Practices

## Endpoints используемые в проекте

### 1. Generate Music (`/generate/v2/`)

**Edge Function**: `supabase/functions/generate-suno/index.ts`

**Параметры**:
- `prompt` - Текст промпта или lyrics (в customMode)
- `tags` - Массив стилевых тегов
- `title` - Название трека (опционально, автогенерация если пусто)
- `make_instrumental` - Boolean, создать инструментальный трек
- `model` - Версия модели (V5 по умолчанию)
- `customMode` - Boolean, использовать lyrics вместо prompt
- `callBackUrl` - URL для callback (опционально)

**Callback URL**: `${SUPABASE_URL}/functions/v1/suno-callback`

**Polling**: Fallback если callback не сработал (10 минут таймаут, 5 секунд интервал)

**Модели**:
- `V5` - Новейшая модель (рекомендуется)
- `V4_5PLUS` - Предыдущая версия
- `V4_5` - Стабильная версия
- `V4` - Legacy
- `V3_5` - Старая версия

### 2. Lyrics Generation (`/api/v1/lyrics`)

**Статус**: ❌ Пока не реализовано в проекте

**Альтернатива**: Lovable AI (`google/gemini-2.5-flash`)

**Планируемое использование**:
- Генерация текстов песен на основе промпта
- 2-3 варианта текстов за один запрос
- Callback для получения результатов

**Пример callback response**:
```json
{
  "code": 200,
  "data": {
    "callbackType": "complete",
    "taskId": "11dc****8b0f",
    "data": [
      {
        "text": "[Verse]\nWalking through...",
        "title": "Generated Song",
        "status": "complete",
        "errorMessage": ""
      }
    ]
  }
}
```

### 3. Stem Separation (`/api/v1/vocal-removal/generate`)

**Edge Function**: `supabase/functions/separate-stems/index.ts`

**Типы разделения**:

1. **`separate_vocal`** - Разделение на vocals и instrumental
   - `vocal_url` - Вокальная дорожка
   - `instrumental_url` - Инструментальная дорожка

2. **`split_stem`** - Разделение на 12 отдельных инструментов:
   - `vocal_url` - Основной вокал
   - `backing_vocals_url` - Бэк-вокал
   - `drums_url` - Барабаны
   - `bass_url` - Бас
   - `guitar_url` - Гитара
   - `keyboard_url` - Клавишные
   - `percussion_url` - Перкуссия
   - `strings_url` - Струнные
   - `synth_url` - Синтезатор
   - `fx_url` - Эффекты
   - `brass_url` - Духовые (медные)
   - `woodwinds_url` - Духовые (деревянные)

**Callback URL**: `${SUPABASE_URL}/functions/v1/suno-stem-callback`

**Timeout**: 5 минут для разделения

### 4. Balance Check (`/get-provider-balance`)

**Edge Function**: `supabase/functions/get-provider-balance/index.ts`

**Кэширование**: 1 минута (в React Query)

**Response**:
```typescript
{
  balance: number | null,
  monthly_limit?: number,
  monthly_usage?: number,
  endpoint: string,
  error?: string
}
```

**Используется**:
- Перед генерацией трека (проверка доступных кредитов)
- В UI для отображения баланса пользователю

## Обработка ошибок

### Rate Limiting (429)

```typescript
if (error.status === 429) {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
  logger.warn('Suno rate limit hit', 'generate-suno', { retryAfter });
  
  // Сохранить в metadata для retry
  await supabase
    .from('tracks')
    .update({
      metadata: {
        ...existingMetadata,
        last_error: {
          type: 'rate_limit',
          retry_after: retryAfter,
          timestamp: new Date().toISOString()
        }
      }
    })
    .eq('id', trackId);
  
  // Запланировать retry через retryAfter секунд
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return retry();
}
```

### Insufficient Credits (402)

```typescript
const balanceResult = await fetchSunoBalance({ apiKey: SUNO_API_KEY });

if (balanceResult.success && balanceResult.balance <= 0) {
  logger.error('Insufficient Suno credits', 'generate-suno', {
    balance: balanceResult.balance
  });
  
  throw new Error('Недостаточно кредитов Suno для генерации трека. Пополните баланс и попробуйте снова.');
}
```

### Task Timeout

**Generation**: 10 минут
```typescript
const GENERATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

if (Date.now() - taskStartTime > GENERATION_TIMEOUT) {
  logger.error('Generation timeout', 'generate-suno', {
    trackId,
    taskId,
    elapsedTime: Date.now() - taskStartTime
  });
  
  await supabase
    .from('tracks')
    .update({
      status: 'failed',
      error_message: 'Превышено время ожидания генерации (10 минут)',
      metadata: { ...metadata, timed_out_at: new Date().toISOString() }
    })
    .eq('id', trackId);
}
```

**Stem Separation**: 5 минут
```typescript
const STEM_TIMEOUT = 5 * 60 * 1000; // 5 minutes
```

**Polling interval**: 5 секунд
```typescript
const POLLING_INTERVAL = 5000; // 5 seconds
```

## Callbacks vs Polling

### Callback (предпочтительно)

**Преимущества**:
- Меньше нагрузки на API
- Быстрее обновление статуса
- Не занимает CPU на polling

**Требования**:
- Публичный URL для callback
- Обработка в `suno-callback` Edge Function

**Реализация**:
```typescript
const callbackUrl = `${SUPABASE_URL}/functions/v1/suno-callback`;

const sunoPayload = {
  prompt,
  tags,
  title,
  callBackUrl: callbackUrl,
  // ... other params
};
```

### Polling (fallback)

**Когда используется**:
- Callback URL недоступен
- Callback не пришел за 10 минут
- Восстановление после сбоя

**Логика**:
```typescript
// В metadata трека
metadata: {
  is_polling_active: true,
  suno_task_id: taskId,
  suno_started_at: new Date().toISOString()
}

// Polling loop
async function pollSunoCompletion(trackId, taskId, supabaseAdmin, apiKey) {
  const MAX_ATTEMPTS = 120; // 10 минут при 5-секундном интервале
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await queryTask(taskId, apiKey);
    
    if (result.status === 'complete') {
      await updateTrackWithResult(trackId, result);
      return;
    }
    
    if (result.status === 'failed') {
      await markTrackAsFailed(trackId, result.error);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
  }
  
  // Timeout
  await markTrackAsFailed(trackId, 'Timeout после 10 минут');
}
```

**Остановка polling**:
```typescript
// При получении callback
await supabase
  .from('tracks')
  .update({
    metadata: { ...metadata, is_polling_active: false }
  })
  .eq('id', trackId);
```

## Idempotency

**Ключ**: `idempotencyKey` (UUID)

**Проверка перед генерацией**:
```typescript
const { data: existingTrack } = await supabase
  .from('tracks')
  .select('id, status, metadata')
  .eq('idempotency_key', idempotencyKey)
  .maybeSingle();

if (existingTrack) {
  const sunoTaskId = existingTrack.metadata?.suno_task_id;
  logger.info('Idempotent request detected', 'generate-suno', {
    trackId: existingTrack.id,
    status: existingTrack.status,
    sunoTaskId
  });
  
  return new Response(JSON.stringify({
    success: true,
    trackId: existingTrack.id,
    taskId: sunoTaskId,
    message: "Request already processed (idempotency check)"
  }), { status: 200 });
}
```

## Retry Strategy

**Exponential Backoff**:
```typescript
import { retryWithBackoff, retryConfigs } from '../_shared/retry.ts';

const { result, metrics } = await retryWithBackoff(
  () => sunoClient.generateTrack(payload),
  retryConfigs.sunoApi, // maxAttempts: 3, baseDelay: 1000, maxDelay: 10000
  'generate-suno'
);

logger.info('Generation successful', 'generate-suno', {
  taskId: result.taskId,
  retryAttempts: metrics.totalAttempts,
  totalDelay: metrics.totalDelay
});
```

## Metadata Structure

**В таблице `tracks.metadata`**:
```typescript
{
  // Suno generation
  suno_task_id: string,
  suno_job_id?: string,
  suno_started_at: string (ISO timestamp),
  suno_completed_at?: string (ISO timestamp),
  suno_response: object, // Raw response от Suno
  suno_generate_endpoint: string,
  suno_completion_strategy: 'callback' | 'polling',
  suno_callback_url?: string,
  is_polling_active: boolean,
  
  // Balance check
  suno_balance_remaining?: number,
  suno_balance_checked_at?: string,
  suno_balance_endpoint?: string,
  suno_balance_monthly_limit?: number,
  suno_balance_monthly_usage?: number,
  
  // Error tracking
  last_error?: {
    error_type: string,
    error_message: string,
    error_timestamp: string,
    retry_attempts: number,
    retry_errors: Array<{attempt: number, error: string}>,
    payload_sent: object
  }
}
```

## Best Practices Summary

1. ✅ **Всегда проверять balance перед генерацией**
2. ✅ **Использовать callback + polling fallback**
3. ✅ **Логировать все запросы и ответы**
4. ✅ **Сохранять metadata для отладки**
5. ✅ **Использовать idempotency key**
6. ✅ **Retry с exponential backoff**
7. ✅ **Timeout для всех операций**
8. ✅ **Graceful degradation при ошибках**
9. ✅ **Мониторить rate limits**
10. ✅ **Хранить stem URLs в `track_stems` таблице**

---

**Последнее обновление**: 2025-10-15  
**Версия**: 2.4.0  
**Автор**: Albert3 Development Team  
**Источник**: Custom Knowledge + Suno API Documentation
