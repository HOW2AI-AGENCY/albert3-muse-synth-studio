# CI/CD Audit (GitHub Actions/Hooks)

## Хуки
- Husky: pre-commit/pre-push — линт/типизация/тесты.

## CI (GitHub Actions)
- Jobs: typecheck, lint, unit/integration/e2e, bundle-budget, поиск конфликт-маркеров.

## Диаграмма пайплайна
```mermaid
flowchart LR
  A[Push/PR] --> B[Lint/Typecheck/Test]
  B --> C{Конфликты?}
  C -- Да --> D[Fail]
  C -- Нет --> E[Build + Budget]
  E --> F{Budget ок?}
  F -- Нет --> D
  F -- Да --> G[Deploy Frontend]
  G --> H[Deploy Edge Functions]
  H --> I[Smoke/E2E]
```

## Рекомендации (TBD)
- Добавить шаг проверки конфликт-маркеров; стабилизировать e2e; бюджеты бандла.