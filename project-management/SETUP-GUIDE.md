# 🚀 Руководство по настройке системы управления проектом

*Полное руководство по внедрению и использованию системы управления проектом Albert3 Muse Synth Studio*

## 📋 Содержание

1. [Быстрый старт](#-быстрый-старт)
2. [Настройка GitHub](#-настройка-github)
3. [Настройка автоматизации](#-настройка-автоматизации)
4. [Настройка отчетности](#-настройка-отчетности)
5. [Интеграции](#-интеграции)
6. [Мониторинг](#-мониторинг)
7. [Поддержка](#-поддержка)

---

## 🎯 Быстрый старт

### Шаг 1: Проверка структуры проекта

Убедитесь, что в вашем репозитории присутствует следующая структура:

```
project-management/
├── README.md                    # Обзор системы
├── SETUP-GUIDE.md              # Это руководство
├── tasks/
│   ├── backlog.md              # Бэклог задач
│   └── current-sprint.md       # Текущий спринт
├── milestones/
│   ├── roadmap.md              # Дорожная карта
│   └── tracking-system.md      # Система отслеживания
├── reports/
│   ├── team-dashboard.md       # Дашборд команды
│   └── automated-reports.md    # Автоматические отчеты
├── workflows/
│   └── development.md          # Процесс разработки
└── tools/
    ├── github-integration.md   # Интеграция с GitHub
    └── kanban-board.md         # Kanban доска
```

### Шаг 2: Настройка базовых меток GitHub

Выполните следующие команды для создания системы меток:

```bash
# Установка GitHub CLI (если не установлен)
winget install GitHub.cli

# Аутентификация
gh auth login

# Создание меток для типов задач
gh label create "type:bug" --color "d73a4a" --description "Исправление ошибки"
gh label create "type:feature" --color "0075ca" --description "Новая функциональность"
gh label create "type:enhancement" --color "a2eeef" --description "Улучшение существующей функции"
gh label create "type:documentation" --color "0052cc" --description "Обновление документации"
gh label create "type:refactor" --color "5319e7" --description "Рефакторинг кода"

# Создание меток для приоритетов
gh label create "priority:critical" --color "b60205" --description "Критический приоритет"
gh label create "priority:high" --color "d93f0b" --description "Высокий приоритет"
gh label create "priority:medium" --color "fbca04" --description "Средний приоритет"
gh label create "priority:low" --color "0e8a16" --description "Низкий приоритет"

# Создание меток для статусов
gh label create "status:in-progress" --color "fbca04" --description "В работе"
gh label create "status:review" --color "0052cc" --description "На ревью"
gh label create "status:testing" --color "5319e7" --description "На тестировании"
gh label create "status:blocked" --color "b60205" --description "Заблокировано"
```

### Шаг 3: Создание шаблонов Issues

Создайте директорию `.github/ISSUE_TEMPLATE/` и добавьте шаблоны:

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

Скопируйте шаблоны из `tools/github-integration.md` в соответствующие файлы.

---

## 🔧 Настройка GitHub

### GitHub Projects

1. **Создание проекта**:
   - Перейдите в раздел Projects вашего репозитория
   - Нажмите "New project"
   - Выберите "Board" template
   - Назовите проект "Albert3 Development Board"

2. **Настройка колонок**:
   ```
   📋 Backlog        (WIP: ∞)
   🎯 Ready          (WIP: 5)
   🔄 In Progress    (WIP: 3)
   👀 Code Review    (WIP: 5)
   🧪 Testing        (WIP: 3)
   🚀 Deploy         (WIP: 2)
   ✅ Done           (WIP: ∞)
   ```

3. **Настройка автоматизации**:
   - Добавьте автоматическое перемещение карточек при изменении статуса
   - Настройте автоматическое закрытие при merge PR

### GitHub Actions

Создайте следующие workflow файлы в `.github/workflows/`:

#### CI/CD Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploying to production..."
```

#### Автоматические отчеты
```yaml
# .github/workflows/reports.yml
name: Automated Reports

on:
  schedule:
    - cron: '0 9 * * 1-5'  # Ежедневно в рабочие дни
    - cron: '0 10 * * 1'   # Еженедельно в понедельник

jobs:
  daily-report:
    if: github.event.schedule == '0 9 * * 1-5'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate daily report
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          python scripts/generate-daily-report.py

  weekly-report:
    if: github.event.schedule == '0 10 * * 1'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate weekly report
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python scripts/generate-weekly-report.py
      
      - name: Create report issue
        run: |
          gh issue create \
            --title "Weekly Report - $(date +%Y-%m-%d)" \
            --body-file reports/weekly-report.md \
            --label "report,weekly"
```

---

## 🤖 Настройка автоматизации

### Установка зависимостей для скриптов

Создайте файл `scripts/requirements.txt`:

```txt
PyGithub==1.58.0
requests==2.31.0
matplotlib==3.7.1
seaborn==0.12.2
jira==3.5.0
atlassian-python-api==3.41.0
slack-sdk==3.21.3
```

Установите зависимости:

```bash
cd scripts
pip install -r requirements.txt
```

### Настройка переменных окружения

Создайте файл `.env` (не добавляйте в Git!):

```env
# GitHub
GITHUB_TOKEN=your_github_token_here
GITHUB_REPO=your-org/albert3-muse-synth-studio

# Slack
SLACK_WEBHOOK_GENERAL=https://hooks.slack.com/services/...
SLACK_WEBHOOK_DEV=https://hooks.slack.com/services/...
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/...

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USERNAME=your-email@company.com
EMAIL_PASSWORD=your-app-password

# Jira (опционально)
JIRA_SERVER=https://your-company.atlassian.net
JIRA_USER=your-email@company.com
JIRA_TOKEN=your-jira-token

# Confluence (опционально)
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USER=your-email@company.com
CONFLUENCE_TOKEN=your-confluence-token
```

### Настройка GitHub Secrets

Добавьте следующие секреты в настройках репозитория:

```bash
# Через GitHub CLI
gh secret set GITHUB_TOKEN --body "your_token_here"
gh secret set SLACK_WEBHOOK --body "your_webhook_url"
gh secret set EMAIL_USERNAME --body "your_email@company.com"
gh secret set EMAIL_PASSWORD --body "your_app_password"
```

---

## 📊 Настройка отчетности

### Создание скриптов отчетности

Создайте директорию `scripts/` и добавьте основные скрипты:

#### Базовый генератор отчетов
```python
# scripts/report_generator.py
import os
import sys
from datetime import datetime, timedelta
from github import Github

class BaseReportGenerator:
    def __init__(self):
        self.github = Github(os.getenv('GITHUB_TOKEN'))
        self.repo_name = os.getenv('GITHUB_REPO', 'your-org/albert3-muse-synth-studio')
        self.repo = self.github.get_repo(self.repo_name)
    
    def get_date_range(self, days=7):
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        return start_date, end_date
    
    def get_issues_in_period(self, start_date, end_date, state='all'):
        return list(self.repo.get_issues(
            state=state,
            since=start_date,
            sort='updated',
            direction='desc'
        ))
    
    def get_prs_in_period(self, start_date, end_date, state='all'):
        return [
            pr for pr in self.repo.get_pulls(state=state)
            if pr.updated_at >= start_date and pr.updated_at <= end_date
        ]
    
    def calculate_velocity(self, issues):
        # Подсчет Story Points из меток
        total_points = 0
        for issue in issues:
            for label in issue.labels:
                if label.name.startswith('sp:'):
                    points = int(label.name.split(':')[1])
                    total_points += points
                    break
        return total_points
    
    def save_report(self, content, filename):
        os.makedirs('reports', exist_ok=True)
        with open(f'reports/{filename}', 'w', encoding='utf-8') as f:
            f.write(content)
```

#### Ежедневный отчет
```python
# scripts/generate-daily-report.py
from report_generator import BaseReportGenerator
import requests
import os

class DailyReportGenerator(BaseReportGenerator):
    def generate_report(self):
        start_date, end_date = self.get_date_range(days=1)
        
        # Сбор данных
        closed_issues = [
            issue for issue in self.get_issues_in_period(start_date, end_date, 'closed')
            if issue.closed_at and issue.closed_at >= start_date
        ]
        
        merged_prs = [
            pr for pr in self.get_prs_in_period(start_date, end_date, 'closed')
            if pr.merged_at and pr.merged_at >= start_date
        ]
        
        open_issues = self.get_issues_in_period(start_date, end_date, 'open')
        
        # Генерация отчета
        report = self.format_report({
            'date': end_date.strftime('%Y-%m-%d'),
            'closed_issues': len(closed_issues),
            'merged_prs': len(merged_prs),
            'open_issues': len(open_issues),
            'velocity': self.calculate_velocity(closed_issues)
        })
        
        # Отправка в Slack
        self.send_to_slack(report)
        
        return report
    
    def format_report(self, data):
        return f"""
🌅 *Daily Standup Report - {data['date']}*

📊 *Вчерашние достижения*
• Завершено задач: {data['closed_issues']}
• Закрыто PR: {data['merged_prs']}
• Velocity: {data['velocity']} SP

🎯 *Текущая ситуация*
• Открытых задач: {data['open_issues']}

🔗 *Ссылки*
• [GitHub Project](https://github.com/{self.repo_name}/projects)
• [Current Sprint](tasks/current-sprint.md)
        """
    
    def send_to_slack(self, report):
        webhook_url = os.getenv('SLACK_WEBHOOK')
        if webhook_url:
            payload = {
                'text': report,
                'channel': '#daily-standup',
                'username': 'Daily Report Bot'
            }
            requests.post(webhook_url, json=payload)

if __name__ == '__main__':
    generator = DailyReportGenerator()
    report = generator.generate_report()
    print("Daily report generated and sent!")
```

### Настройка расписания отчетов

Добавьте в crontab (Linux/Mac) или Task Scheduler (Windows):

```bash
# Ежедневный отчет в 9:00
0 9 * * 1-5 cd /path/to/project && python scripts/generate-daily-report.py

# Еженедельный отчет в понедельник в 10:00
0 10 * * 1 cd /path/to/project && python scripts/generate-weekly-report.py

# Месячный отчет в первый день месяца
0 9 1 * * cd /path/to/project && python scripts/generate-monthly-report.py
```

---

## 🔗 Интеграции

### Slack Integration

1. **Создание Slack App**:
   - Перейдите на https://api.slack.com/apps
   - Создайте новое приложение
   - Настройте Incoming Webhooks
   - Скопируйте URL webhook'а

2. **Настройка каналов**:
   ```
   #daily-standup     - Ежедневные отчеты
   #weekly-reports    - Еженедельные отчеты
   #deployments       - Уведомления о деплоях
   #alerts           - Критические уведомления
   ```

3. **Тестирование интеграции**:
   ```bash
   python scripts/test-slack-integration.py
   ```

### Jira Integration (опционально)

1. **Создание API Token**:
   - Перейдите в Atlassian Account Settings
   - Создайте API Token
   - Добавьте в переменные окружения

2. **Синхронизация задач**:
   ```python
   # scripts/sync-jira.py
   from jira import JIRA
   import os
   
   jira = JIRA(
       server=os.getenv('JIRA_SERVER'),
       basic_auth=(os.getenv('JIRA_USER'), os.getenv('JIRA_TOKEN'))
   )
   
   # Синхронизация GitHub Issues с Jira
   def sync_github_to_jira():
       # Реализация синхронизации
       pass
   ```

### Email Notifications

1. **Настройка SMTP**:
   - Используйте Gmail App Passwords или корпоративный SMTP
   - Добавьте настройки в переменные окружения

2. **Шаблоны писем**:
   ```python
   # scripts/email-templates.py
   def weekly_report_template(data):
       return f"""
   <html>
   <body>
   <h2>Weekly Team Report - {data['week']}</h2>
   <p>Velocity: {data['velocity']} SP</p>
   <p>Quality Score: {data['quality']}%</p>
   </body>
   </html>
   """
   ```

---

## 📈 Мониторинг

### Grafana Dashboard (опционально)

1. **Установка Grafana**:
   ```bash
   # Docker
   docker run -d -p 3000:3000 grafana/grafana
   ```

2. **Настройка источников данных**:
   - GitHub API
   - Prometheus (для метрик приложения)
   - InfluxDB (для временных рядов)

3. **Импорт дашборда**:
   - Используйте конфигурацию из `reports/automated-reports.md`

### Простой мониторинг через GitHub Actions

```yaml
# .github/workflows/monitoring.yml
name: Project Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # Каждые 6 часов

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check project health
        run: |
          python scripts/health-check.py
      
      - name: Update status badge
        run: |
          python scripts/update-status-badge.py
```

### Метрики для отслеживания

```python
# scripts/metrics-collector.py
class MetricsCollector:
    def collect_development_metrics(self):
        return {
            'velocity': self.calculate_velocity(),
            'lead_time': self.calculate_lead_time(),
            'cycle_time': self.calculate_cycle_time(),
            'throughput': self.calculate_throughput(),
            'quality_score': self.calculate_quality_score()
        }
    
    def collect_team_metrics(self):
        return {
            'satisfaction': self.get_team_satisfaction(),
            'workload_distribution': self.analyze_workload(),
            'collaboration_score': self.calculate_collaboration()
        }
```

---

## 🆘 Поддержка и устранение неполадок

### Частые проблемы

#### 1. GitHub API Rate Limits
```python
# Решение: Использование аутентификации и кеширования
from github import Github
import time

def handle_rate_limit(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if 'rate limit' in str(e).lower():
                print("Rate limit exceeded, waiting...")
                time.sleep(3600)  # Ждем час
                return func(*args, **kwargs)
            raise e
    return wrapper
```

#### 2. Slack Webhook не работает
```bash
# Тестирование webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
```

#### 3. Скрипты не запускаются
```bash
# Проверка зависимостей
pip install -r scripts/requirements.txt

# Проверка переменных окружения
python -c "import os; print(os.getenv('GITHUB_TOKEN'))"

# Проверка прав доступа
chmod +x scripts/*.py
```

### Логирование и отладка

```python
# scripts/logger.py
import logging
import os

def setup_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Создание обработчика файла
    handler = logging.FileHandler('logs/project-management.log')
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
```

### Контакты для поддержки

- **Tech Lead**: @tech-lead
- **DevOps**: @devops-team
- **Project Manager**: @project-manager
- **GitHub Issues**: [Создать issue](https://github.com/your-org/albert3-muse-synth-studio/issues/new)

---

## 📚 Дополнительные ресурсы

### Документация
- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Slack API Documentation](https://api.slack.com/)

### Полезные инструменты
- [GitHub CLI](https://cli.github.com/)
- [Slack CLI](https://api.slack.com/automation/cli)
- [Jira CLI](https://github.com/ankitpokhrel/jira-cli)

### Шаблоны и примеры
- [GitHub Issue Templates](https://github.com/stevemao/github-issue-templates)
- [Awesome GitHub Actions](https://github.com/sdras/awesome-actions)
- [Project Management Templates](https://github.com/topics/project-management-template)

---

## ✅ Чек-лист внедрения

### Базовая настройка
- [ ] Создана структура директорий `project-management/`
- [ ] Настроены метки GitHub
- [ ] Созданы шаблоны Issues
- [ ] Настроен GitHub Project
- [ ] Добавлены GitHub Secrets

### Автоматизация
- [ ] Созданы GitHub Actions workflows
- [ ] Настроены скрипты отчетности
- [ ] Добавлены переменные окружения
- [ ] Протестированы автоматические отчеты

### Интеграции
- [ ] Настроена интеграция со Slack
- [ ] Настроены email уведомления
- [ ] (Опционально) Настроена интеграция с Jira
- [ ] (Опционально) Настроен Grafana dashboard

### Документация и обучение
- [ ] Команда ознакомлена с процессами
- [ ] Проведено обучение по использованию системы
- [ ] Созданы инструкции для новых участников
- [ ] Настроена система поддержки

---

*Система управления проектом Albert3 Muse Synth Studio готова к использованию! 🚀*