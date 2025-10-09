# 🧭 Навигация по проекту Albert3 Muse Synth Studio

**Последнее обновление**: 10 октября 2025
**Версия**: 2.6.2
**Текущий Sprint**: Sprint 24 (ПЛАНИРОВАНИЕ)
**Следующий Sprint**: Sprint 25 (ПОДГОТОВКА)

Этот документ поможет быстро найти нужную информацию в проекте.

---

## 🎯 Быстрый доступ

### Для разработчиков
- 🚀 [Начало работы](../SETUP-GUIDE.md) - установка и настройка
- ✅ [Sprint 23 Отчет](reports/sprint-23-report.md) - результаты завершённого спринта
- 📋 [Sprint 24 План](tasks/sprint-24-plan.md) - текущий спринт
- 🐛 [Troubleshooting](../docs/TROUBLESHOOTING_TRACKS.md) - решение проблем
- 📋 [Быстрый справочник](QUICK-REFERENCE.md) - команды и shortcuts


### Для менеджеров
- 📊 [Статус задач](tasks/TASKS_STATUS.md) - актуальные статусы и переносы
- 📈 [Technical Debt Plan](TECHNICAL_DEBT_PLAN.md) - план оптимизации
- 📝 [История изменений](../CHANGELOG.md) - что было сделано
- 🎯 [Roadmap](DEVELOPMENT_ROADMAP.md) - план развития

### Для аналитиков
- 📊 [Team Dashboard](reports/team-dashboard.md) - метрики команды
- 📈 [Automated Reports](reports/automated-reports.md) - автоотчеты
- 🕵️ [Repo Audit 10.10.2025](reports/2025-10-10-repo-audit.md) - сводка аудита
- 🔒 [Security Report](../reports/security/SECURITY.md) - безопасность
- ⚡ [Performance Report](../reports/performance/PERFORMANCE.md) - производительность

---

## 📁 Структура документации

### `/` (корень)
```
├── README.md                    # Главная страница проекта
├── CHANGELOG.md                 # История изменений (ВАЖНО!)
├── SETUP-GUIDE.md              # Руководство по установке
└── .env.example                # Пример конфигурации
```

### `/docs/` (документация)
```
docs/
├── README.md                    # Индекс документации
├── TROUBLESHOOTING_TRACKS.md    # Диагностика проблем с треками
├── ARCHITECTURE.md              # Архитектура проекта
├── PERFORMANCE_OPTIMIZATIONS.md # Оптимизация производительности
├── api/                         # API документация
│   └── API.md
└── architecture/                # Архитектурные решения
    ├── ARCHITECTURE.md
    └── OPTIMIZATION_PLAN.md
```

### `/project-management/` (управление проектом)
```
project-management/
├── README.md                    # Обзор системы управления
├── TECHNICAL_DEBT_PLAN.md       # План работ (ВАЖНО!)
├── DEVELOPMENT_ROADMAP.md       # Долгосрочный план
├── NAVIGATION_INDEX.md          # Этот файл
│
├── tasks/                       # Задачи и спринты
│   ├── current-sprint.md        # Текущий Sprint 24
│   ├── TASKS_STATUS.md          # Все задачи проекта
│   └── backlog.md               # Бэклог
│
├── reports/                     # Отчеты
│   ├── team-dashboard.md        # Дашборд команды
│   ├── automated-reports.md     # Автоматические отчеты
│   └── sprint-*/                # Отчеты по спринтам
│
└── workflows/                   # Процессы разработки
    └── development.md           # Workflow разработки
```

## 🔄 Синхронизация документации и журналов

Процесс синхронизации гарантирует, что продуктовые артефакты и техническая документация отражают одно и то же состояние проекта.

### Обновление индексов
1. После редактирования документа обновите связанные записи в `docs/INDEX.md` и в этом файле.
2. Добавьте короткое описание изменений, чтобы навигация отражала актуальный контекст.
3. Проверьте взаимные ссылки между документацией и задачами спринта.

### Обновление журналов
1. Зафиксируйте изменения в соответствующих отчётах внутри `project-management/reports`.
2. Обновите статус задач и ссылок в `project-management/tasks`.
3. Добавьте референс на инициативу или issue в первых строках отчёта.

### Контроль качества
- Выполните `npm run docs:validate` перед созданием Pull Request.
- Убедитесь, что чек-лист **Docs & Logs** в шаблоне PR отмечен и содержит результаты проверки.
- Если проверка падает, исправьте недостающие разделы или ссылки и запустите команду повторно.

### `/reports/` (аналитика)
```
reports/
├── security/                    # Безопасность
│   ├── SECURITY.md
│   └── SECURITY_AUDIT_2025.md
└── performance/                 # Производительность
    └── PERFORMANCE.md
```

### `/archive/` (архив)
```
archive/
├── README.md                    # Индекс архива
├── 2024/                        # Архив 2024
│   └── december/
└── 2025/                        # Архив 2025
    ├── january/
    └── october/                 # Октябрь 2025
        ├── sprint-19-plan.md
        ├── sprint-20-plan-initial.md
        └── WORKSPACE_UI_AUDIT_REPORT.md
```

---

## 🔍 Поиск по темам

### Генерация музыки
- [Music Generation Hook](../src/hooks/useMusicGeneration.ts)
- [API Service](../src/services/api.service.ts)
- [Edge Functions](../supabase/functions/generate-suno/)
- [Troubleshooting Guide](../docs/TROUBLESHOOTING_TRACKS.md)

### Воспроизведение треков
- [Audio Player Context](../src/contexts/AudioPlayerContext.tsx)
- [Track Versions](../src/components/tracks/TrackVersions.tsx)
- [Player Components](../src/components/player/)

### Управление треками
- [Tracks Hook](../src/hooks/useTracks.ts)
- [Track Recovery Hook](../src/hooks/useTrackRecovery.ts)
- [Track Sync Hook](../src/hooks/useTrackSync.ts)

### База данных
- [Database Schema](../supabase/migrations/)
- [RLS Policies](../docs/architecture/ARCHITECTURE.md)
- [Track Versions](../src/features/tracks/api/trackVersions.ts)

### Тестирование
- [Test Setup](../src/test/setup.ts)
- [Component Tests](../src/components/__tests__/)
- [Hook Tests](../src/hooks/__tests__/)

---

## 📊 Отчеты и метрики

### Текущие спринты
- [Sprint 24 Plan](tasks/sprint-24-plan.md) - Текущий спринт (планирование)
- [Sprint 23 Report](reports/sprint-23-report.md) - Ретроспектива завершённого спринта

### Архивные спринты
- [Sprint 19 (archived)](../archive/2025/october/sprint-19-plan.md)
- [Sprint 22 Report](reports/sprint-22-report.md)
- [Sprint 16 Summary](reports/sprint-16-summary.md)

### Технические отчеты
- [Security Audit](../reports/security/SECURITY_AUDIT_2025.md)
- [Performance Analysis](../reports/performance/PERFORMANCE.md)
- [Code Analysis](../archive/2025/january/CODE_ANALYSIS.md)

---

## 🎯 По ролям

### Product Owner / Scrum Master
1. **Планирование**:
   - [Current Sprint](tasks/current-sprint.md)
   - [Backlog](tasks/backlog.md)
   - [Roadmap](DEVELOPMENT_ROADMAP.md)

2. **Мониторинг**:
   - [Task Status](tasks/TASKS_STATUS.md)
   - [Team Dashboard](reports/team-dashboard.md)
   - [CHANGELOG](../CHANGELOG.md)

3. **Отчетность**:
   - [Sprint Reports](reports/)
   - [Automated Reports](reports/automated-reports.md)

### Tech Lead / Architect
1. **Архитектура**:
   - [Architecture Docs](../docs/architecture/ARCHITECTURE.md)
   - [Optimization Plan](../docs/architecture/OPTIMIZATION_PLAN.md)
   - [Technical Debt](TECHNICAL_DEBT_PLAN.md)

2. **Code Quality**:
   - [Performance Optimizations](../docs/PERFORMANCE_OPTIMIZATIONS.md)
   - [Security Guidelines](../reports/security/SECURITY.md)

3. **Documentation**:
   - [API Docs](../docs/api/API.md)
   - [Component Guide](../docs/COMPONENT_GUIDE.md)

### Developer
1. **Getting Started**:
   - [Setup Guide](../SETUP-GUIDE.md)
   - [Quick Reference](QUICK-REFERENCE.md)
   - [Development Workflow](workflows/development.md)

2. **Troubleshooting**:
   - [Track Issues](../docs/TROUBLESHOOTING_TRACKS.md)
   - [Common Problems](../docs/TROUBLESHOOTING_TRACKS.md#common-issues)

3. **Contributing**:
   - [Contributing Guide](CONTRIBUTING.md)
   - [Code Style](workflows/development.md)

### QA Engineer
1. **Testing**:
   - [Test Setup](../src/test/setup.ts)
   - [Testing Strategy](workflows/development.md#автоматизация-тестирования)

2. **Bug Reports**:
   - [Bug Template](CONTRIBUTING.md#bug-reports)
   - [Known Issues](tasks/TASKS_STATUS.md)

---

## 🔄 Рабочие процессы

### Новая задача
1. Добавить в [Backlog](tasks/backlog.md)
2. Оценить сложность и приоритет
3. Добавить в [Sprint Planning](tasks/current-sprint.md)

### Релиз новой версии
1. Обновить [CHANGELOG](../CHANGELOG.md)
2. Создать git tag
3. Обновить [README](../README.md) версию
4. Deploy через CI/CD

### Баг-фикс
1. Создать issue
2. Добавить в [Current Sprint](tasks/current-sprint.md)
3. Фикс → Code Review → Merge
4. Обновить [CHANGELOG](../CHANGELOG.md)

---

## 📞 Контакты и помощь

### Документация
- **Главная**: [README.md](../README.md)
- **Troubleshooting**: [TROUBLESHOOTING_TRACKS.md](../docs/TROUBLESHOOTING_TRACKS.md)
- **API**: [API.md](../docs/api/API.md)

### Поддержка
- **GitHub Issues**: [Issues](https://github.com/your-username/albert3-muse-synth-studio/issues)
- **Documentation**: [docs/](../docs/)
- **Project Management**: [project-management/](.)

---

## 🔄 Обновления этого документа

Этот навигационный индекс обновляется:
- При добавлении новых разделов документации
- При реорганизации структуры файлов
- При завершении спринтов
- По запросу команды

**Последнее крупное обновление**: 8 октября 2025 (v2.3.3)

---

<div align="center">

**Нужна помощь в навигации?** Создайте issue с меткой `documentation`

[⬆ Вернуться к началу](#-навигация-по-проекту-albert3-muse-synth-studio)

</div>
