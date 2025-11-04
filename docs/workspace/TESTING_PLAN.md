# План тестирования (Workspace)

## Unit / Integration (Vitest)

- Компоненты: рендер, пропсы, ключевые интеракции.
- Хуки: happy-path, обработка ошибок, побочные эффекты.
- Сервисы: корректные вызовы репозиториев, обработка исключений.

Команда: `npm test -- --coverage`

## End-to-End (Playwright)

- Навигация по Workspace (Dashboard → Generate → Projects → Settings).
- Работа нижней панели навигации (mobile).
- Критичные сценарии: загрузка аудио, добавление/удаление треков.

Команда: `npm run test:e2e`

## Отчётность

- Coverage-отчёт для Vitest сохраняется в `test-results/`.
- Репорт Playwright — в `playwright-report/`.