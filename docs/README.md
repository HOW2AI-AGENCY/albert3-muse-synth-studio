# 📚 Документация Albert3 Muse Synth Studio

<div align="center">

[![Docs Update](https://github.com/your-username/albert3-muse-synth-studio/actions/workflows/docs-update.yml/badge.svg)](https://github.com/your-username/albert3-muse-synth-studio/actions/workflows/docs-update.yml)
[![CI](https://github.com/your-username/albert3-muse-synth-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/albert3-muse-synth-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

</div>

Навигация: [Главная README](../README.md) → [Индекс документации](INDEX.md) → Центр документации

## 📑 Содержание

- [📚 Документация (верх)](#top)
- [🗂️ Структура документации](#structure)
- [📖 API и интеграции](#api)
- [🚀 Развертывание и операции](#deployment)
- [🧩 Темы Sprint 24](#sprint24)
- [📱 Специализированные руководства](#special)
- [🔗 Быстрые ссылки](#quicklinks)
- [📊 Отчеты и анализ](#reports)
- [🔄 Синхронизация документации](#sync)
- [📝 Соглашения](#conventions)
- [🆘 Поддержка](#support)
- [🤝 Для контрибьюторов](#contributors)
- [🔎 SEO](#seo)
- [🆕 Актуальные обновления](#updates)

<a id="top"></a>

Добро пожаловать в центр документации проекта Albert3 Muse Synth Studio. Здесь вы найдете всю необходимую техническую информацию для разработки, развертывания и поддержки приложения.

<a id="structure"></a>
## 🗂️ Структура документации

- ### 🧭 Навигация первого уровня
- **[Индекс документации](INDEX.md)** — быстрый доступ ко всем разделам и ролям.
- **[Архитектура системы](architecture/ARCHITECTURE.md)** — взаимосвязи компонентов и инфраструктуры.
  - **[План оптимизации](architecture/OPTIMIZATION_PLAN.md)** — стратегия производительности и масштабирования.
  - **[Карта проекта](architecture/PROJECT_MAP.md)** — структура репозитория, потоки и слои.
  - **[Граф знаний](architecture/KNOWLEDGE_GRAPH.md)** — сущности и связи системы.
- **[Руководство разработчика](DEVELOPER_GUIDE.md)** — настройка окружения и процессы команды.
- **[Руководство пользователя](USER_GUIDE.md)** — сценарии работы в приложении.
- **[Реестр UI-компонентов](interface/COMPONENT_SYSTEM.md)** — сводная карта интерфейсов и правил их использования.

<a id="api"></a>
### 📖 API и интеграции
- **[API документация](api/API.md)** — эндпоинты, структуры данных и примеры использования.
- **[Suno API Audit](integrations/SUNO_API_AUDIT.md)** — история аудитов, ограничения и best practices.

<a id="deployment"></a>
### 🚀 Развертывание и операции
- **[Руководство по развертыванию](deployment/DEPLOYMENT.md)** — инструкции по деплою и чек-листы готовности.
- **[Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)** — набор практик для поддержания Core Web Vitals.
- **[Troubleshooting треков](TROUBLESHOOTING_TRACKS.md)** — частые проблемы и способы диагностики.

<a id="sprint24"></a>
### 🧩 Важные темы Sprint 24
- **Service Worker & Audio Cache** — обновлённый `public/sw.js` исключает перехват Supabase-запросов и кэширует только реальные аудиофайлы по расширениям.
- **Supabase Integration** — сервис-воркер не влияет на Supabase API/Storage/Edge Functions; используйте конфигурацию из `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
- **Logger & Logs** — централизованный логгер `src/utils/logger.ts` (уровни: `debug`, `info`, `warn`, `error`). Для диагностики используйте Console в DevTools и прикладывайте фрагменты логов к задачам.
- **Dev Server** — запускайте `npm run dev` (по умолчанию порт 5173). После обновления Service Worker выполните «Hard Reload» для очистки устаревшего кэша.

<a id="special"></a>
### 📱 Специализированные руководства
- **[Мобильная оптимизация](MOBILE_OPTIMIZATION.md)** — адаптивный дизайн и mobile UX.
- **[Система разделения на стемы](STEMS_SYSTEM.md)** — процессы генерации и хранения аудио стемов.
- **[Руководство по компонентам](COMPONENT_GUIDE.md)** — каталог UI-компонентов и кодовых примеров.
- **[Реестр интерфейсных компонентов](interface/COMPONENT_SYSTEM.md)** — ответственность и связи компонентов UI.

<a id="quicklinks"></a>
## 🔗 Быстрые ссылки

| Документ | Описание | Аудитория |
|----------|----------|-----------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Техническая архитектура | Разработчики, архитекторы |
| [API.md](api/API.md) | API справочник | Frontend/Backend разработчики |
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Инструкции по деплою | DevOps, системные администраторы |
| [OPTIMIZATION_PLAN.md](architecture/OPTIMIZATION_PLAN.md) | План оптимизации | Техлиды, менеджеры проектов |
| [MOBILE_OPTIMIZATION.md](MOBILE_OPTIMIZATION.md) | Мобильная оптимизация | Frontend разработчики, UI/UX |
| [STEMS_SYSTEM.md](STEMS_SYSTEM.md) | Система стемов | Backend/Frontend разработчики |
| [PROJECT_MAP.md](architecture/PROJECT_MAP.md) | Карта проекта | Все роли |
| [KNOWLEDGE_GRAPH.md](architecture/KNOWLEDGE_GRAPH.md) | Граф знаний | Архитекторы, аналитики |

<a id="reports"></a>
## 📊 Отчеты и анализ

- **[Репозитарный аудит 10.10.2025](../project-management/reports/2025-10-10-repo-audit.md)** — текущее состояние репозитория, процессов и документации.
- **[Полный аудит Workspace 09.10.2025](../project-management/reports/2025-10-09-workspace-audit.md)** — аудит кода, архитектуры, зависимостей, безопасности и производительности.
- **[Sprint 23 Report](../project-management/reports/sprint-23-report.md)** — ретроспектива спринта и перенос задач.
- **[Team Dashboard](../project-management/reports/team-dashboard.md)** — ключевые метрики команды.
- **[Отчет о безопасности](../reports/security/SECURITY.md)** — аудит безопасности и рекомендации.
- **[Анализ производительности](../reports/performance/PERFORMANCE.md)** — метрики Core Web Vitals и Supabase.

<a id="sync"></a>
## 🔄 Синхронизация документации

Документация и управленческие артефакты синхронизируются по единому регламенту раз в неделю или при любых значимых изменениях.

### Обновление индексов
1. Зафиксируйте изменения в профильном документе.
2. Обновите ссылки и описания в `docs/INDEX.md` и `project-management/NAVIGATION_INDEX.md`.
3. Убедитесь, что новые материалы добавлены в соответствующие таблицы и разделы навигации.

### Ведение журналов
1. Отразите изменения в отчётах спринтов или тематических журналах внутри `project-management/reports`.
2. Добавьте короткий changelog в связанных рабочих файлах (например, в задачах спринта).
3. Свяжите обновления с номером задачи или инициативы в первом абзаце документа.

### Автоматическая проверка
- Запустите `npm run docs:validate`, чтобы проверить наличие обязательных разделов и целостность ссылок.
- При необходимости исправьте ошибки, повторно выполните команду и приложите результат к описанию PR.
- Обновите чек-лист **Docs & Logs** в шаблоне Pull Request перед отправкой на ревью.

<a id="conventions"></a>
## 📝 Соглашения

- Используйте **русский язык** для всей документации
- Следуйте **Markdown** стандартам
- Добавляйте **эмодзи** для улучшения читаемости
- Включайте **диаграммы Mermaid** для визуализации архитектуры
- Предоставляйте **примеры кода** с комментариями

<a id="support"></a>
## 🆘 Поддержка

Если у вас есть вопросы по документации:

1. Проверьте [FAQ](../README.md#-поддержка)
2. Создайте [Issue](https://github.com/your-username/albert3-muse-synth-studio/issues)
3. Обратитесь к команде разработки

<a id="contributors"></a>
## 🤝 Для контрибьюторов

- Ознакомьтесь с [руководством по участию](../project-management/CONTRIBUTING.md) и общими процессами в [Developer Control Center](DEVELOPER_DASHBOARD.md).
- Перед PR запускайте: `npm run lint`, `npm run typecheck`, `npm run docs:validate`.
- Описывайте изменения в заголовке и первом абзаце PR, добавляйте ссылки на задачи из `project-management/tasks/current-sprint.md`.
- Для документации поддерживайте оглавления `docs/INDEX.md` и `project-management/NAVIGATION_INDEX.md` в актуальном состоянии.
- Используйте шаблон PR с чек-листом **Docs & Logs** и ссылками на отчёты.

### Визуализация прогресса

- Доска статусов: `project-management/tasks/STATUS_DASHBOARD.md` (активные/ожидающие/завершённые инициативы).
- GitHub Projects: `https://github.com/your-username/albert3-muse-synth-studio/projects` (обзор по колонкам и приоритетам).

<a id="seo"></a>
## 🔎 SEO

- Ключевые слова: `Suno AI Docs`, `Supabase Edge Functions Docs`, `AI Music Generation`, `Generate Suno`, `Get Balance`, `React`, `TypeScript`, `Audio Player`, `Workspace`, `Developer Guide`.
- Внутренняя навигация: `INDEX.md`, `api/API.md`, `integrations/SUNO_API_AUDIT.md`, `architecture/ARCHITECTURE.md`, `deployment/DEPLOYMENT.md`, `interface/COMPONENT_SYSTEM.md`, `DEVELOPER_DASHBOARD.md`.
- Перелинковка: добавляйте контекстные ссылки между руководствами (User/Developer), API и отчётами (`project-management/reports`).

---

<a id="updates"></a>
### 🆕 Актуальные обновления (13 октября 2025)

- Проведён ревью компонентов интерфейса и добавлен отдельный реестр с правилами использования.
- Синхронизированы индексы документации, план развития и навигация проекта для Sprint 24 (неделя 0).
- Уточнены указания по логированию и проверке документации (`npm run docs:validate`) в рамках задачи DOC-002.

**Последнее обновление**: 13 октября 2025
**Версия документации**: 1.8.0
