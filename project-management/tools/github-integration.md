# 🔗 Интеграция с GitHub для Albert3 Muse Synth Studio

*Последнее обновление: Декабрь 2024*

## 🎯 Обзор интеграции

Этот документ описывает настройку и использование GitHub для управления проектом Albert3 Muse Synth Studio, включая Issues, Projects, Actions и другие инструменты.

## 📋 GitHub Issues

### Настройка шаблонов Issues

#### 1. Bug Report Template
```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: 🐛 Bug Report
description: Сообщить о проблеме в приложении
title: "[BUG] "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Спасибо за сообщение о баге! Пожалуйста, заполните форму ниже.
  
  - type: textarea
    id: description
    attributes:
      label: Описание проблемы
      description: Четкое описание того, что происходит
      placeholder: Опишите проблему...
    validations:
      required: true
  
  - type: textarea
    id: steps
    attributes:
      label: Шаги для воспроизведения
      description: Как воспроизвести проблему
      placeholder: |
        1. Перейти к '...'
        2. Нажать на '...'
        3. Увидеть ошибку
    validations:
      required: true
  
  - type: textarea
    id: expected
    attributes:
      label: Ожидаемое поведение
      description: Что должно было произойти
    validations:
      required: true
  
  - type: dropdown
    id: priority
    attributes:
      label: Приоритет
      options:
        - Низкий
        - Средний
        - Высокий
        - Критический
    validations:
      required: true
  
  - type: input
    id: version
    attributes:
      label: Версия приложения
      placeholder: v1.0.0
  
  - type: textarea
    id: environment
    attributes:
      label: Окружение
      placeholder: |
        - OS: Windows 11
        - Browser: Chrome 120
        - Node.js: v18.17.0
```

#### 2. Feature Request Template
```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: ✨ Feature Request
description: Предложить новую функцию
title: "[FEATURE] "
labels: ["enhancement", "needs-discussion"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Проблема
      description: Какую проблему решает эта функция?
    validations:
      required: true
  
  - type: textarea
    id: solution
    attributes:
      label: Предлагаемое решение
      description: Как должна работать новая функция?
    validations:
      required: true
  
  - type: textarea
    id: alternatives
    attributes:
      label: Альтернативы
      description: Рассматривались ли другие варианты?
  
  - type: dropdown
    id: category
    attributes:
      label: Категория
      options:
        - UI/UX
        - API
        - Performance
        - Security
        - Documentation
        - Testing
    validations:
      required: true
```

### Система меток (Labels)

#### Типы задач
- `bug` 🐛 - Ошибки в коде
- `enhancement` ✨ - Новые функции
- `documentation` 📚 - Документация
- `question` ❓ - Вопросы
- `duplicate` 👥 - Дубликаты
- `invalid` ❌ - Некорректные issues

#### Приоритеты
- `priority/critical` 🔴 - Критический
- `priority/high` 🟠 - Высокий
- `priority/medium` 🟡 - Средний
- `priority/low` 🟢 - Низкий

#### Статусы
- `status/needs-triage` 🔍 - Требует анализа
- `status/in-progress` 🚧 - В работе
- `status/blocked` 🚫 - Заблокировано
- `status/ready-for-review` 👀 - Готово к ревью

#### Компоненты
- `component/frontend` 🎨 - Frontend
- `component/backend` ⚙️ - Backend
- `component/database` 🗄️ - База данных
- `component/api` 🔌 - API
- `component/auth` 🔐 - Аутентификация

## 📊 GitHub Projects

### Настройка Project Board

#### 1. Создание проекта
```bash
# Создать новый проект через GitHub CLI
gh project create --title "Albert3 Muse Development" --body "Основной проект для разработки"
```

#### 2. Настройка колонок

##### Kanban Board
```
📋 Backlog          - Новые задачи
🔍 Ready            - Готовы к работе
🚧 In Progress      - В разработке
👀 Review           - На ревью
🧪 Testing          - Тестирование
✅ Done             - Завершено
```

##### Дополнительные поля
- **Priority**: Single select (Critical, High, Medium, Low)
- **Estimate**: Number (Story points)
- **Sprint**: Text (Sprint-2024-W49)
- **Assignee**: Person
- **Component**: Multi-select (Frontend, Backend, API, etc.)

### Автоматизация Projects

#### GitHub Actions для Projects
```yaml
# .github/workflows/project-automation.yml
name: Project Automation

on:
  issues:
    types: [opened, closed, assigned]
  pull_request:
    types: [opened, closed, merged]

jobs:
  update-project:
    runs-on: ubuntu-latest
    steps:
      - name: Add to project
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/users/USERNAME/projects/1
          github-token: ${{ secrets.ADD_TO_PROJECT_PAT }}
      
      - name: Set priority based on labels
        if: contains(github.event.issue.labels.*.name, 'priority/critical')
        run: |
          # Установить высокий приоритет для критических задач
          echo "Setting critical priority"
```

## 🔄 GitHub Actions Workflows

### 1. CI/CD Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check Prettier formatting
        run: npm run format:check
      
      - name: TypeScript check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-format
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
      
      - name: Run npm audit
        run: npm audit --audit-level moderate

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-format, test]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### 2. Автоматическое создание релизов
```yaml
# .github/workflows/release.yml
name: Create Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Generate changelog
        id: changelog
        run: |
          # Генерация changelog между тегами
          PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1)
          CHANGELOG=$(git log $PREVIOUS_TAG..HEAD --pretty=format:"- %s (%h)" --no-merges)
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGELOG" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            ## Изменения в этом релизе
            
            ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false
```

### 3. Автоматическое обновление зависимостей
```yaml
# .github/workflows/dependency-update.yml
name: Dependency Update

on:
  schedule:
    - cron: '0 2 * * 1' # Каждый понедельник в 2:00
  workflow_dispatch:

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Update npm dependencies
        run: |
          npm update
          npm audit fix --force
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'Автоматическое обновление зависимостей'
          body: |
            Автоматическое обновление npm зависимостей.
            
            Проверьте изменения перед merge.
          branch: dependency-updates
          delete-branch: true
```

## 🔐 Настройка безопасности

### GitHub Secrets
```bash
# Необходимые секреты для проекта
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUNO_API_KEY=your_suno_api_key
```

### Branch Protection Rules
```yaml
# Настройки защиты веток
main:
  required_status_checks:
    - lint-and-format
    - test
    - security-scan
    - build
  enforce_admins: true
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  restrictions:
    users: []
    teams: ["core-team"]

develop:
  required_status_checks:
    - lint-and-format
    - test
  required_pull_request_reviews:
    required_approving_review_count: 1
```

## 📈 Мониторинг и аналитика

### GitHub Insights
- **Pulse**: Активность репозитория
- **Contributors**: Статистика участников
- **Traffic**: Просмотры и клоны
- **Dependency graph**: Зависимости проекта

### Автоматические отчеты
```yaml
# .github/workflows/weekly-report.yml
name: Weekly Report

on:
  schedule:
    - cron: '0 9 * * 1' # Каждый понедельник в 9:00

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate weekly report
        run: |
          # Скрипт для генерации отчета
          echo "## Еженедельный отчет" > report.md
          echo "### Закрытые Issues: $(gh issue list --state closed --limit 100 --json number | jq length)" >> report.md
          echo "### Новые PR: $(gh pr list --state all --limit 100 --json number | jq length)" >> report.md
      
      - name: Create issue with report
        run: |
          gh issue create --title "Еженедельный отчет $(date +%Y-%m-%d)" --body-file report.md --label "report"
```

## 🛠 Полезные команды GitHub CLI

### Управление Issues
```bash
# Создать новый issue
gh issue create --title "Название" --body "Описание" --label "bug,priority/high"

# Список issues
gh issue list --state open --label "bug"

# Закрыть issue
gh issue close 123

# Назначить issue
gh issue edit 123 --add-assignee @username
```

### Управление Pull Requests
```bash
# Создать PR
gh pr create --title "Название" --body "Описание"

# Список PR
gh pr list --state open

# Merge PR
gh pr merge 456 --squash

# Checkout PR локально
gh pr checkout 456
```

### Управление Projects
```bash
# Добавить issue в проект
gh project item-add 1 --owner @me --url https://github.com/owner/repo/issues/123

# Обновить статус в проекте
gh project item-edit --id ITEM_ID --field-id FIELD_ID --single-select-option-id OPTION_ID
```

## 📚 Интеграция с документацией

### Автоматическое обновление документации
```yaml
# .github/workflows/docs-update.yml
name: Update Documentation

on:
  push:
    paths:
      - 'src/**'
      - 'docs/**'
    branches: [main]

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate API docs
        run: |
          npm run docs:generate
      
      - name: Commit updated docs
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git diff --staged --quiet || git commit -m "docs: auto-update API documentation"
          git push
```

---

*Эта интеграция обеспечивает полный цикл разработки с автоматизацией и мониторингом через GitHub*