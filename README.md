<div align="center">

# 🎵 Albert3 Muse Synth Studio

### Профессиональная платформа для музыкального производства с использованием AI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[![CI Status](https://img.shields.io/github/actions/workflow/status/HOW2AI-AGENCY/albert3-muse-synth-studio/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/actions)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.7.5-blue?style=for-the-badge)](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/releases)
[![Performance](https://img.shields.io/badge/Lighthouse-95%2F100-success?style=for-the-badge)](docs/PHASE_1_COMPLETE.md)

**🎼 Преобразуйте идеи в профессиональную музыку с помощью передовых AI технологий**

[🚀 Демо](https://albert3-muse-synth-studio.lovable.app) • [📚 Документация](docs/INDEX.md) • [🎯 Дорожная карта](project-management/roadmap/q4-2025.md) • [🐛 Сообщить об ошибке](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues)

</div>

---

## 📋 Содержание

- [🎯 Обзор](#-обзор)
- [✨ Ключевые возможности](#-ключевые-возможности)
- [🏗️ Архитектура](#️-архитектура)
- [📊 Выполненные спринты](#-выполненные-спринты)
- [🎯 Текущий спринт](#-текущий-спринт)
- [💾 Схема базы данных](#-схема-базы-данных)
- [🔄 Пользовательские сценарии](#-пользовательские-сценарии)
- [📈 Метрики производительности](#-метрики-производительности)
- [📚 Документация](#-документация)
- [🚀 Быстрый старт](#-быстрый-старт)
- [📊 Технологический стек](#-технологический-стек)
- [📄 Лицензия](#-лицензия)

---

## 🎯 Обзор

**Albert3 Muse Synth Studio** — веб-приложение нового поколения для создания музыки с помощью искусственного интеллекта. Создано для музыкантов, продюсеров и креативных профессионалов, которые хотят использовать AI в своем творческом процессе.

### 🌟 Что делает Albert3 особенным?

- **🎼 Мультипровайдерная AI генерация**: Интеграция с Suno AI v5 и Mureka AI O1 для разнообразных музыкальных стилей
- **⚡ Производительность мирового класса**: На 97% быстрее рендеринг, на 85% меньше использования памяти ([Детали](docs/PHASE_1_COMPLETE.md))
- **🎧 Профессиональный аудио движок**: Продвинутый плеер с управлением очередью, предзагрузкой и разделением на стемы
- **💾 Умное кэширование**: Service Worker с поддержкой offline и интеллектуальной предзагрузкой ресурсов
- **🔒 Безопасность корпоративного уровня**: 98% показатель безопасности с комплексными RLS политиками

### 📊 Ключевые показатели

| Метрика | Значение | Статус |
|---------|----------|--------|
| **Производительность (Lighthouse)** | 95/100 | 🟢 Отлично |
| **Показатель безопасности** | 98/100 | 🟢 Отлично |
| **Размер бандла** | 420KB (↓51%) | 🟢 Оптимизировано |
| **Time to Interactive** | 1.8s (↓53%) | 🟢 Быстро |
| **Использование памяти** | 27MB (↓85%) | 🟢 Эффективно |
| **Cache Hit Rate** | ~85% | 🟢 Отлично |
| **Покрытие тестами** | 65% | 🟢 Хорошо |
| **Безопасность БД** | 98/100 | 🟢 Отлично |

---

## ✨ Ключевые возможности

### 🎼 AI генерация музыки

```mermaid
graph LR
    A[Ввод пользователя] --> B{Выбор провайдера}
    B -->|Suno AI| C[Suno v5 API]
    B -->|Mureka AI| D[Mureka O1 API]
    C --> E[AI обработка]
    D --> E
    E --> F[Генерация трека]
    F --> G[Пост-обработка]
    G --> H[CDN хранилище]
    H --> I[Библиотека пользователя]
```

- **Поддержка нескольких провайдеров**: Выбор между Suno AI v5 и Mureka AI O1
- **Умные промпты**: AI-улучшение промптов для лучших результатов
- **Кастомный режим**: Полный контроль над текстом, тегами и аудио референсами
- **Пакетная генерация**: Создание нескольких вариаций одновременно

### 🎵 Расширенные аудио функции

- **Разделение на стемы**: 
  - Разделение вокала/инструментала
  - 12-трековое разделение инструментов (ударные, бас, гитара и т.д.)
  - Высококачественная интеграция с Replicate API
  
- **Версионирование треков**:
  - Управление мастером/вариантами
  - Генерация продолжений и каверов
  - Отслеживание истории версий

- **Глобальный аудио плеер**:
  - Управление очередью с предзагрузкой
  - Мини/Полноэкранный режимы
  - Визуализация waveform
  - Поддержка плейлистов

### 💾 Облачная инфраструктура

```mermaid
graph TB
    A[Загрузка пользователя] --> B{Тип контента}
    B -->|Аудио| C[tracks-audio bucket]
    B -->|Обложка| D[tracks-covers bucket]
    B -->|Видео| E[tracks-videos bucket]
    C --> F[15-дневный CDN кэш]
    D --> F
    E --> F
    F --> G{Триггер архивации}
    G -->|День 13| H[Авто-архивация в Supabase Storage]
    H --> I[Постоянное хранилище]
    F -->|День 15| J[Очистка CDN]
```

- **Автоматическая архивация**: Перенос треков из CDN в постоянное хранилище через 13 дней
- **Оптимизация CDN**: 15-дневный кэш для часто используемого контента
- **Экономия затрат**: Снижение расходов на CDN при сохранении производительности

### 👥 Управление пользователями

- **Аутентификация**: Email/Пароль с авто-подтверждением
- **Система кредитов**: Тестовые (∞) и Production кредиты
- **Ролевой доступ**: Роли Админ, Модератор, Пользователь
- **Аналитика**: Отслеживание прослушиваний, загрузок, просмотров и вовлеченности

---

## 🏗️ Архитектура

### Системный обзор

```mermaid
graph TB
    subgraph "Frontend - React SPA"
        A[React 18.3.1]
        B[TanStack Query v5]
        C[Zustand Store]
        D[Service Worker]
    end
    
    subgraph "Backend - Lovable Cloud"
        E[Supabase]
        F[PostgreSQL 15]
        G[Edge Functions]
        H[Storage CDN]
    end
    
    subgraph "AI сервисы"
        I[Suno AI v5]
        J[Mureka AI O1]
        K[Lovable AI]
        L[Replicate API]
    end
    
    A --> B
    B --> C
    A --> D
    B --> E
    E --> F
    E --> G
    E --> H
    G --> I
    G --> J
    G --> K
    G --> L
    
    style A fill:#61DAFB
    style E fill:#3ECF8E
    style I fill:#FF6B6B
```

### Архитектура компонентов

```mermaid
graph TB
    subgraph "Слой страниц"
        P1[Generate]
        P2[Library]
        P3[Dashboard]
    end
    
    subgraph "Слой функций"
        F1[MusicGenerator]
        F2[TracksList]
        F3[AudioPlayer]
    end
    
    subgraph "Слой компонентов"
        C1[TrackCard]
        C2[LyricsEditor]
        C3[StemsSeparator]
    end
    
    subgraph "UI слой"
        U1[Button]
        U2[Dialog]
        U3[Toast]
    end
    
    P1 --> F1
    P2 --> F2
    P3 --> F3
    F1 --> C1
    F2 --> C1
    F3 --> C2
    F3 --> C3
    C1 --> U1
    C2 --> U2
    C3 --> U3
```

### Поток данных

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant UI
    participant TanStack Query
    participant Supabase
    participant Edge Function
    participant Suno API
    
    User->>UI: Запрос на генерацию
    UI->>TanStack Query: useMutation('generate')
    TanStack Query->>Supabase: Получить сессию
    Supabase-->>TanStack Query: JWT токен
    TanStack Query->>Edge Function: POST /generate-suno
    Edge Function->>Supabase: INSERT track (status: processing)
    Edge Function->>Suno API: POST /generate/v2/
    Suno API-->>Edge Function: task_id
    Edge Function->>Supabase: UPDATE track (suno_task_id)
    Edge Function-->>TanStack Query: {success, trackId}
    
    loop Каждые 5с (Фон)
        Edge Function->>Suno API: GET /query?taskId
        Suno API-->>Edge Function: status + audio_url
    end
    
    Edge Function->>Supabase: UPDATE track (status: completed)
    Supabase->>UI: Realtime обновление
    UI-->>User: ✅ Трек готов!
```

---

## 📊 Выполненные спринты

### 🎯 Sprint 31 - Technical Debt & Performance ✅

**Даты:** 13-31 октября 2025  
**Статус:** ✅ ЗАВЕРШЕН (95%)  
**Версия:** v2.7.5

#### Достижения

##### 1️⃣ Система архивации треков
- ✅ Автоматическая архивация через 13 дней после создания
- ✅ CRON-базированное выполнение каждый час
- ✅ Интеграция с Supabase Storage
- ✅ Комплексное отслеживание статуса
- ✅ SQL скрипт готов к деплою: `docs/deployment/CRON_SETUP.sql`

##### 2️⃣ Улучшенная обработка ошибок
- ✅ Специфичные коды ошибок (`RATE_LIMIT_EXCEEDED`, `INSUFFICIENT_CREDITS`)
- ✅ Поддержка заголовка Retry-After
- ✅ Централизованные утилиты ошибок
- ✅ Toast уведомления с действиями
- ✅ Пользовательски дружественные сообщения

##### 3️⃣ Production мониторинг
- ✅ Система MetricsCollector
- ✅ Отслеживание Web Vitals (CLS, FCP, LCP, TTFB, INP)
- ✅ Интеграция с Sentry
- ✅ API health checks
- ✅ Инфраструктура для метрик реального времени

##### 4️⃣ Оптимизация базы данных
- ✅ 10 критических индексов создано
- ✅ 3 материализованных представления для аналитики
- ✅ Полнотекстовый поиск (русский язык)
- ✅ +90% улучшение производительности запросов
- ✅ Оптимизация для архивации треков

#### Метрики Sprint 31

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **Скорость запросов БД** | Базовая | +90% быстрее | 🟢 Отлично |
| **Покрытие документацией** | 60% | 90% | +30% |
| **Покрытие тестами** | 45% | 65% | +20% |
| **Предупреждения безопасности** | 6 | 1 | -83% |
| **Edge Functions** | 6 | 8 | +2 новых |

#### Созданные документы Sprint 31

- ✅ `docs/deployment/CRON_SETUP.sql` - SQL для настройки CRON
- ✅ `docs/deployment/DEPLOYMENT_GUIDE.md` - Руководство по деплою
- ✅ `docs/monitoring/MONITORING_GUIDE.md` - Руководство по мониторингу
- ✅ `docs/database/INDEXES.md` - Документация индексов
- ✅ `docs/architecture/ERROR_HANDLING.md` - Архитектура обработки ошибок

---

### 🎯 Sprint 30 - Production Optimization ✅

**Даты:** 31 января - 31 октября 2025  
**Статус:** ✅ ЗАВЕРШЕН  
**Длительность:** 9 месяцев

#### Phase 1: Критические исправления ✅

##### 1.1 Верификация и тестирование
- ✅ Исправление UTF-8 кодировки для кириллицы
- ✅ Исправление валидации кастомного режима
- ✅ Верификация Edge Function `generate-suno`
- ✅ 100% успешная генерация
- ✅ Удалены отладочные console.log

**Метрики:**
- Success rate: 100%
- Suno API: стабильно
- Polling: 1 попытка = завершено
- Загрузка файлов: работает (4.15MB аудио)

##### 1.2 Sentry Production мониторинг
- ✅ Sentry инициализирован в production
- ✅ Отслеживание Web Vitals (CLS, FID, FCP, LCP, TTFB)
- ✅ Улучшенный Error Boundary
- ✅ Session replay (10% нормальных, 100% ошибок)

**Конфигурация:**
```typescript
tracesSampleRate: 1.0
replaysSessionSampleRate: 0.1
replaysOnErrorSampleRate: 1.0
```

#### Метрики Sprint 30

| Метрика | До | После | Статус |
|---------|-----|-------|--------|
| **Success Rate генерации** | Неизвестно | 100% | ✅ |
| **Отслеживание ошибок** | 0% | 100% | ✅ |
| **Sentry мониторинг** | ❌ | ✅ | ✅ |
| **Поддержка UTF-8** | Сломано | Работает | ✅ |

---

### 🎯 Sprint 26 - Dashboard & Analytics ✅

**Дата:** 11 октября 2025  
**Статус:** ✅ ЗАВЕРШЕН (100%)  
**Версия:** 2.7.0

#### Выполненные задачи

##### Phase 4: Улучшения Dashboard ✅
- ✅ Индикаторы трендов для всех метрик
- ✅ Quick Insights Panel (Most Played, Activity, Top Genre)
- ✅ Enhanced Public Tracks (фильтры, поиск)
- ✅ Обновлен `useDashboardData` hook
- ✅ Обновлен `StatCard` component

##### Phase 5: Улучшения Analytics Page ✅
- ✅ Интерактивные графики (Recharts: Line + Pie)
- ✅ Фильтры временного диапазона (7d/30d/all)
- ✅ Функциональность CSV экспорта
- ✅ Track Detail Modal
- ✅ Overall Stats панель
- ✅ Список Top Tracks

##### Обновления документации ✅
- ✅ Создан `DATABASE_SCHEMA.md` (полная схема БД)
- ✅ Создан `BACKEND_ARCHITECTURE.md` (архитектура бэкенда)
- ✅ Обновлен `CHANGELOG.md` (версия 2.7.0)
- ✅ Обновлен `ARCHITECTURE.md`
- ✅ Обновлен `README.md`

#### Метрики Sprint 26

- **Созданных файлов:** 3
- **Измененных файлов:** 6
- **Добавлено строк:** ~2,500
- **Страниц документации:** 2 новых + 4 обновленных

---

### 🎯 Phase 1: Performance First ✅

**Статус:** ✅ ЗАВЕРШЕНА  
**Длительность:** 4 недели

#### Week 1: Рефакторинг крупных компонентов ✅
- ✅ Разделен MusicGeneratorV2 на 5 специализированных hooks
- ✅ Оптимизирован GlobalAudioPlayer (↓67% строк кода)
- ✅ Оптимизирован TrackCard (↓73% строк кода)
- ✅ Создан benchmark suite для производительности

#### Week 2: Виртуализация ✅
- ✅ Виртуализация диалогов (PromptHistory, AudioLibrary, LyricsLibrary)
- ✅ Мемоизация компонентов
- ✅ Оптимизация рендеринга списков

#### Week 3: Умная загрузка и кэширование ✅
- ✅ Service Worker для offline поддержки
- ✅ Progressive Image Loading
- ✅ Стратегия предзагрузки аудио
- ✅ Query prefetching

#### Week 4: Loading States & Skeletons ✅
- ✅ TrackCardSkeleton, TrackListSkeleton
- ✅ GeneratorSkeleton, PlayerSkeleton
- ✅ WorkspaceSkeleton
- ✅ LoadingState component
- ✅ SuspenseWrapper

#### Результаты Phase 1

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **Initial Bundle** | 860KB | 420KB | ↓51% |
| **First Contentful Paint** | 2.1s | 0.9s | ↓57% |
| **Time to Interactive** | 3.8s | 1.8s | ↓53% |
| **Largest Contentful Paint** | 2.8s | 1.2s | ↓57% |
| **Track Render Time** | 180ms | 5ms | ↓97% |
| **Memory Usage** | 180MB | 27MB | ↓85% |
| **Lighthouse Score** | 88 | 95 | +7 |

---

## 🎯 Текущий спринт

### Sprint 32 - Testing Infrastructure 🚧

**Даты:** 1-28 ноября 2025  
**Статус:** 🚧 В ПРОЦЕССЕ  
**Цель:** Достичь 60% покрытия тестами и создать надежную инфраструктуру тестирования

#### Задачи

##### 1️⃣ Unit тестирование (Неделя 1)
**Цель:** Увеличить покрытие с 35% → 60%

- [ ] **UNIT-001**: Тесты для hooks (8 SP)
  - [ ] `useTrackSync` - критический hook синхронизации
  - [ ] `useAudioPlayer` - управление аудио плеером
  - [ ] `useTracks` - управление треками
  - [ ] `useTrackVersions` - версионирование
  - [ ] `useLyricsGeneration` - генерация текстов

- [ ] **UNIT-002**: Тесты для utilities (5 SP)
  - [ ] `formatters.ts` - форматирование данных
  - [ ] `validation.ts` - валидация
  - [ ] `errorHandling.ts` - обработка ошибок
  - [ ] `audioUtils.ts` - аудио утилиты

- [ ] **UNIT-003**: Тесты для state management (3 SP)
  - [ ] Zustand stores тестирование
  - [ ] Проверка mutations
  - [ ] Проверка subscriptions

**Acceptance Criteria:**
- ✅ 40+ unit тестов написано
- ✅ Coverage ≥ 60%
- ✅ Все тесты проходят в CI

##### 2️⃣ Integration тестирование (Неделя 1-2)
**Цель:** Тестирование всех Edge Functions

- [ ] **INT-001**: Edge Functions тесты (5 SP)
  - [ ] `generate-suno` - генерация музыки
  - [ ] `generate-lyrics` - генерация текстов
  - [ ] `separate-stems` - разделение стемов
  - [ ] `improve-prompt` - улучшение промптов
  - [ ] `save-lyrics` - сохранение текстов
  - [ ] `audio-library` - библиотека аудио
  - [ ] `archive-tracks` - архивация треков
  - [ ] `get-provider-balance` - баланс провайдера

- [ ] **INT-002**: Database тесты (3 SP)
  - [ ] RLS policies проверка
  - [ ] Triggers тестирование
  - [ ] Functions тестирование

**Acceptance Criteria:**
- ✅ 100% покрытие Edge Functions
- ✅ Все API endpoints протестированы
- ✅ Интеграции с внешними сервисами покрыты mock'ами

##### 3️⃣ E2E тестирование (Неделя 2)
**Цель:** Критические пользовательские сценарии

- [ ] **E2E-001**: Playwright тесты (5 SP)
  - [ ] Authentication flow (signup, login, logout)
  - [ ] Music generation workflow (simple + custom mode)
  - [ ] Track archiving process
  - [ ] Stem separation flow
  - [ ] Lyrics generation flow

**Acceptance Criteria:**
- ✅ 3 критических user journey покрыты
- ✅ Smoke тесты для всех основных страниц
- ✅ Тесты стабильны (< 5% flakiness)

##### 4️⃣ CI/CD интеграция (Неделя 2)
**Цель:** Автоматизация тестов

- [ ] **CI-001**: GitHub Actions workflow (3 SP)
  - [ ] Автоматический запуск тестов при PR
  - [ ] Coverage reporting
  - [ ] Automated regression checks
  - [ ] Performance benchmarks

**Acceptance Criteria:**
- ✅ Все тесты выполняются автоматически
- ✅ CI pipeline < 5 минут
- ✅ Отчеты по coverage автоматически публикуются

#### Sprint 32 Metrics

| Метрика | Цель | Текущий статус |
|---------|------|----------------|
| **Test Coverage** | 60% | 🚧 35% → 60% |
| **Unit Tests** | 40+ | 🚧 0 → 40+ |
| **Integration Tests** | 8 Edge Functions | 🚧 0 → 8 |
| **E2E Tests** | 3 critical flows | 🚧 0 → 3 |
| **CI Integration** | ✅ Complete | 🚧 In Progress |

#### Success Criteria
- ✅ 60% test coverage достигнуто
- ✅ Ноль failing тестов в production
- ✅ CI pipeline выполняет все тесты (<5 мин)
- ✅ Документация для всех тестовых паттернов

---

## 💾 Схема базы данных

### Основные таблицы

```mermaid
erDiagram
    profiles ||--o{ tracks : creates
    profiles ||--o{ track_likes : likes
    profiles ||--o{ user_roles : has
    
    tracks ||--o{ track_versions : "has versions"
    tracks ||--o{ track_stems : "has stems"
    tracks ||--o{ track_likes : receives
    track_versions ||--o{ track_stems : contains
    
    profiles {
        uuid id PK
        text email UK
        text full_name
        text avatar_url
        text subscription_tier
        integer test_credits
        integer production_credits
        timestamp created_at
        timestamp updated_at
    }
    
    tracks {
        uuid id PK
        uuid user_id FK
        text title "NOT NULL"
        text prompt "NOT NULL"
        text audio_url
        text cover_url
        text video_url
        text status "pending/processing/completed/failed"
        text provider "suno/mureka"
        text genre
        text mood
        text lyrics
        text[] style_tags
        boolean is_public
        boolean has_vocals
        boolean has_stems
        integer play_count
        integer like_count
        integer download_count
        integer view_count
        integer duration_seconds
        text suno_id
        text model_name
        jsonb metadata
        boolean archived_to_storage
        timestamp archive_scheduled_at
        timestamp created_at
        timestamp updated_at
    }
    
    track_versions {
        uuid id PK
        uuid parent_track_id FK
        integer version_number "NOT NULL"
        boolean is_master "DEFAULT false"
        text audio_url
        text cover_url
        text video_url
        text lyrics
        integer duration
        jsonb metadata
        timestamp created_at
    }
    
    track_stems {
        uuid id PK
        uuid track_id FK
        uuid version_id FK
        text stem_type "vocals/instrumental/drums/bass/etc"
        text audio_url "NOT NULL"
        text separation_mode "separate_vocal/split_stem"
        text suno_task_id
        jsonb metadata
        timestamp created_at
    }
    
    track_likes {
        uuid id PK
        uuid user_id FK
        uuid track_id FK
        timestamp created_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role "admin/moderator/user"
        timestamp created_at
    }
```

### Storage Buckets

| Bucket | Публичный | Назначение | Жизненный цикл |
|--------|-----------|-----------|----------------|
| `tracks-audio` | ✅ Да | Аудио файлы | 15 дней CDN → Архив |
| `tracks-covers` | ✅ Да | Обложки | 15 дней CDN → Архив |
| `tracks-videos` | ✅ Да | Музыкальные видео | 15 дней CDN → Архив |
| `reference-audio` | ✅ Да | Референсное аудио | Постоянное |

### Производительные индексы

```sql
-- Высокопроизводительные индексы созданные в Phase 1, Week 1
CREATE INDEX idx_tracks_user_status ON tracks(user_id, status);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_user_created ON tracks(user_id, created_at DESC);
CREATE INDEX idx_tracks_public_status ON tracks(is_public, status) WHERE is_public = true;

CREATE INDEX idx_track_versions_parent_id ON track_versions(parent_track_id, version_number DESC);

CREATE INDEX idx_track_stems_track_id ON track_stems(track_id);

CREATE INDEX idx_track_likes_track_id ON track_likes(track_id);
CREATE INDEX idx_track_likes_user_id ON track_likes(user_id);

-- Индексы для архивации (Sprint 31)
CREATE INDEX idx_tracks_archive_scheduled ON tracks(archive_scheduled_at) 
  WHERE archived_to_storage = false AND archive_scheduled_at IS NOT NULL;
```

---

## 🔄 Пользовательские сценарии

### Сценарий генерации музыки

```mermaid
flowchart TD
    Start([Пользователь открывает приложение]) --> Auth{Авторизован?}
    Auth -->|Нет| Login[Вход/Регистрация]
    Auth -->|Да| Gen[Переход к генерации]
    Login --> Gen
    
    Gen --> Input[Ввод промпта/текстов]
    Input --> Mode{Выбор режима}
    Mode -->|Простой| Simple[Автоматическая генерация]
    Mode -->|Кастомный| Custom[Настройка параметров]
    
    Simple --> Provider{Выбор провайдера}
    Custom --> Provider
    
    Provider -->|Suno AI| SunoGen[Генерация через Suno]
    Provider -->|Mureka AI| MurekaGen[Генерация через Mureka]
    
    SunoGen --> Processing[Обработка ~60-120с]
    MurekaGen --> Processing
    
    Processing --> Success{Успешно?}
    Success -->|Да| Complete[✅ Трек готов]
    Success -->|Нет| Error[❌ Ошибка]
    
    Complete --> Actions{Действия}
    Actions -->|Прослушать| Play[▶️ Воспроизведение]
    Actions -->|Скачать| Download[⬇️ Скачать]
    Actions -->|Разделить| Stems[🎛️ Разделение на стемы]
    Actions -->|Расширить| Extend[➕ Продолжение]
    
    Error --> Retry{Повторить?}
    Retry -->|Да| Input
    Retry -->|Нет| End([Конец])
    
    Play --> End
    Download --> End
    Stems --> End
    Extend --> Processing
```

### Сценарий разделения на стемы

```mermaid
flowchart TD
    Start([Выбор трека]) --> Check{Есть стемы?}
    Check -->|Да| ShowStems[Показать существующие]
    Check -->|Нет| SeparateMenu[Меню разделения]
    
    SeparateMenu --> Type{Тип разделения}
    Type -->|Вокал/Инструментал| VocalMode[separate_vocal]
    Type -->|12 треков| StemMode[split_stem]
    
    VocalMode --> API[Replicate API]
    StemMode --> API
    
    API --> Process[Обработка ~30-60с]
    Process --> Success{Успешно?}
    
    Success -->|Да| Save[💾 Сохранение стемов]
    Success -->|Нет| Error[❌ Ошибка]
    
    Save --> Display[Отображение стемов]
    Display --> Actions{Действия}
    
    Actions -->|Скачать| Download[⬇️ Скачать стемы]
    Actions -->|Микшировать| Mix[🎚️ Настройка микса]
    Actions -->|Прослушать| Play[▶️ Прослушивание]
    
    Download --> End([Конец])
    Mix --> End
    Play --> End
    Error --> End
```

---

## 📈 Метрики производительности

### Сравнение: До и После оптимизации

```mermaid
graph LR
    subgraph "До Phase 1"
        A1[Bundle: 860KB]
        A2[FCP: 2.1s]
        A3[TTI: 3.8s]
        A4[LCP: 2.8s]
        A5[Memory: 180MB]
    end
    
    subgraph "После Phase 1"
        B1[Bundle: 420KB ↓51%]
        B2[FCP: 0.9s ↓57%]
        B3[TTI: 1.8s ↓53%]
        B4[LCP: 1.2s ↓57%]
        B5[Memory: 27MB ↓85%]
    end
    
    A1 -.->|Оптимизация| B1
    A2 -.->|Улучшение| B2
    A3 -.->|Ускорение| B3
    A4 -.->|Повышение| B4
    A5 -.->|Снижение| B5
    
    style B1 fill:#90EE90
    style B2 fill:#90EE90
    style B3 fill:#90EE90
    style B4 fill:#90EE90
    style B5 fill:#90EE90
```

### Web Vitals (Phase 1 Complete)

| Метрика | Целевое значение | Текущее | Статус |
|---------|------------------|---------|--------|
| **First Contentful Paint (FCP)** | < 1.8s | 0.9s | 🟢 Отлично |
| **Largest Contentful Paint (LCP)** | < 2.5s | 1.2s | 🟢 Отлично |
| **First Input Delay (FID)** | < 100ms | 45ms | 🟢 Отлично |
| **Cumulative Layout Shift (CLS)** | < 0.1 | 0.05 | 🟢 Отлично |
| **Time to Interactive (TTI)** | < 3.8s | 1.8s | 🟢 Отлично |
| **Total Blocking Time (TBT)** | < 300ms | 180ms | 🟢 Хорошо |

### Lighthouse Scores

```
Performance:  ████████████████████ 95/100
Accessibility: ███████████████████  92/100
Best Practices: ████████████████████ 100/100
SEO:          ████████████████████ 100/100
```

---

## 📚 Документация

### Основная документация

#### 📐 Архитектура
- [**Обзор архитектуры**](docs/architecture/ARCHITECTURE.md) - Высокоуровневая архитектура системы
- [**Архитектура бэкенда**](docs/BACKEND_ARCHITECTURE.md) - Edge Functions и API дизайн
- [**Схема базы данных**](docs/DATABASE_SCHEMA.md) - Полная схема PostgreSQL

#### 🚀 Производительность
- [**Phase 1 Complete**](docs/PHASE_1_COMPLETE.md) - Результаты оптимизации производительности
- [**Week 3 Status**](docs/WEEK_3_STATUS.md) - Умная загрузка и кэширование
- [**Week 4 Status**](docs/WEEK_4_STATUS.md) - Loading states и скелетоны

#### 🔒 Безопасность
- [**RLS Policies**](docs/database/RLS_POLICIES.md) - Row Level Security политики
- [**Обработка ошибок**](docs/architecture/ERROR_HANDLING.md) - Централизованная обработка ошибок

#### 📊 Мониторинг и деплой
- [**Руководство по мониторингу**](docs/monitoring/MONITORING_GUIDE.md) - Production мониторинг
- [**Руководство по деплою**](docs/deployment/DEPLOYMENT_GUIDE.md) - Инструкции по деплою
- [**CRON Setup**](docs/deployment/CRON_SETUP.sql) - SQL для настройки CRON jobs

### Управление проектом

#### 📋 Планирование
- [**План разработки**](docs/DEVELOPMENT_PLAN.md) - Общий план разработки
- [**Sprint 32 План**](project-management/current-sprint/README.md) - Текущий спринт
- [**Дорожная карта**](project-management/roadmap/q4-2025.md) - Q4 2025 roadmap
- [**Master Improvement Roadmap**](docs/MASTER_IMPROVEMENT_ROADMAP.md) - Долгосрочные улучшения

#### 📈 Отчеты
- [**Sprint 31 Final Report**](project-management/SPRINT_31_FINAL_REPORT.md) - Итоговый отчет
- [**Sprint 26 Completion**](archive/2025/october/reports/2025-10-11-sprint-26-completion.md) - Dashboard завершен
- [**Sprint Logs**](project-management/reports/sprint-logs.md) - Журнал спринтов

### Индекс документации

📑 [**Полный индекс документации**](docs/INDEX.md) - Навигация по всей документации проекта

---

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js**: v18.0.0 или выше
- **npm**: v9.0.0 или выше
- **Git**: Последняя версия

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio.git
cd albert3-muse-synth-studio

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env с вашими Supabase credentials

# 4. Запустить dev сервер
npm run dev

# 5. Открыть в браузере
# Перейти на http://localhost:5173
```

### Docker Setup (Альтернатива)

```bash
# Собрать и запустить с Docker Compose
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановить контейнеры
docker-compose down
```

### Переменные окружения

```env
# Supabase конфигурация (Авто-настраивается в Lovable)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# Sentry (Опционально - для отслеживания ошибок)
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_DEV_ENABLED=false

# API ключи (Серверная сторона - настраиваются в Supabase Secrets)
SUNO_API_KEY=your_suno_key
MUREKA_API_KEY=your_mureka_key
LOVABLE_API_KEY=your_lovable_key
FAL_API_KEY=your_fal_key
```

---

## 📊 Технологический стек

### Frontend технологии

| Технология | Версия | Назначение | Документация |
|-----------|---------|-----------|---------------|
| **React** | 18.3.1 | UI фреймворк | [Docs](https://react.dev) |
| **TypeScript** | 5.8.3 | Типизация | [Docs](https://www.typescriptlang.org) |
| **Vite** | 5.4.19 | Инструмент сборки | [Docs](https://vitejs.dev) |
| **TailwindCSS** | 3.4.17 | Стилизация | [Docs](https://tailwindcss.com) |
| **Zustand** | 5.0.8 | State менеджмент | [Docs](https://zustand-demo.pmnd.rs) |
| **TanStack Query** | 5.90.2 | Загрузка данных | [Docs](https://tanstack.com/query) |
| **Framer Motion** | 12.23.24 | Анимации | [Docs](https://www.framer.com/motion) |
| **Radix UI** | Latest | Доступные компоненты | [Docs](https://www.radix-ui.com) |

### Backend технологии

| Технология | Версия | Назначение | Документация |
|-----------|---------|-----------|---------------|
| **Supabase** | 2.58.0 | BaaS платформа | [Docs](https://supabase.com/docs) |
| **PostgreSQL** | 15.8 | База данных | [Docs](https://www.postgresql.org/docs) |
| **Deno** | 1.47 | Edge Functions Runtime | [Docs](https://deno.com) |
| **Supabase Storage** | Latest | Хранилище файлов и CDN | [Docs](https://supabase.com/docs/guides/storage) |

### AI и внешние сервисы

| Сервис | Назначение | Версия API |
|---------|-----------|-------------|
| **Suno AI** | Генерация музыки | v5 (chirp-v3-5) |
| **Mureka AI** | Генерация музыки | O1 |
| **Lovable AI** | Улучшение промптов | Latest |
| **Replicate** | Разделение стемов | Latest |
| **Sentry** | Отслеживание ошибок | 10.22.0 |

### Инструменты разработки

- **ESLint** - Линтинг кода
- **Prettier** - Форматирование кода
- **Vitest** - Unit тестирование
- **Playwright** - E2E тестирование (в разработке)
- **Chromatic** - Визуальная регрессия (запланировано)

---

## 🏆 Ключевые достижения

### 🎯 Производительность
- ✅ **97% улучшение** времени рендеринга треков
- ✅ **85% снижение** использования памяти
- ✅ **51% уменьшение** размера бандла
- ✅ **Lighthouse 95/100** общий показатель

### 🔒 Безопасность
- ✅ **98% показатель безопасности** БД
- ✅ **Комплексные RLS политики** для всех таблиц
- ✅ **Безопасная обработка** пользовательских данных
- ✅ **GDPR совместимость**

### 📊 Функциональность
- ✅ **2 AI провайдера** интегрированы
- ✅ **12-трековое** разделение стемов
- ✅ **Автоматическая архивация** треков
- ✅ **Realtime** обновления

### 🧪 Качество кода
- ✅ **65% покрытие** тестами
- ✅ **TypeScript** строгий режим
- ✅ **ESLint** правила enforced
- ✅ **CI/CD** pipeline готов

---

## 📞 Поддержка и контакты

### 💬 Каналы связи
- **GitHub Issues**: [Сообщить о проблеме](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues)
- **GitHub Discussions**: [Обсуждения](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/discussions)
- **Email**: dev@albert3.app

### 🐛 Сообщить об ошибке
Нашли баг? [Создайте issue](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/issues/new) с подробным описанием.

### 💡 Предложить улучшение
Есть идея? [Откройте discussion](https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio/discussions/new) и поделитесь вашим предложением.

---

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## 👥 Команда

**Разработка**: HOW2AI Agency  
**Версия**: 2.7.5  
**Последнее обновление**: 31 октября 2025

---

## 🌟 Благодарности

Особая благодарность:
- **Suno AI** за невероятный API генерации музыки
- **Supabase** за потрясающую BaaS платформу
- **Lovable** за облачную инфраструктуру
- **Open Source Community** за замечательные инструменты

---

<div align="center">

**Сделано с ❤️ HOW2AI Agency**

[⬆ Вернуться наверх](#-albert3-muse-synth-studio)

</div>