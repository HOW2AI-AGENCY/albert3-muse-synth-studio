---
name: Workspace Change PR
about: Шаблон Pull Request для изменений в области Workspace
title: "Workspace: <краткое описание>"
labels: ["workspace", "needs-review"]
---

## Описание

- Что изменено и зачем?
- Какие файлы и области затронуты?

## Чек-лист

- [ ] Линтер зелёный (`npm run lint:workspace`)
- [ ] Типы зелёные (`npm run typecheck`)
- [ ] Unit тесты пройдены (`npm test -- --coverage`)
- [ ] E2E сценарии проверены (если затрагивается UI) (`npm run test:e2e`)
- [ ] Документация обновлена (`docs/workspace/*`)
- [ ] Нет изменений в защищённых файлах без одобрения (`.protectedrc.json`)

## Скриншоты / Репорты

- Прикрепите необходимые артефакты (coverage, e2e, логи).
