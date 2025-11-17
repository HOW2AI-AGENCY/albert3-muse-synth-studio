# Чек‑лист наведения порядка в репозитории

Дата: 17 ноября 2025 (Обновлено)

## Ревизия структуры
- [x] Структура `docs/` соответствует стандартам (architecture, sprints, meetings, maintenance)
- [x] Сводный статус спринтов: `project-management/SPRINT_STATUS.md`
- [x] Backlog спринта: `project-management/backlog/SPRINT_34.md`

## .gitignore
- [x] Наличие `.gitignore` и покрытие: `node_modules`, `dist`, `.env*`, tmp, cache, coverage
- [ ] Добавить исключения для `playwright-report/` (при необходимости)
- [ ] Проверить исключения для `supabase/.temp` (если используется локально)

## Документация
- [x] README обновлён разделами вебхуков и очистки Storage
- [x] `docs/architecture/webhooks.md` добавлен
- [x] `docs/architecture/SUNO_CALLBACK_SYSTEM.md` создан (полная документация callback system)
- [x] `docs/features/AI_CONTEXT_INTEGRATION.md` создан (AI features guide)
- [x] `docs/audit/LOGIC_AUDIT_2025-11-16.md` создан (comprehensive audit)
- [x] `tasks/TASKS_STATUS.md` обновлён (Phase 8 progress)
- [x] `project-management/sprints/SPRINT_35_STATUS.md` создан (Sprint 35 status)
- [x] `docs/sprints/SPRINT_35_PHASE_1_STATUS.md` создан (Phase 1 detailed report)
- [x] `docs/maintenance/REPO_CLEANUP_STATUS_2025-11-17.md` создан (today's progress)
- [ ] Обновить `CONTRIBUTING.md`: обязательный код‑ревью для значимых изменений, линтеры, тесты
- [ ] Создать `docs/development/PHASE_8_GUIDE.md` (DAW & Bulk Ops guide)

## Зависимости
- [x] Проверен `package.json`: версии актуальны, CI проходит
- [x] Добавлена `use-debounce` для DAW auto-save
- [ ] Добавить раздел "Dependency update policy" в `docs/maintenance`
- [ ] Audit и обновление устаревших пакетов (см. `docs/audit/DEPENDENCY_HEALTH.md`)

## Ветки
- [ ] Провести чистку устаревших веток (требуется доступ к удалённому репозиторию)
  - Команда примера: `git branch -r --merged main` → удалить согласованные
  - Процедура: PR → Review → Merge/Delete

## CI/CD
- [x] GitHub Actions: Deno‑тесты для Supabase Edge функций запускаются
- [ ] Добавить статусный отчёт по пайплайну в `docs/monitoring/CI_STATUS.md`
- [ ] Настроить тесты для новых хуков (useDAWProjects, useDAWAutoSave)
- [ ] Добавить integration тесты для bulk operations

## Код Quality
- [x] TypeScript coverage: 92% ✅
- [x] Logic quality: 9.3/10 (audit 16.11.2025) ✅
- [ ] Test coverage: 35% → target 80% (Phase 10)
- [ ] Исправить circular dependency: useTracks ↔ trackHelpers
- [ ] Добавить error boundaries для major features

## Новые фичи (Sprint 35)
- [x] Subscription System интегрирована (100% complete) ✅
- [x] AI Context Integration реализована (100% complete) ✅
- [x] Feature Gates добавлены (100% complete) ✅
- [x] CRON для daily reset настроен (100% complete) ✅
- [x] Callback System задокументирован (100% complete) ✅
- [ ] Unit Tests для новых фич (40% complete)
- [ ] E2E Tests для новых фич (0% complete)
- [ ] User Guides для AI features (0% complete)