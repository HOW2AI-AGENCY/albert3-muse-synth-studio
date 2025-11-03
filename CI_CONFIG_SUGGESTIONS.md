# Предложения по конфигурации CI/CD

## 1. Предлагаемые шаги пайплайна (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit & Integration Tests
        run: npm test -- --coverage

      - name: Check Bundle Size # Новый шаг
        run: npm run bundle:check

      - name: E2E Tests (with Axe) # Улучшенный шаг
        run: npm run test:e2e

      - name: Lighthouse Check # Новый шаг
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:5173
          budgetPath: ./lighthouse-budgets.json
```

## 2. Бюджеты производительности и бандла

### 2.1. Бюджет бандла (`package.json`)

Добавить скрипт для проверки размера бандла.

```json
// package.json
"scripts": {
  "bundle:check": "npx bundle-buddy --max-size=250KB"
}
```

### 2.2. Бюджеты Lighthouse (`lighthouse-budgets.json`)

```json
[
  {
    "path": "/*",
    "performance": 95,
    "accessibility": 100,
    "best-practices": 95,
    "seo": 90
  }
]
```

## 3. Артефакты и блокировщики слияния

*   **Артефакты:**
    *   Отчет о покрытии тестами.
    *   Отчет Lighthouse.
    *   Скриншоты из E2E-тестов при падении.
*   **Блокировщики:**
    *   Падение любого шага (lint, тесты).
    *   Превышение бюджета бандла.
    *   Снижение метрик Lighthouse ниже пороговых значений.
    *   Обнаружение критических уязвимостей в зависимостях (`npm audit`).
