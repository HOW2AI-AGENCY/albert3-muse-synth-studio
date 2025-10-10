# 🌐 Third-Party Integrations Overview — Albert3 Muse Synth Studio

> Обновлено: 16 октября 2025

Документ фиксирует текущее состояние и конфигурацию сторонних сервисов, используемых приложением. Используйте его при онбординге, аудите безопасности и планировании изменений инфраструктуры.

---

## 🔊 Suno API

- **Ответственный модуль:** `supabase/functions/_shared/suno.ts` + edge-функции `generate-suno`, `separate-stems`, `lyrics-*`.
- **Конфигурация окружения:** `SUNO_API_KEY`, `SUNO_GENERATE_URL`, `SUNO_QUERY_URL`, `SUNO_STEM_URL`, `SUNO_STEM_QUERY_URL`, `SUNO_LYRICS_URL`, `SUNO_LYRICS_QUERY_URL` (опциональные override).
- **Логирование:** каждое обращение сохраняет `suno_*` метаданные в таблицах `tracks`, `track_versions`, `lyrics_jobs`, `ai_jobs`.
- **Ошибки:** все ошибки приводятся к `SunoApiError` (статусы 4xx/5xx), см. [Suno API Audit](SUNO_API_AUDIT.md) для деталей.
- **Мониторинг:** см. раздел Observability в `project-management/reports/2025-10-16-repo-audit.md` (метрики по статус-кодам, ретраям и таймингу).

## 🗃️ Supabase (Auth, DB, Storage, Edge Functions)

- **Клиент:** `@/integrations/supabase/client` с конфигурацией `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- **База данных:** схемы описаны в `docs/storage/STORAGE_GUIDE.md`, миграции — `supabase/migrations/`.
- **Edge Functions:** находятся в `supabase/functions`. Используют общий набор хелперов (`_shared`), включая безопасность, логирование и валидацию.
- **Storage:** аудиофайлы и артефакты хранятся в Supabase Storage; политика кэширования описана в `public/sw.js` и `docs/performance/PERFORMANCE.md`.
- **Баланс провайдера:** функция `get-balance` обращается к Suno и fallback-эндпоинтам, результат нормализуется (см. `docs/integrations/SUNO_API_AUDIT.md#24-баланс-провайдера`).

## 🛰️ Sentry

- **Frontend SDK:** инициализируется в `src/main.tsx` (через `@sentry/react`, `@sentry/tracing`).
- **DSN:** `VITE_SENTRY_DSN` (обязателен для продакшена). Дополнительно поддерживаются `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`.
- **Инструменты:** breadcrumbs собираются из `src/utils/logger.ts` и `src/services/analytics.service.ts`. Edge Functions отправляют логи в Supabase (пока без Sentry).
- **Оповещения:** правила см. `project-management/reports/2025-10-16-repo-audit.md#observability` (ежедневные дайджесты + критические алерты).

## 📈 Аналитика и Web Vitals

- **Сервис:** `src/services/analytics.service.ts` — запись воспроизведений, просмотров, отправка web-vitals.
- **RPC функции:** `increment_play_count`, `increment_view_count` (описаны в миграциях Supabase).
- **Web Vitals:** при наличии `VITE_ANALYTICS_ENDPOINT` отправляются сериализованные метрики; при активном Sentry дублируются в breadcrumbs.
- **Защита от дубликатов:** `viewSessionGuard` хранит просмотренные треки в `sessionStorage` (ключ `analytics:viewedTracks`).

## 🧾 Email / Аутентификация

- Используется Supabase Auth (Email/Password). Настройки окружения в `.env` (`VITE_SUPABASE_*`).
- UI и флоу описаны в `docs/USER_GUIDE.md#1-регистрация-и-вход` и `docs/USER_FLOWS.md`.

## ✅ Чек-лист интеграций перед релизом

1. Suno API ключи актуальны, rate-limit мониторится (`docs/integrations/SUNO_API_AUDIT.md#рекомендации`).
2. Supabase миграции выполнены (`supabase/db diff` → `supabase db push`), seed прогнан (`npm run db:seed`).
3. Sentry активен, release и environment прописаны.
4. Аналитика — проверить наличие `VITE_ANALYTICS_ENDPOINT` (или выключить лишние вызовы в staging).
5. Документация обновлена: `README.md`, `docs/DEVELOPER_DASHBOARD.md`, `docs/INDEX.md`.

---

> Для запросов на изменение интеграций используйте шаблон коммуникации в `project-management/tools/github-integration.md` и фиксируйте обновления в `docs/integrations/SUNO_API_AUDIT.md`/`THIRD_PARTY_OVERVIEW.md`.
