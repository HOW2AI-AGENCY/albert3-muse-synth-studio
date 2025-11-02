# 🤖 GitHub Automation Guide

## Рекомендуемые автоматизации

### 1. CI/CD Pipeline (.github/workflows/ci.yml)

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npx supabase functions deploy --all
```

### 2. Auto-label PRs (.github/workflows/labeler.yml)

```yaml
name: Labeler
on: [pull_request]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
```

### 3. Dependabot (автообновление зависимостей)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 4. Code Review Reminders

```yaml
# .github/workflows/review-reminder.yml
name: Review Reminder
on:
  schedule:
    - cron: '0 9 * * 1-5'
jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - uses: jenschelkopf/pr-reminder-action@v1
```

### 5. Stale Issues/PRs Cleanup

```yaml
# .github/workflows/stale.yml
name: Stale
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v8
        with:
          days-before-stale: 30
          days-before-close: 7
```

Подробнее см. документацию GitHub Actions.
