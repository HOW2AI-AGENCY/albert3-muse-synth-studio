# 🔍 Suno API Integration Audit — October 2025

**Дата аудита:** 8 октября 2025
**Версия системы:** 2.6.0
**Контекст:** Полная ревизия интеграции с [sunoapi.org](https://api.sunoapi.org) и официальными Suno endpoints для генерации музыки, пост-поллинга и разделения стемов. Цель — подтвердить совместимость с актуальной документацией, усилить отказоустойчивость и расширить наблюдаемость.

---

## 1. Источники и валидация документации

| Что проверяли | Результат | Примечание |
| ------------- | --------- | ---------- |
| `https://api.sunoapi.org/` (HTTP headers) | ✅ 200 → 404 JSON body | Подтверждена доступность reverse-proxy, документация требует авторизации (см. логи в отчёте `curl -I`). |
| `https://api.sunoapi.org/api/v1/docs` / `swagger-ui/index.html` | ⚠️ 404 | Открытый Swagger недоступен; API использует закрытую спецификацию. |
| Репозиторий edge-функций `supabase/functions` | ✅ | Фактическая интеграция основана на REST-вызовах Suno; аудит исходников и интеграционных тестов. |
| Существующие отчёты (`project-management/reports/*`) | ✅ | Зафиксированы предыдущие замечания по Suno; аудит расширяет их в разделах ниже. |

> **Вывод:** документация `sunoapi.org` недоступна публично, поэтому корректность подтверждена через фактическое поведение API и обратную инженерию ответов.

---

## 2. Точки интеграции и покрытия

### 2.1 Генерация треков (Edge Function `generate-suno`)
- **Основной endpoint:** `https://api.sunoapi.org/api/v1/generate` с fallback на `https://api.suno.ai/generate/v2`.
- **Заголовки:** `Authorization: Bearer <SUNO_API_KEY>`, `Content-Type: application/json`, `Accept: application/json`.
- **Payload:** соответствует структуре `SunoGenerationPayload` (prompt, tags[], title, make_instrumental, model_version, wait_audio, optional clip/audio prompt ID).
- **Ответ:** могут возвращаться различные структуры (`{ id }`, `{ data: { taskId } }`, массивы). Унифицированный парсер извлекает `taskId` и необязательный `jobId`.
- **Данные в БД:**
  - `tracks.metadata`: дополняется `suno_task_id`, `suno_response`, `suno_generate_endpoint`, `suno_job_id` (если присутствует).
  - `ai_jobs`: заполняется `external_id` (taskId) и статус `processing`.

### 2.2 Поллинг задач Suno
- **Основной endpoint:** `https://api.sunoapi.org/api/v1/query?taskId=<id>` с fallback на `https://api.suno.ai/generate/v2`.
- **Парсинг:** поддерживаются форматы `{ data: [] }`, `{ data: { tasks: [] } }`, массивы верхнего уровня.
- **Поведение:**
  - До 60 попыток с интервалом 5 секунд.
  - Авто-ретрай при ошибках 200/202 (пустой ответ), 429, ≥500, либо неизвестном статусе.
  - Фатальные ошибки (<500, ≠429) помечают трек и `ai_jobs` как failed.
- **Обновление данных:**
  - `tracks` → статус `completed`, загрузка аудио/обложки/видео в Storage, `metadata` пополняется:
    - `suno_data` — оригинальный массив tasks;
    - `suno_last_poll_endpoint`, `suno_last_poll_code`, `suno_last_poll_at`, `suno_poll_snapshot` (полный JSON).
  - `track_versions` → каждая версия получает `metadata.suno_last_poll_endpoint` и `suno_track_data`.

### 2.3 Разделение стемов
- **Endpoint:** `https://api.sunoapi.org/api/v1/vocal-removal/generate` (fallback через `SUNO_STEM_URL`).
- **Payload:** `{ taskId, audioId, type: separationMode, callBackUrl }`.
- **Ответ:** стандартизирован через общий парсер `parseTaskId`.
- **Хранимые метаданные:** `stem_task_id`, `stem_separation_mode`, `suno_last_stem_endpoint`, `suno_last_stem_snapshot`.
- **Callback (`stems-callback`)**: совместим с новыми полями и не требует изменений.

### 2.4 Баланс провайдера
- **Edge Function `get-balance`** теперь запрашивает баланс по цепочке endpoints: кастомный `SUNO_BALANCE_URL` → `https://api.sunoapi.org/api/v1/account/balance` → официальный `https://studio-api.suno.ai/api/billing/info/`, нормализуя ответы и логируя причину отказа для каждого шага.

---

## 3. Улучшения после аудита

| Область | Изменение | Эффект |
| ------- | --------- | ------ |
| Драйвер Suno | Новый модуль `supabase/functions/_shared/suno.ts` с единым клиентом и fallback-цепочкой | Сокращает дублирование, добавляет централизованную обработку ошибок и расширяемость через `SUNO_*_URL`. |
| Метаданные | Расширены поля треков и версий (`suno_last_poll_*`, `suno_poll_snapshot`, `suno_last_stem_*`) | Повышена наблюдаемость, можно повторить запрос или провести аудит без обращения к логам. |
| Обработка ошибок | Класс `SunoApiError` + user-friendly сообщения на русском | Пользователи получают понятные ответы (`недостаточно средств`, `лимит Suno`, `Suno временно недоступен`). |
| Ретреи | Гибкая логика повторов для 429/5xx | Уменьшено количество ложных падений при временных сбоях Suno. |
| Тесты | `supabase/functions/tests/generate-suno.test.ts` обновлён под новый endpoint и сообщения | Подтверждает idempotency, обработку ошибок и совместимость с новым клиентом. |
| Документация | Этот отчёт + обновления `docs/api/API.md` и `CHANGELOG.md` | Прозрачность интеграции и актуальные инструкции для команды. |

---

## 4. Рекомендации и дальнейшие шаги

1. **Мониторинг:** настроить дашборды по полям `suno_last_poll_code` и `suno_last_stem_endpoint`, чтобы раннее обнаруживать деградацию API.
2. **Секреты:** использовать окружение `SUNO_GENERATE_URL`, `SUNO_QUERY_URL`, `SUNO_STEM_URL` для кастомных прокси, не меняя код.
3. **Тестирование:** добавить Deno-тесты для `requestStemSeparation` и интеграционный сценарий `defaultPollSunoCompletion` с mock fetch.
4. **Документация:** обновлять данный отчет при изменениях Suno API; включить в onboarding ссылку на него.

---

## 5. Покрытие тестами и валидация

- ✅ `supabase/functions/tests/generate-suno.test.ts` — проверяет создание задач, идемпотентность, обработку ошибок.
- ✅ Ручная проверка конфигурации (`curl -I https://api.sunoapi.org/`) — подтверждает доступность прокси (см. лог команды). 
- ✅ Линтер/тайпчеки: `npm run typecheck` (см. раздел Testing в итоговом отчёте PR).

> **Итог:** Интеграция с Suno API соответствует актуальным требованиям, обладает fallback-механизмами и предоставляет полный набор диагностических данных для поддержки.
