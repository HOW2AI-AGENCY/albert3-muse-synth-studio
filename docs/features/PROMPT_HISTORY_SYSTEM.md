# 📜 Система истории промптов (Prompt History System)

## Обзор

Система автоматического логирования и управления историей промптов с метриками успешности, связью с результатами генерации и расширенными возможностями фильтрации.

## Основные возможности

### ✅ Автоматическое сохранение промптов
- Каждый промпт при генерации автоматически сохраняется в базу данных
- Сохраняются все параметры: текст, теги, провайдер, модель
- Отслеживается статус генерации (pending/success/failed)
- Измеряется время генерации в миллисекундах

### 🔍 Фильтры и поиск
- **Поиск по тексту**: Real-time поиск по содержимому промпта (debounced 300ms)
- **Фильтр по дате**: Сегодня, Вчера, 7 дней, 30 дней, Всё время
- **Фильтр по провайдеру**: Suno, Mureka, Все
- **Фильтр по статусу**: Успешные, Ошибки, В процессе, Все

### 📊 Группировка по датам
- **Сегодня**: Промпты за текущий день
- **Вчера**: Промпты за вчерашний день
- **Последние 7 дней**: Промпты за последнюю неделю (кроме сегодня/вчера)
- **Ранее**: Все остальные промпты

### 🔗 Связь с результатами
- Каждый промпт связан с треком, который был сгенерирован
- Отображается превью трека с названием и метриками (лайки, прослушивания)
- Быстрый доступ к треку из истории

### 📤 Экспорт истории
- **JSON**: Экспорт в структурированном формате
- **CSV**: Экспорт для анализа в Excel/Google Sheets

## Архитектура

### База данных

**Таблица `prompt_history`:**
```sql
- result_track_id: UUID (связь с tracks)
- generation_status: TEXT (pending/success/failed)
- generation_time_ms: INTEGER (время генерации)
- model_version: TEXT (модель провайдера)
```

**View `prompt_statistics`:**
```sql
SELECT
  ph.id, ph.prompt, ph.generation_status, ph.generation_time_ms,
  t.title as track_title, t.play_count, t.like_count
FROM prompt_history ph
LEFT JOIN tracks t ON ph.result_track_id = t.id
WHERE ph.user_id = auth.uid()
```

### Frontend Hooks

**`usePromptHistory(filters?: PromptFilters)`**
```typescript
const {
  history,           // Отфильтрованный список промптов
  promptStats,       // Статистика с результатами
  isLoading,         // Статус загрузки
  savePrompt,        // Сохранить новый промпт
  linkPromptToTrack, // Связать промпт с треком
  markPromptFailed,  // Отметить промпт как failed
  exportHistory,     // Экспорт в JSON/CSV
} = usePromptHistory({ dateRange: 'last7days', provider: 'suno' });
```

**Типы:**
```typescript
interface PromptFilters {
  dateRange?: 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days';
  provider?: 'all' | 'suno' | 'mureka';
  status?: 'all' | 'success' | 'failed' | 'pending';
  searchQuery?: string;
}
```

### UI Components

1. **PromptHistoryDialog** - Главный диалог с историей
2. **PromptHistoryFilters** - Фильтры и поиск
3. **GroupedPromptHistory** - Группировка по датам
4. **PromptHistoryItem** - Карточка промпта с результатами

## Использование

### Открытие диалога
```typescript
import { PromptHistoryDialog } from '@/components/generator/prompt-history';

<PromptHistoryDialog
  open={historyOpen}
  onOpenChange={setHistoryOpen}
  onSelect={(item) => {
    // Использовать промпт повторно
    setParams({
      prompt: item.prompt,
      tags: item.style_tags?.join(', '),
      // ...
    });
  }}
/>
```

### Сохранение промпта при генерации
```typescript
import { usePromptHistory } from '@/hooks/usePromptHistory';

const { savePrompt, linkPromptToTrack } = usePromptHistory();

// 1. Сохранить промпт перед генерацией
const { data: savedPrompt } = await savePrompt.mutateAsync({
  prompt: params.prompt,
  lyrics: params.lyrics,
  style_tags: params.styleTags,
  provider: 'suno',
  model_version: 'V5',
  generation_status: 'pending',
});

// 2. Генерация музыки
const track = await generateMusic(params);

// 3. Связать промпт с результатом
await linkPromptToTrack.mutateAsync({
  promptId: savedPrompt.id,
  trackId: track.id,
  generationTimeMs: Date.now() - startTime,
});
```

### Обработка ошибок
```typescript
try {
  const track = await generateMusic(params);
  await linkPromptToTrack.mutateAsync({...});
} catch (error) {
  // Отметить промпт как failed
  await markPromptFailed.mutateAsync(promptId);
}
```

### Экспорт истории
```typescript
const { exportHistory } = usePromptHistory();

// Экспорт в JSON
await exportHistory('json');

// Экспорт в CSV
await exportHistory('csv');
```

## Performance

### Оптимизации
- **Debounced search**: Поиск выполняется с задержкой 300ms
- **Lazy loading**: Компоненты загружаются по требованию
- **Query caching**: TanStack Query кеширует результаты
- **Indexed queries**: Индексы на `generation_status`, `result_track_id`, `user_id`

### Метрики
- Поиск: <50ms (с индексами)
- Фильтрация: <100ms (до 1000 промптов)
- Экспорт CSV: <500ms (до 10000 записей)

## Best Practices

### 1. Всегда связывайте промпты с результатами
```typescript
// ✅ ПРАВИЛЬНО
await linkPromptToTrack.mutateAsync({ promptId, trackId, generationTimeMs });

// ❌ НЕПРАВИЛЬНО - промпт останется без связи с треком
await savePrompt.mutateAsync({ prompt });
```

### 2. Обрабатывайте failed статусы
```typescript
// ✅ ПРАВИЛЬНО
try {
  const track = await generateMusic(params);
} catch (error) {
  await markPromptFailed.mutateAsync(promptId);
}
```

### 3. Используйте фильтры для оптимизации
```typescript
// ✅ ПРАВИЛЬНО - загружаем только последние 7 дней
const { history } = usePromptHistory({ dateRange: 'last7days' });

// ❌ НЕПРАВИЛЬНО - загружаем всю историю
const { history } = usePromptHistory({ dateRange: 'all' });
```

## Troubleshooting

### История не обновляется
**Проблема:** Промпты сохраняются, но не отображаются в истории.

**Решение:**
```typescript
// Инвалидируйте кеш после сохранения
queryClient.invalidateQueries({ queryKey: ['prompt-history'] });
```

### Медленный поиск
**Проблема:** Поиск тормозит при большом количестве промптов.

**Решение:**
- Убедитесь, что индексы созданы:
```sql
CREATE INDEX idx_prompt_history_user_created 
  ON prompt_history(user_id, created_at DESC);
```
- Используйте debounced search (300ms)

### Не отображаются связанные треки
**Проблема:** У промптов нет превью треков.

**Решение:**
- Убедитесь, что `result_track_id` заполнен:
```typescript
await linkPromptToTrack.mutateAsync({ promptId, trackId, generationTimeMs });
```

## Roadmap

### Фаза 2 (планируется)
- [ ] **A/B Testing UI**: Сравнение результатов нескольких промптов
- [ ] **Prompt Templates**: Библиотека лучших промптов
- [ ] **Analytics Dashboard**: Статистика успешности промптов
- [ ] **Prompt Optimization**: AI-рекомендации для улучшения промптов

### Фаза 3 (планируется)
- [ ] **Collaborative prompts**: Шаринг промптов между пользователями
- [ ] **Prompt versioning**: История изменений промпта
- [ ] **Auto-tagging**: Автоматическая категоризация промптов

## Ссылки

- [Hooks Documentation](../API.md#hooks)
- [Database Schema](../DATABASE_SCHEMA.md)
- [TanStack Query Guide](https://tanstack.com/query/latest/docs/react/guides/queries)
