# Чек‑лист наведения порядка в репозитории

Дата: 15 ноября 2025

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
- [ ] Обновить `CONTRIBUTING.md`: обязательный код‑ревью для значимых изменений, линтеры, тесты

## Зависимости
- [x] Проверен `package.json`: версии актуальны, CI проходит
- [ ] Добавить раздел "Dependency update policy" в `docs/maintenance`

## Ветки
- [ ] Провести чистку устаревших веток (требуется доступ к удалённому репозиторию)
  - Команда примера: `git branch -r --merged main` → удалить согласованные
  - Процедура: PR → Review → Merge/Delete

## CI/CD
- [x] GitHub Actions: Deno‑тесты для Supabase Edge функций запускаются
- [ ] Добавить статусный отчёт по пайплайну в `docs/monitoring/CI_STATUS.md`