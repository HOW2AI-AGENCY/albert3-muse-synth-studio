# 🧭 Developer Control Center — Albert3 Muse Synth Studio

> Единая точка входа для инженеров: ключевые метрики, навигация по коду, чек-листы CI/CD и статус критических интеграций.

---

## 📌 Быстрые факты

| Параметр | Значение |
| --- | --- |
| Версия кодовой базы | `2.6.2` (`package.json`) |
| Дата обновления | 16 октября 2025 |
| Текущий статус | Sprint 24 закрыт, подготовка к Sprint 25 |
| Основные платформы | React 18 + Vite 5, Supabase Edge Functions, Tailwind CSS |
| Ключевые интеграции | Suno API, Supabase Auth/DB/Storage, Sentry |

---

## 🗺️ Карта системы

### Frontend (Vite + React)
- `src/services/api.service.ts` — централизованный слой общения с Supabase (tracks, lyrics, balances, AI функции).
- `src/services/analytics.service.ts` — ивенты и взаимодействие с аналитикой.
- `src/features/…` — функциональные домены (трекер треков, генератор, библиотека и т. д.).
- `src/utils/logger.ts` — структурированное логирование (поддержка уровней и корреляции событий).

### Supabase Edge Functions
- `supabase/functions/_shared/suno.ts` — единый клиент Suno (генерация, поллинг, stems, лирика).
- `supabase/functions/get-balance/index.ts` — проверка баланса поставщика с откатами по эндпоинтам.
- `supabase/functions/_shared/*` — утилиты безопасности, логирования, хранения, валидации.

### Инфраструктура данных
- `supabase/migrations` — автоматические миграции.
- `supabase/migrations/manual` — ручные миграции + README.
- `scripts/docs/validate.ts` — линтер для документации и project-management.

---

## 🔥 CI & QA

| Тип проверки | Команда | Назначение |
| --- | --- | --- |
| Линтер | `npm run lint` | ESLint для `src/`, `docs/` (через `eslint-plugin-markdown`). |
| Типы | `npm run typecheck` | `tsc --noEmit` с путями из `tsconfig.app.json`. |
| Документация | `npm run docs:validate` | Проверка ссылок и структуры документации. |
| End-to-End | `npm run test:e2e` | Playwright smoke/critical сценарии (плеер, библиотека). |
| База данных | `npm run db:seed` | Сброс и наполнение Supabase тестовыми данными. |

**Pull Request Checklist**
1. Обновить ветку и прогнать lint → typecheck → docs:validate.
2. При изменении UI/UX — обновить `docs/USER_GUIDE.md` и `docs/interface/COMPONENT_SYSTEM.md`.
3. Для фич, связанных с генерацией — проверить `supabase/functions/_shared/suno.ts` и Suno отчёты.
4. Приложить результаты необходимых тестов к описанию PR.

---

## 📈 Наблюдаемость и алёрты

- **Логи:** `src/utils/logger.ts` (уровни `debug`/`info`/`warn`/`error`) → вывод в браузер и Sentry breadcrumbs.
- **Sentry:** подключен в `src/main.tsx` через `@sentry/react`; конфигруется через `.env` (`VITE_SENTRY_DSN`).
- **Метрики Suno:** сохранены в БД (`tracks.metadata.suno_*`, `ai_jobs`, `lyrics_jobs`), задокументированы в отчёте [2025-10-16](../project-management/reports/2025-10-16-repo-audit.md#observability).
- **Service Worker:** `public/sw.js` — строгая политика кэширования аудио (исключения для Supabase API). Ручной `Hard Reload` после изменений.

---

## 🗃️ Data Ops

| Область | Документ | Заметки |
| --- | --- | --- |
| Политика миграций | `supabase/migrations/manual/README.md` | Ручные миграции требуют code-review и синхронизации с CI. |
| Маппинг таблиц | `docs/architecture/ARCHITECTURE.md` + `docs/storage/STORAGE_GUIDE.md` | Подробные схемы и связи сущностей. |
| Seed-данные | `supabase/seed/index.ts` + `npm run db:seed` | Используется в Playwright и e2e сценариях. |
| Баланс Suno | `supabase/functions/get-balance/index.ts` + `docs/integrations/SUNO_API_AUDIT.md` | Поддержка fallback-эндпоинтов и унификация ответа. |

---

## 🔌 Интеграции

- [Suno API Audit](integrations/SUNO_API_AUDIT.md) — схемы запросов/ответов, обработка ошибок, тестирование.
- [Third-Party Overview](integrations/THIRD_PARTY_OVERVIEW.md) — состояние Supabase, Sentry, аналитики, политик безопасности.
- Supabase клиент: `@/integrations/supabase/client` (обновлять `.env` и README при изменениях ключей).

---

## 📋 Активные инициативы (Sprint 25 Prep)

| Статус | Инициатива | Ссылка |
| --- | --- | --- |
| 🟡 Planned | PERF-001 — Мониторинг производительности | `project-management/tasks/backlog.md#perf-001-мониторинг-производительности-` |
| 🟡 Planned | AI-002 — Расширение AI-функций | `project-management/tasks/backlog.md#ai-002-улучшение-ai-функций-` |
| 🟢 Monitoring | DATA-002 — Supabase Backup Automation | `project-management/tasks/backlog.md#data-002-supabase-backup-automation-` |
| 🟢 Monitoring | UX-002 — Социальные функции | `project-management/tasks/backlog.md#ux-002-социальные-функции-` |

---

## ✅ Контрольный список перед релизом

1. **Code Health** — lint + typecheck без предупреждений.
2. **Docs** — README, `docs/USER_GUIDE.md`, `docs/INDEX.md` актуализированы.
3. **Integration** — Suno и Supabase ключи в `.env`, сервис-воркер перезапущен.
4. **QA** — Playwright smoke, критические Vitest модули пройдены.
5. **Telemetry** — убедиться, что Sentry и логирование активны на стенде.

> Для вопросов/эскалаций использовать `project-management/NAVIGATION_INDEX.md` (контакты, процессы, шаблоны).
