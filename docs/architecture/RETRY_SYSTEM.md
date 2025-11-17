# 🔄 Retry System Architecture

## Обзор
Система retry защищает от лишних расходов кредитов, предотвращая дублирование запросов на нескольких уровнях.

## 🎯 Проблема
До оптимизации система делала избыточные retry на разных уровнях:
- **Frontend**: Debounce + rate limiting
- **Edge Functions**: retryWithBackoff (3 попытки)
- **Polling**: Продолжал опрашивать API даже при failed статусе
- **Результат**: Один запрос мог превратиться в 10+ вызовов API

## ✅ Решение

### 1. Умная Логика Retry (Backend)

```typescript
// supabase/functions/_shared/retry.ts

function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Не retry на этих ошибках
  const nonRetryablePatterns = [
    'unauthorized',           // 401
    'недостаточно кредитов', // 402
    'insufficient credits',
    'bad request',           // 400
    'invalid',              // validation errors
  ];
  
  return !nonRetryablePatterns.some(pattern => message.includes(pattern));
}
```

### 2. Умный Polling (Backend)

```typescript
// supabase/functions/_shared/generation-handler.ts

protected async startPolling(...) {
  const MAX_CONSECUTIVE_ERRORS = 3;
  let consecutiveErrors = 0;

  const poll = async () => {
    // 1. Проверка DB статуса ПЕРЕД вызовом API
    const { data: currentTrack } = await this.supabase
      .from('tracks')
      .select('status')
      .eq('id', trackId)
      .single();
    
    if (currentTrack?.status === 'completed' || 
        currentTrack?.status === 'failed') {
      return; // Остановить polling немедленно
    }
    
    // 2. Вызов API
    const trackData = await this.pollTaskStatus(taskId);
    
    // 3. Сброс счетчика при успехе
    consecutiveErrors = 0;
    
    // 4. STOP IMMEDIATELY on failed
    if (trackData.status === 'failed') {
      await this.handleFailedTrack(trackId, trackData.error);
      return; // ❌ Не продолжать polling
    }
    
    // 5. Проверка non-retryable ошибок
    catch (error) {
      if (isNonRetryable(error)) {
        await this.handleFailedTrack(trackId, error);
        return; // ❌ Остановить немедленно
      }
      
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return; // ❌ Слишком много ошибок подряд
      }
    }
  };
}
```

### 3. Защита на Frontend

```typescript
// src/hooks/useGenerateMusic.ts

// Debounce: 2 секунды между запросами
if (now - lastGenerationTimeRef.current < DEBOUNCE_DELAY) {
  toast({
    title: "Пожалуйста, подождите",
    description: "Предыдущий запрос еще обрабатывается. Это защищает от лишних расходов кредитов."
  });
  return;
}

// Rate limiting: 10 запросов в минуту
const rateLimit = rateLimiter.check(userId, RATE_LIMIT_CONFIGS.GENERATION);
if (!rateLimit.allowed) {
  toast({
    title: "Слишком много запросов",
    description: `Подождите ${resetTime}. Это защищает от лишних расходов кредитов.`
  });
  return;
}
```

## 📊 Результаты

### До оптимизации
```
❌ Пользователь нажал "Generate" дважды по ошибке
  → Frontend: 2 запроса отправлено
  → Backend: 2 × 3 retry = 6 вызовов API
  → Polling: продолжает опрашивать failed треки
  = 10+ вызовов API, потеря кредитов
```

### После оптимизации
```
✅ Пользователь нажал "Generate" дважды по ошибке
  → Frontend: 1 запрос (debounce блокирует 2-й)
  → Backend: 1 вызов API (умный retry)
  → Polling: останавливается на failed
  = 1 вызов API, экономия кредитов
```

## 🔒 Non-Retryable Ошибки

Эти ошибки **НЕ** retry-аются, так как повторная попытка не поможет:

| Ошибка | Код | Причина |
|--------|-----|---------|
| Unauthorized | 401 | Неверный API ключ |
| Insufficient Credits | 402 | Нет кредитов |
| Bad Request | 400 | Неверные параметры |
| Invalid | 400 | Ошибка валидации |

## 🔄 Retryable Ошибки

Эти ошибки retry-аются с exponential backoff:

| Ошибка | Стратегия |
|--------|-----------|
| Network timeout | 3 попытки с backoff |
| Rate limit (429) | 3 попытки с backoff |
| Server error (500) | 3 попытки с backoff |

## 🧪 Тестирование

```typescript
// tests/unit/services/__tests__/retry.test.ts

it('should not retry on insufficient credits', async () => {
  const error = new Error('Недостаточно кредитов');
  const mockFn = vi.fn().mockRejectedValue(error);

  await expect(
    mockRetryWithBackoff(mockFn, config)
  ).rejects.toThrow('Недостаточно кредитов');

  expect(mockFn).toHaveBeenCalledTimes(1); // ✅ Только 1 попытка
});

it('should retry on network errors', async () => {
  const mockFn = vi
    .fn()
    .mockRejectedValueOnce(new Error('Network timeout'))
    .mockResolvedValue({ success: true });

  const result = await mockRetryWithBackoff(mockFn, config);

  expect(result.metrics.totalAttempts).toBe(2); // ✅ Retry сработал
});
```

## 🎯 Best Practices

1. **Всегда проверяйте DB статус** перед API вызовом
2. **Останавливайтесь немедленно** на non-retryable ошибках
3. **Используйте счетчик consecutive errors** для защиты от бесконечных retry
4. **Показывайте пользователю причину** отказа от retry
5. **Логируйте все retry** для отладки

## 📈 Мониторинг

Ключевые метрики для отслеживания:
- `retry_attempts`: Количество retry попыток
- `consecutive_errors`: Счетчик подряд идущих ошибок
- `non_retryable_errors`: Количество non-retryable ошибок
- `credit_savings`: Экономия кредитов благодаря умному retry

---

**Версия**: 2.8.0  
**Дата**: 2025-11-17  
**Статус**: ✅ Active
