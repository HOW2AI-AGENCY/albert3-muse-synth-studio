# generate-music-callb — Унифицированный обработчик Suno Callback

Этот модуль обрабатывает callback-запросы от Suno API и обеспечивает:

- Мгновенное воспроизведение первой доступной версии для пользователя
- Параллельную фоновую загрузку всех версий трека в Supabase Storage
- Кеширование версий (TTL 30 минут) для ускорения последующих запросов
- Финализацию трека на этапе `complete` с заменой ссылок на стабильные (Storage)

## Архитектура

```mermaid
sequenceDiagram
  autonumber
  participant Suno as Suno API
  participant EF as Edge Function: generate-music-callb
  participant Proc as Callback Processor
  participant DB as Supabase DB
  participant Storage as Supabase Storage
  participant UI as React UI

  Suno->>EF: POST /functions/v1/generate-music-callb<br/>payload: { task_id, callbackType, data }
  EF->>Proc: processSunoCallback(payload)
  Proc->>DB: SELECT tracks WHERE suno_id = task_id
  alt track found
    Proc->>DB: UPDATE tracks (status=processing, audio_url=stream/original)
    par Background uploads
      Proc->>Storage: Download & Upload audio for all versions
      Proc->>Storage: Download & Upload cover for all versions
      Proc->>DB: UPSERT track_versions (variant_index, audio_url, cover_url)
    and Cache versions
      Proc->>Proc: versionsCache.set(task_id, versions)
    end
    opt callbackType == complete
      Proc->>DB: UPDATE tracks (status=completed, audio_url=storage)
    end
    DB-->>UI: Realtime update (track status / urls)
  else track not found
    EF-->>Suno: 202 Accepted (retry later)
  end
```

## Точка входа

- `supabase/functions/generate-music-callb/index.ts` — Edge-функция, принимающая JSON-коллбек и вызывающая общий процессор.
- `supabase/functions/_shared/callback-processor.ts` — Общая логика обработки, кеширования и фоновых загрузок.

## Формат запроса (SunoCallbackPayload)

```json
{
  "code": 200,
  "msg": "OK",
  "data": {
    "callbackType": "first | complete | text | error",
    "task_id": "...",
    "data": [
      {
        "id": "suno-clip-id",
        "audio_url": "https://...",
        "stream_audio_url": "https://...",
        "image_url": "https://...",
        "duration": 180
      }
    ]
  }
}
```

## Ответы

- `200 OK` — Обработка успешна: `{ ok: true, trackId, stage, cached }`
- `202 Accepted` — Трек не найден; провайдеру рекомендуется повторить callback позже: `{ ok: false, retryable: true }`
- `400/500` — Ошибка валидации/серверная ошибка

## Хранилище

- Бакеты настроены миграцией:
  - `tracks-audio` (публичный доступ, MIME: `audio/mpeg` и т.п.)
  - `tracks-covers` (публичный доступ)
- Путь файла: `tracks-audio/{userId}/{trackId}/{fileName}`
- Именование: `main.mp3`, `version-1.mp3`, `version-2.mp3`, `version-1-cover.webp`, ...

## UI-поведение

- При получении `first`: UI сразу может начать проигрывание по `audio_url` (возможен `stream_audio_url`)
- При `complete`: UI получает стабильные ссылки из Storage (через realtime-обновления)
- Блок «Версии» может отображать и переключать `track_versions`

## Тестирование

- Unit-тесты: `supabase/functions/_shared/callback-processor_test.ts`
- Интеграционные тесты: рекомендуется добавить вызовы функции `generate-music-callb` с фиктивными данными Suno

## Примечания по производительности

- Кеш версий: 30 минут (TTL) снижает нагрузку при повторных callback/запросах
- Фоновые загрузки выполняются параллельно (`Promise.allSettled`), не блокируя быстрый ответ
- Используется обработка ошибок с фолбэком на оригинальные URL при сбое загрузки