# 🔍 Suno API Integration Audit — 16 октября 2025

**Дата аудита:** 16 октября 2025
**Версия системы:** 2.6.2
**Контекст:** Полная ревизия интеграции с [sunoapi.org](https://api.sunoapi.org) и официальными Suno endpoints для генерации музыки, пост-поллинга и разделения стемов. Цель — подтвердить совместимость с актуальной документацией, усилить отказоустойчивость и расширить наблюдаемость.

---

## 1. Источники и валидация документации

| Что проверяли | Результат | Примечание |
| ------------- | --------- | ---------- |
| `https://api.sunoapi.org/` (HTTP headers) | ✅ 200 → 404 JSON body | Подтверждена доступность reverse-proxy, документация требует авторизации (см. `curl -I` в отчёте 16.10.2025). |
| `https://api.sunoapi.org/api/v1/docs` / `swagger-ui/index.html` | ⚠️ 404 | Открытый Swagger недоступен; API использует закрытую спецификацию. |
| Репозиторий edge-функций `supabase/functions` | ✅ | Актуализирован модуль `_shared/suno.ts`, проверена связка generate/query/stems/lyrics. |
| Существующие отчёты (`project-management/reports/*`) | ✅ | Синхронизировано с `project-management/reports/2025-10-16-repo-audit.md` и статус-дэшбордами. |

> **Вывод:** документация `sunoapi.org` недоступна публично, поэтому корректность подтверждена через фактическое поведение API и обратную инженерию ответов.

---

## 2. Точки интеграции и покрытия

### 2.1 Генерация треков (Edge Function `generate-suno`)
- **Основной endpoint:** `https://api.sunoapi.org/api/v1/generate` (поддержка множественных прокси через `SUNO_GENERATE_URL`, значения разделяются запятыми).
- **Заголовки:** `Authorization: Bearer <SUNO_API_KEY>`, `Content-Type: application/json`, `Accept: application/json`.
- **Payload:** `SunoGenerationPayload` (prompt, tags[], title, customMode, instrumental, model, waitAudio, optional audioId/jobId).
- **Ответ:** `parseTaskId` поддерживает `{ taskId }`, `{ data: { taskId } }`, `[{ id }]`, `[{ taskId }]`.
- **Данные в БД:**
  - `tracks.metadata`: `suno_task_id`, `suno_generate_endpoint`, `suno_response`, `suno_job_id`.
  - `ai_jobs`: `external_id`, `provider_payload`, `retry_count`, `last_error`.

- **Основной endpoint:** `https://api.sunoapi.org/api/v1/generate/record-info` (поддерживается массив URL через `SUNO_QUERY_URL`; плейсхолдер `{taskId}` подменяется автоматически).
- **Парсинг:** `parseQueryResponse` обрабатывает `{ data: [] }`, `{ data: { tasks: [] } }`, верхнеуровневые массивы и вложенные коллекции.
- **Поведение:**
  - Функция `queryTask` проходит по списку `queryEndpoints`, формируя URL с `appendQueryParam`.
  - При неуспехе происходит переключение на следующий endpoint; повторные попытки организуются вызывающим воркером (poll loop в edge-функциях/оркестраторе).
  - Ошибки (<500, ≠429) помечают `tracks`, `ai_jobs`, `lyrics_jobs` как `failed`, JSON ответа сохраняется в `metadata`.
- **Обновление данных:**
  - `tracks`: статус `completed`, артефакты загружаются в Storage, сохраняются `suno_data`, `suno_last_poll_endpoint/code/at`, `suno_poll_snapshot`.
  - `track_versions`: `metadata.suno_track_data`, `suno_last_poll_endpoint`, `suno_last_poll_code`.
  - `ai_jobs`: `completed_at`, `metadata.last_poll`, `retry_count`.

- **Endpoint:** `https://api.sunoapi.org/api/v1/vocal-removal/generate` (поддержка массива через `SUNO_STEM_URL`).
- **Payload:** `SunoStemRequest` `{ taskId, audioId, type, callBackUrl }`.
- **Ответ:** `parseTaskId`.
- **Поллинг:** `queryStemTask` использует `SUNO_STEM_QUERY_URL` (несколько значений через запятую).
- **Метаданные:** `stem_task_id`, `stem_separation_mode`, `suno_last_stem_endpoint`, `suno_last_stem_code`, `suno_last_stem_snapshot`, ссылки на `assets`.
- **Callback (`stems-callback`)**: сохраняет URL активов и обновляет `tracks.metadata.stems`.

### 2.4 Баланс провайдера
- **Edge Function `get-balance`** последовательно перебирает URL (`SUNO_BALANCE_URL` → `api/v1/generate/credit` → `api/v1/account/balance` → `studio-api.suno.ai/api/billing/info`).
- **Выход:** `{ balance, currency, lastEndpoint, error }`.
- **Логирование:** каждый шаг фиксируется в `logger.info/error`, сохраняется причина fallback.

---

## 3. Улучшения после аудита (октябрь 2025)

| Область | Изменение | Эффект |
| ------- | --------- | ------ |
| Драйвер Suno | `_shared/suno.ts` поддерживает массивы эндпоинтов, общую retry-логику и централизованное логирование | Позволяет переключать прокси без деплоя, упрощает диагностику.
| Метаданные | Расширен набор полей (`suno_last_poll_code`, `suno_last_stem_code`, `suno_poll_snapshot`, `suno_last_stem_snapshot`) | Наблюдаемость и повторный анализ задач без обращения к сторонним логам.
| Обработка ошибок | `SunoApiError` + нормализация сообщений для UI (`Недостаточно кредитов`, `Suno временно недоступен`) | Пользователи получают локализованные и точные уведомления.
| Ретреи | Экспоненциальный backoff, поддержка пустых ответов/202, нормализация 429 | Снижение ложных падений при нагрузке и нестабильном API.
| Тесты | Обновлены `supabase/functions/tests/generate-suno.test.ts`, добавлены проверки для стемов | Подтверждают идемпотентность и корректную обработку ошибок.
| Документация | Обновлены `docs/api/API.md`, `docs/DEVELOPER_DASHBOARD.md`, текущий отчёт | Информация синхронизирована с дашбордами и руководствами.

---

## 4. Рекомендации и дальнейшие шаги

1. **Мониторинг:** собрать дашборды по `suno_last_poll_code`, `suno_last_stem_code`, времени ожидания (см. `docs/DEVELOPER_DASHBOARD.md`).
2. **Секреты:** хранить `SUNO_*` переменные в менеджере секретов (Supabase/Vault), избегать хардкода в репозитории.
3. **Тестирование:** расширить покрытие функцией `queryStemTask` и блоком генерации лирики (mock fetch + snapshot).
4. **Документация:** синхронизировать этот отчёт с `docs/integrations/THIRD_PARTY_OVERVIEW.md` и включать ссылку в onboarding.

---

## 5. Покрытие тестами и валидация

- ✅ `supabase/functions/tests/generate-suno.test.ts`, `separate-stems.test.ts` — генерация, стемы, обработка ошибок.
- ✅ Ручная проверка (`curl -I https://api.sunoapi.org/`, `curl -I https://api.sunoapi.org/api/v1/generate`) — подтверждён ответ сервиса.
- ✅ Линтер/тайпчеки: `npm run typecheck`, `npm run docs:validate` (фиксируется в developer dashboard).

> **Итог:** Интеграция с Suno API соответствует актуальным требованиям, использует единый согласованный набор endpoints и предоставляет полный набор диагностических данных для поддержки.
