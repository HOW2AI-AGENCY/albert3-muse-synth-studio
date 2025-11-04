# Чек-лист выполнения изменений в Workspace

- [ ] Определены затрагиваемые файлы и области
- [ ] Внесены правки по неймингу (camelCase/PascalCase)
- [ ] Импорты переведены на алиас `@/*` где возможно
- [ ] Проверены циклические зависимости (нет)
- [ ] Добавлены/обновлены unit-тесты (Vitest)
- [ ] Обновлены критичные e2e сценарии (Playwright)
- [ ] Обновлена документация (GUIDE/ADR/README)
- [ ] Линтер зелёный (`npm run lint:workspace`)
- [ ] Типы зелёные (`npm run typecheck`)
- [ ] PR подготовлен по шаблону (ниже)

## Команды проверки (Windows PowerShell)

- `npm run typecheck`
- `npm run lint:workspace`
- `npm test -- --coverage`
- `npm run test:e2e`