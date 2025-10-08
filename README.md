# 🎵 Albert3 Muse Synth Studio

<div align="center">

![Albert3 Logo](src/assets/logo.png)

**Профессиональная студия для создания музыки с использованием ИИ**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Версия:** 2.3.3 | **Статус:** Активная разработка | **Sprint:** 20 - System Reliability

[🚀 Демо](http://localhost:5173) • [📖 Документация](#-документация) • [🛠️ Установка](#️-установка) • [🎯 Функции](#-основные-функции)

</div>

---

## 🧭 Навигация по репозиторию

<table>
<tr>
<td width="50%">

### 📚 **Документация**
- [📖 Основная документация](docs/README.md)
- [🏗️ Архитектура системы](docs/architecture/ARCHITECTURE.md)
- [🔌 API документация](docs/api/API.md)
- [⚡ Оптимизация производительности](docs/PERFORMANCE_OPTIMIZATIONS.md)
- [🔧 Troubleshooting треков](docs/TROUBLESHOOTING_TRACKS.md)
- [📱 Мобильная оптимизация](docs/MOBILE_OPTIMIZATION.md)

</td>
<td width="50%">

### 📋 **Управление проектом**
- [📝 Текущий спринт](project-management/tasks/current-sprint.md)
- [📋 Бэклог задач](project-management/tasks/backlog.md)
- [🔧 Технический долг](project-management/TECHNICAL_DEBT_PLAN.md)
- [📝 История изменений](CHANGELOG.md)
- [🚀 План развития](project-management/DEVELOPMENT_ROADMAP.md)

</td>
</tr>
<tr>
<td width="50%">

### 🛠️ **Для разработчиков**
- [⚙️ Руководство по установке](SETUP-GUIDE.md)
- [🤝 Руководство по участию](project-management/CONTRIBUTING.md)
- [📋 Быстрый справочник](project-management/QUICK-REFERENCE.md)
- [🔄 Рабочие процессы](project-management/workflows/development.md)

</td>
<td width="50%">

### 📊 **Отчеты**
- [📈 Аналитика проекта](project-management/reports/README.md)
- [🔒 Безопасность](reports/security/SECURITY.md)
- [⚡ Производительность](reports/performance/PERFORMANCE.md)
- [🗂️ Архив](archive/README.md)

</td>
</tr>
</table>

---

## 📋 Описание проекта

**Albert3 Muse Synth Studio** — это современное веб-приложение для создания музыки с использованием искусственного интеллекта. Платформа предоставляет пользователям мощные инструменты для генерации музыки, создания текстов песен, разделения аудио на стемы и управления музыкальными проектами.

### 🎯 Основные функции

Albert3 Muse Synth Studio предлагает следующие возможности:

- 🎼 **Генерация музыки с ИИ** — создание треков по текстовому описанию через Suno AI
- 📝 **Создание текстов песен** — автоматическая генерация лирики с помощью ИИ
- 🎚️ **Разделение на стемы** — извлечение отдельных инструментов из трека
- 🎵 **Управление треками** — организация, версионирование и каталогизация музыки
- 👥 **Система пользователей** — регистрация, аутентификация через Supabase Auth
- 📊 **Аналитика прослушиваний** — отслеживание взаимодействий и популярности
- 💾 **Облачное хранение** — безопасное сохранение в Supabase Storage
- 🎧 **Продвинутый аудиоплеер** — с поддержкой плейлистов и управления
- 🔄 **Автоматическое восстановление** — застрявшие треки автоматически переотправляются
- 🎨 **Современный UI/UX** — адаптивный дизайн с темной/светлой темой
- 📱 **Полностью адаптивный дизайн** — оптимизированный интерфейс для мобильных, планшетов и десктопов

### ✨ Последние обновления (v2.3.3)

- ✅ **Автоматическое восстановление треков** - застрявшие треки в pending автоматически переотправляются
- ✅ **Исправлено воспроизведение версий** - версии треков теперь корректно воспроизводятся
- ✅ **Исправлены мобильные ошибки** - устранена ошибка "Аудио недоступно" при первом клике
- ✅ **Улучшенная обработка ошибок** - детальная диагностика и автоматический retry
- ✅ **Comprehensive troubleshooting guide** - документация по диагностике проблем

## 🏗️ Архитектура

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React App] --> B[UI Components]
        A --> C[State Management]
        A --> D[Audio Player]
        A --> SW[Service Worker]
    end
    
    subgraph "Caching Layer"
        SW --> AC[Audio Cache]
        SW --> CC[Component Cache]
    end
    
    subgraph "API Layer"
        E[Supabase Client] --> F[Authentication]
        E --> G[Database]
        E --> H[Edge Functions]
    end
    
    subgraph "AI Services"
        I[Suno AI] --> J[Music Generation]
        K[Replicate] --> L[Stem Separation]
        M[Custom AI] --> N[Lyrics Generation]
    end
    
    A --> E
    H --> I
    H --> K
    H --> M
    D --> SW
    
    subgraph "Storage"
        O[(PostgreSQL)]
        P[File Storage]
    end
    
    G --> O
    E --> P
    AC --> P
```

## 🛠️ Технологический стек

### Frontend
- **React 18** — современная библиотека для UI с Concurrent Features
- **TypeScript 5.x** — типизированный JavaScript для надежности кода
- **Vite 6.x** — молниеносный сборщик проектов нового поколения
- **Tailwind CSS 3.x** — utility-first CSS фреймворк
- **Radix UI** — доступные и настраиваемые UI компоненты
- **TanStack Query** — мощное управление серверным состоянием

### Backend & Infrastructure
- **Supabase** — полнофункциональная Backend-as-a-Service платформа
- **PostgreSQL** — надежная реляционная база данных
- **Supabase Edge Functions** — серверные функции на Deno Runtime
- **Supabase Storage** — масштабируемое файловое хранилище
- **Row Level Security (RLS)** — безопасность на уровне строк БД

### AI & External Services
- **Suno AI API** — профессиональная генерация музыки
- **Replicate API** — разделение аудио на стемы через ML модели
- **Custom AI Models** — создание текстов песен и улучшение промптов

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js** 18+ ([установить с nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- **npm** 9+ или **yarn** 1.22+
- **Git** для клонирования репозитория
- **Аккаунт Supabase** для backend сервисов

### Установка

1. **Клонирование репозитория**
```bash
git clone https://github.com/your-username/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio
```

2. **Установка зависимостей**
```bash
npm install
```

3. **Настройка переменных окружения**
```bash
cp .env.example .env
```

Заполните `.env` файл своими данными:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

4. **Запуск в режиме разработки**
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

### Дополнительные команды

```bash
# Сборка для продакшена
npm run build

# Предварительный просмотр сборки
npm run preview

# Проверка кода с ESLint
npm run lint

# Тесты
npm run test
```

## 📁 Структура проекта

```
albert3-muse-synth-studio/
├── 📁 src/                      # Исходный код
│   ├── components/              # React компоненты
│   │   ├── ui/                  # UI компоненты (shadcn)
│   │   ├── player/              # Аудиоплеер
│   │   ├── tracks/              # Управление треками
│   │   └── workspace/           # Workspace компоненты
│   ├── hooks/                   # Кастомные хуки
│   │   ├── useTrackRecovery.ts  # Автовосстановление треков
│   │   ├── useTracks.ts         # Управление треками
│   │   └── useMusicGeneration.ts # Генерация музыки
│   ├── contexts/                # React Context
│   │   └── AudioPlayerContext.tsx # Контекст плеера
│   ├── services/                # API сервисы
│   │   ├── api.service.ts       # Основной API
│   │   ├── analytics.service.ts # Аналитика
│   │   └── likes.service.ts     # Лайки
│   ├── pages/                   # Страницы приложения
│   │   └── workspace/           # Workspace страницы
│   └── utils/                   # Утилиты
│
├── 📁 docs/                     # Документация
│   ├── TROUBLESHOOTING_TRACKS.md # Диагностика треков
│   ├── architecture/            # Архитектурные документы
│   └── api/                     # API документация
│
├── 📁 project-management/       # Управление проектом
│   ├── tasks/                   # Задачи и спринты
│   │   ├── current-sprint.md    # Текущий спринт
│   │   └── backlog.md           # Бэклог
│   ├── TECHNICAL_DEBT_PLAN.md   # План по техдолгу
│   └── reports/                 # Отчеты
│
├── 📁 supabase/                 # Supabase конфигурация
│   ├── functions/               # Edge Functions
│   ├── migrations/              # Миграции БД
│   └── config.toml             # Конфигурация
│
└── 📁 archive/                  # Архивные файлы
    ├── 2024/                    # Архив 2024
    └── 2025/                    # Архив 2025
```

## 📊 Текущий статус проекта

### Sprint 20 Progress

**Завершенные задачи**:
- ✅ GEN-001: Production-Ready Generation
- ✅ GEN-002: Track Versions System  
- ✅ STOR-001: Storage System
- ✅ BUGFIX-001: Critical Playback Issues
- ✅ BUGFIX-002: Track Versions Architecture
- ✅ BUGFIX-003: Track Generation & Playback Issues

**Метрики**:
- Completion rate: 100% (6/6 задач)
- Total hours: 38.5 hours
- Version: 2.3.3

## 🤝 Вклад в проект

Мы приветствуем вклад сообщества! См. [руководство по участию](project-management/CONTRIBUTING.md) для деталей.

### Как внести вклад

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл LICENSE для деталей.

## 👥 Команда

- **Product Owner**: AI Assistant
- **Lead Developer**: AI Assistant
- **Architecture**: AI Assistant

## 📞 Поддержка

- **Issues**: [GitHub Issues](https://github.com/your-username/albert3-muse-synth-studio/issues)
- **Documentation**: [docs/](docs/)
- **Troubleshooting**: [TROUBLESHOOTING_TRACKS.md](docs/TROUBLESHOOTING_TRACKS.md)

---

<div align="center">

**Создано с ❤️ используя React, TypeScript, Supabase и ИИ**

[⬆ Вернуться к началу](#-albert3-muse-synth-studio)

</div>
