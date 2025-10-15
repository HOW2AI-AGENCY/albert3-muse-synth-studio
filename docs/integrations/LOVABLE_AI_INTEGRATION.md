# Lovable AI Integration Guide

## Модели и их использование

### Доступные модели:
- **google/gemini-2.5-flash** (по умолчанию) - Оптимальный баланс скорости и качества
- **google/gemini-2.5-pro** - Максимальное качество для сложных задач
- **google/gemini-2.5-flash-lite** - Быстрая классификация и суммаризация
- **openai/gpt-5** - Мощная альтернатива с отличным reasoning
- **openai/gpt-5-mini** - Баланс цены и качества
- **openai/gpt-5-nano** - Высокая скорость для простых задач

### Где используется:

1. **suggest-styles** (`supabase/functions/suggest-styles/index.ts`)
   - Модель: `google/gemini-2.5-flash`
   - Назначение: Рекомендации стилей музыки
   - Tool calling: `suggest_music_styles`
   - Structured output: tags, instruments, techniques, vocalStyle, references

2. **improve-prompt** (`supabase/functions/improve-prompt/index.ts`)
   - Модель: `google/gemini-2.5-flash`
   - Назначение: Улучшение промптов для музыкальной генерации
   - Контекст: Музыкальная теория, жанры, инструменты

3. **generate-lyrics** (планируется)
   - Модель: `google/gemini-2.5-flash`
   - Альтернатива: Suno API lyrics generation
   - Назначение: Генерация текстов песен

### Rate Limits & Error Handling

#### Коды ошибок:
- **429 Too Many Requests** - Rate limit превышен
  ```typescript
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    logger.warn('Rate limit hit', 'EdgeFunction', { retryAfter });
    // Exponential backoff или информирование пользователя
  }
  ```

- **402 Payment Required** - Недостаточно credits
  ```typescript
  if (response.status === 402) {
    logger.error('Insufficient Lovable AI credits', 'EdgeFunction');
    return new Response(JSON.stringify({ 
      error: 'Недостаточно AI кредитов. Пополните баланс.',
      code: 'INSUFFICIENT_CREDITS'
    }), { status: 402, headers: corsHeaders });
  }
  ```

- **500 Internal Server Error** - Проблемы на стороне AI сервиса
  ```typescript
  if (!response.ok) {
    logger.error('AI service error', 'EdgeFunction', {
      status: response.status,
      response: await response.text()
    });
    throw new Error(`AI service error: ${response.status}`);
  }
  ```

### Best Practices

1. **Всегда использовать tool calling для structured output**
   ```typescript
   const body = {
     model: 'google/gemini-2.5-flash',
     messages: [...],
     tools: [{
       type: "function",
       function: {
         name: "suggest_music_styles",
         parameters: {
           type: "object",
           properties: { ... },
           required: [...],
           additionalProperties: false
         }
       }
     }],
     tool_choice: { type: "function", function: { name: "suggest_music_styles" } }
   };
   ```

2. **Добавлять timeout для AI запросов**
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
   
   try {
     const response = await fetch(AI_URL, {
       signal: controller.signal,
       ...options
     });
   } finally {
     clearTimeout(timeoutId);
   }
   ```

3. **Кэшировать результаты на клиенте**
   ```typescript
   const { data } = useStyleRecommendations(payload, {
     staleTime: 1000 * 60 * 5, // 5 минут
     gcTime: 1000 * 60 * 30,    // 30 минут
   });
   ```

4. **Логировать входные параметры и результаты**
   ```typescript
   logger.info('Processing AI request', 'EdgeFunction', {
     hasMood: !!mood,
     hasGenre: !!genre,
     contextLength: context?.length || 0,
   });
   
   logger.info('AI response received', 'EdgeFunction', {
     tagsCount: data.tags?.length || 0,
     processingTime: Date.now() - startTime,
   });
   ```

5. **Graceful degradation при недоступности AI**
   ```typescript
   try {
     const aiResult = await fetchAI(...);
     return aiResult;
   } catch (error) {
     logger.warn('AI unavailable, using fallback', 'Component', { error });
     return fallbackRecommendations; // Предопределённые рекомендации
   }
   ```

### Примеры использования

#### Frontend (React Query):
```typescript
import { useStyleRecommendations } from '@/services/ai/style-recommendations';

const { data, isLoading, error } = useStyleRecommendations({
  context: userPrompt,
  genre: selectedGenre,
  currentTags: appliedTags,
}, {
  enabled: userPrompt.length >= 10,
  staleTime: 1000 * 60 * 5,
});
```

#### Edge Function:
```typescript
import { logger } from '../_shared/logger.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [...],
    tool_choice: { ... }
  }),
});
```

## Мониторинг и Отладка

### Логирование в Edge Functions:
```typescript
logger.info('AI request started', 'suggest-styles', {
  payload: { mood, genre, contextLength: context?.length }
});

logger.info('AI response parsed', 'suggest-styles', {
  tagsCount: suggestions.tags?.length,
  instrumentsCount: suggestions.instruments?.length,
});
```

### Метрики для мониторинга:
- Количество запросов к AI в минуту
- Средняя latency (должна быть < 3 секунд)
- Rate limit errors (429)
- Payment errors (402)
- Success rate (должен быть > 95%)

### Дебаггинг:
1. Проверить логи в Supabase Dashboard → Edge Functions → Logs
2. Искать ошибки по status code: `429`, `402`, `500`
3. Проверить payload в логах для воспроизведения ошибки
4. Использовать `console.log` временно, затем заменить на `logger`

---

**Последнее обновление**: 2025-10-15  
**Версия**: 2.4.0  
**Автор**: Albert3 Development Team
