# Sprint 31 Week 2: Critical Fixes & Lyrics Logging

## 🐛 Исправленные Критические Баги

### 1. **Аудио Плеер - Бесконечное Обновление**

**Проблема**: Плеер постоянно обновлял аудио URL, вызывая зависания и перезагрузки.

**Причина**:
- `useAudioUrlRefresh` вызывался при каждом рендере в `GlobalAudioPlayer.tsx`
- Проверка истечения URL выполнялась слишком часто
- Дублирование логики refresh в двух местах

**Решение**:
```typescript
// src/hooks/useAudioUrlRefresh.ts
// ✅ FIX: Проверяем не чаще 1 раза в час
if (now - lastCheckRef.current < URL_EXPIRY_CHECK_INTERVAL) {
  return;
}

// ✅ FIX: Обновляем время последней проверки ПОСЛЕ проверки истечения
if (!isUrlExpired(audioUrl)) {
  lastCheckRef.current = now;
  return;
}

// ✅ FIX: Удалили проверку при монтировании (checkAndRefresh() при mount)
// Только периодическая проверка каждый час
```

```typescript
// src/components/player/GlobalAudioPlayer.tsx
// ✅ FIX: ОТКЛЮЧИЛИ useAudioUrlRefresh (дублировал логику)
// Refresh обрабатывается только в error handler (строка 119-160)
```

**Результат**:
- ✅ Плеер больше не вызывает refresh без необходимости
- ✅ Проверка истечения URL только каждый час
- ✅ Единое место обработки ошибок загрузки

---

## 🆕 Новая Функциональность: Система Логирования Генераций

### 2. **База Данных: Логи Генерации Текстов**

**Создана таблица** `lyrics_generation_log`:

```sql
CREATE TABLE public.lyrics_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_lyrics TEXT,
  generated_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Индексы** для быстрого поиска:
- `idx_lyrics_generation_log_user_id`
- `idx_lyrics_generation_log_status`
- `idx_lyrics_generation_log_created_at`

**RLS Policies**:
- ✅ Пользователи видят только свои логи
- ✅ Админы видят все логи
- ✅ Пользователи могут создавать свои логи

---

### 3. **Frontend: Hook для Работы с Логами**

**Файл**: `src/hooks/useLyricsGenerationLog.ts`

**Функции**:
```typescript
// Получить все логи пользователя
useLyricsGenerationLog()

// Фильтровать по статусу
useLyricsGenerationLogByStatus(status: 'pending' | 'completed' | 'failed')

// Статистика
useLyricsGenerationStats()
// Возвращает: { total, completed, failed, pending, successRate }
```

---

### 4. **UI: Страница Просмотра Логов**

**Маршрут**: `/workspace/lyrics-log`

**Файл**: `src/pages/workspace/LyricsGenerationLog.tsx`

**Функциональность**:
- 📊 **Статистика**: Всего запросов, успешных, ошибок, % успешности
- 🔍 **Поиск**: По промпту, тексту или названию
- 📝 **Карточки логов** с информацией:
  - Статус (иконка + badge)
  - Промпт
  - Сгенерированный текст (предпросмотр + полный текст)
  - Ошибки (если есть)
  - Время создания
- 📜 **Виртуализированный скролл** для производительности

**Компоненты UI**:
- Cards для отображения логов
- Tabs (предпросмотр / полный текст)
- Badges для статусов
- Skeleton для загрузки
- ScrollArea для длинных текстов

---

## 📋 План Интеграции с Edge Functions

### Следующий шаг: Обновить `generate-lyrics` Edge Function

```typescript
// TODO: Добавить в supabase/functions/generate-lyrics/index.ts

// 1. При создании запроса
const { data: logEntry } = await supabase
  .from('lyrics_generation_log')
  .insert({
    user_id: userId,
    prompt: requestPrompt,
    status: 'pending',
    metadata: { model: 'lovable-ai', requestId }
  })
  .select()
  .single();

// 2. После успешной генерации
await supabase
  .from('lyrics_generation_log')
  .update({
    status: 'completed',
    generated_lyrics: lyrics,
    generated_title: title,
  })
  .eq('id', logEntry.id);

// 3. При ошибке
await supabase
  .from('lyrics_generation_log')
  .update({
    status: 'failed',
    error_message: error.message,
  })
  .eq('id', logEntry.id);
```

---

## ✅ Checklist

- [x] Исправлен баг с бесконечным обновлением плеера
- [x] Создана таблица `lyrics_generation_log`
- [x] RLS Policies настроены
- [x] Hook `useLyricsGenerationLog` создан
- [x] Страница просмотра логов создана
- [x] Маршрут `/workspace/lyrics-log` добавлен
- [ ] Интеграция с Edge Function `generate-lyrics` (TODO)
- [ ] Добавить ссылку на страницу в навигацию

---

## 🔍 Тестирование

**Плеер**:
1. Воспроизвести трек
2. Убедиться, что нет повторных загрузок аудио
3. Проверить Console Logs - не должно быть частых refresh

**Логи Генерации**:
1. Перейти в `/workspace/lyrics-log`
2. Проверить отображение статистики
3. Использовать поиск
4. Открыть полный текст в Tabs
5. Проверить фильтрацию по статусу (после интеграции)

---

**Статус**: ✅ Week 2 Code Quality + Critical Fixes завершены
**Следующий шаг**: Интеграция логирования в Edge Functions
