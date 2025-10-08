# 🏗️ Архитектура системы Albert3 Muse Synth Studio

[![Architecture Version](https://img.shields.io/badge/Architecture-v1.3.0-blue.svg)](https://github.com/your-repo/albert3-muse-synth-studio)
[![Last Updated](https://img.shields.io/badge/Updated-January%202025-green.svg)](https://github.com/your-repo/albert3-muse-synth-studio)
[![Status](https://img.shields.io/badge/Status-Active%20Development-orange.svg)](https://github.com/your-repo/albert3-muse-synth-studio)

## 📋 Обзор архитектуры

Albert3 Muse Synth Studio - это современное веб-приложение для генерации музыки с использованием ИИ, построенное на основе микросервисной архитектуры с использованием React 18, TypeScript, Supabase и внешних API для генерации музыки. Система поддерживает генерацию музыки через Suno AI, разделение треков на стемы, создание текстов песен с помощью ИИ, продвинутую аналитику прослушиваний и кэширование аудио через Service Worker.

## 🎯 Основные компоненты системы

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React SPA] --> B[React Router]
        A --> C[TanStack Query]
        A --> D[Tailwind CSS + shadcn/ui]
        A --> E[Audio Player Context]
        A --> SW[Service Worker]
    end
    
    subgraph "Caching Layer"
        SW --> AC[Audio Cache]
        SW --> CC[Component Cache]
        AC --> IDB[IndexedDB Storage]
    end
    
    subgraph "Authentication & State"
        F[Supabase Auth] --> G[Protected Routes]
        H[Local Storage] --> I[Session Management]
    end
    
    subgraph "Backend Services"
        J[Supabase Database] --> K[Edge Functions]
        K --> L[generate-music]
        K --> M[generate-suno]
        K --> N[generate-lyrics]
        K --> O[separate-stems]
        K --> P[improve-prompt]
    end
    
    subgraph "External APIs"
        Q[Replicate API] --> R[Music Generation]
        S[Suno API] --> T[Advanced Music Generation]
        U[AI Services] --> V[Lyrics & Prompt Enhancement]
    end
    
    subgraph "Database Schema"
        W[profiles] --> X[users data]
        Y[tracks] --> Z[generated music]
        AA[track_versions] --> BB[music variations]
        CC[track_stems] --> DD[separated audio]
        EE[track_likes] --> FF[user preferences]
        GG[play_analytics] --> HH[usage statistics]
    end
    
    A --> F
    A --> J
    K --> Q
    K --> S
    K --> U
```

## 🔧 Технологический стек

### Frontend
- **React 18** - Основной UI фреймворк с поддержкой Concurrent Features
- **TypeScript 5.0+** - Типизация и безопасность кода
- **Vite 5.0** - Быстрый сборщик и dev-сервер с HMR
- **React Router v6** - Декларативная маршрутизация
- **TanStack Query v4** - Управление состоянием сервера и кэширование
- **Tailwind CSS 3.4** - Utility-first CSS фреймворк
- **Radix UI** - Доступные примитивы UI компонентов
- **Lucide React** - Современные SVG иконки
- **React Hook Form** - Эффективная работа с формами
- **Embla Carousel** - Производительные карусели

### Backend & Database
- **Supabase** - Backend-as-a-Service платформа
- **PostgreSQL 15** - Основная реляционная база данных
- **Supabase Edge Functions** - Serverless функции на Deno Runtime
- **Supabase Auth** - Аутентификация и авторизация пользователей
- **Supabase Storage** - Облачное хранилище для аудио и изображений
- **Row Level Security (RLS)** - Безопасность на уровне строк
- **Supabase Realtime** - WebSocket соединения для real-time обновлений

#### Управление миграциями и seed-данными
- Автоматические миграции хранятся в `supabase/migrations` и создаются через Supabase CLI. Любое изменение схемы должно быть воспроизводимо локально командой `npx supabase db reset`.
- Для сложных операций без автоматического отката используется каталог `supabase/migrations/manual`. Шаблон `0001_template.sql` помогает описать контекст, шаги выполнения, проверку и план восстановления.
- Справочные записи, системные роли и демо-треки загружаются скриптом `supabase/seed/index.ts`. Локально и в CI используем `npm run db:seed`, который основывается на переменных из `supabase/.env`.
- GitHub Actions (`supabase-functions-tests.yml`) теперь выполняет `npx supabase db reset --force` и `npm run db:seed` перед Deno-тестами, что поддерживает консистентность схемы и тестовых данных.
- Правила code review для изменений БД: каждая миграция сопровождается описанием плана отката, при необходимости обновляется seed-скрипт, а ручные сценарии обязаны иметь файл в `manual/` и согласование с backend-владельцем.

### External Services & AI
- **Suno AI API** - Продвинутая генерация музыки с текстами
- **Replicate API** - Доступ к различным AI моделям
- **Custom AI Models** - Специализированные модели для обработки аудио
- **Stem Separation Services** - Разделение треков на инструментальные части

## 📊 Схема базы данных

```mermaid
erDiagram
    profiles {
        string id PK
        string email
        string full_name
        string avatar_url
        string subscription_tier
        timestamp created_at
        timestamp updated_at
    }
    
    tracks {
        string id PK
        string user_id FK
        string title
        text prompt
        text improved_prompt
        string audio_url
        string cover_url
        string video_url
        string status
        integer duration
        text lyrics
        json style_tags
        string suno_id
        string model_name
        timestamp created_at
        timestamp created_at_suno
        text error_message
    }
    
    track_versions {
        string id PK
        string parent_track_id FK
        string suno_id
        string audio_url
        string cover_url
        string video_url
        integer version_number
        json metadata
        timestamp created_at
    }
    
    track_stems {
        string id PK
        string track_id FK
        string version_id FK
        string stem_type
        string separation_mode
        string audio_url
        string suno_task_id
        json metadata
        timestamp created_at
    }
    
    track_likes {
        string id PK
        string user_id FK
        string track_id FK
        timestamp created_at
    }
    
    play_analytics {
        string id PK
        string user_id FK
        string track_id FK
        string version_id FK
        integer play_duration
        boolean completed
        json metadata
        timestamp created_at
    }
    
    profiles ||--o{ tracks : "creates"
    tracks ||--o{ track_versions : "has versions"
    tracks ||--o{ track_stems : "has stems"
    tracks ||--o{ track_likes : "liked by"
    tracks ||--o{ play_analytics : "tracked in"
    profiles ||--o{ track_likes : "likes"
    profiles ||--o{ play_analytics : "generates"
```

## 🔄 Поток данных и взаимодействие компонентов

### 1. Аутентификация пользователя
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant D as Database
    
    U->>F: Вход/Регистрация
    F->>S: Отправка credentials
    S->>D: Проверка/Создание пользователя
    D-->>S: Результат операции
    S-->>F: JWT токен + session
    F-->>U: Перенаправление в workspace
```

### 2. Генерация музыки
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant EF as Edge Function
    participant API as External API
    participant D as Database
    
    U->>F: Запрос генерации
    F->>EF: POST /generate-music
    EF->>D: Создание записи трека
    EF->>API: Запрос к Replicate/Suno
    API-->>EF: Task ID
    EF-->>F: Успешный ответ
    F-->>U: Уведомление о начале
    
    Note over API: Асинхронная обработка
    API->>EF: Webhook callback
    EF->>D: Обновление трека
    EF->>F: Real-time уведомление
    F-->>U: Готовый трек
```

### 3. Управление треками
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant TQ as TanStack Query
    participant S as Supabase
    
    U->>F: Просмотр библиотеки
    F->>TQ: useQuery('tracks')
    TQ->>S: SELECT tracks
    S-->>TQ: Данные треков
    TQ-->>F: Кэшированные данные
    F-->>U: Отображение треков
    
    U->>F: Лайк трека
    F->>TQ: useMutation('like')
    TQ->>S: INSERT track_likes
    S-->>TQ: Подтверждение
    TQ->>TQ: Инвалидация кэша
    F-->>U: Обновленный UI
```

## 🏛️ Архитектурные паттерны

### 1. **Компонентная архитектура**
- **Атомарные компоненты** - Базовые UI элементы (Button, Input)
- **Молекулы** - Составные компоненты (TrackCard, AuthForm)
- **Организмы** - Сложные блоки (TracksList, MusicGenerator)
- **Страницы** - Полные экраны приложения

### 2. **Слоистая архитектура**
```
┌─────────────────────────────────────┐
│           Presentation Layer        │ ← React Components, Pages
├─────────────────────────────────────┤
│           Business Logic Layer      │ ← Hooks, Services, Utils
├─────────────────────────────────────┤
│           Data Access Layer         │ ← API Services, Supabase Client
├─────────────────────────────────────┤
│           Infrastructure Layer      │ ← Supabase, External APIs
└─────────────────────────────────────┘
```

### 3. **Микросервисная архитектура**
- **Edge Functions** как независимые микросервисы
- **Разделение ответственности** по функциональным доменам
- **Асинхронная обработка** через webhooks и callbacks

## 🔐 Безопасность архитектуры

### Аутентификация и авторизация
- **JWT токены** для аутентификации
- **Row Level Security (RLS)** в Supabase
- **Защищенные маршруты** на фронтенде
- **Валидация токенов** в Edge Functions

### Защита данных
- **HTTPS** для всех соединений
- **Environment variables** для секретов
- **Валидация входных данных** с помощью Zod
- **CORS политики** для API

## 📈 Масштабируемость

### Горизонтальное масштабирование
- **Serverless функции** автоматически масштабируются
- **CDN** для статических ресурсов
- **Database connection pooling** в Supabase

### Вертикальное масштабирование
- **Оптимизация запросов** к базе данных
- **Кэширование** с TanStack Query
- **Lazy loading** компонентов и ресурсов

## 🔄 CI/CD и развертывание

### Процесс развертывания
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Build & Test]
    C --> D[Deploy to Vercel]
    D --> E[Update Supabase]
    E --> F[Production Ready]
```

### Среды разработки
- **Development** - Локальная разработка с Vite
- **Staging** - Тестовая среда на Vercel
- **Production** - Продакшн среда с полным мониторингом

## 📊 Мониторинг и аналитика

### Встроенная аналитика
- **Play Analytics** - Отслеживание воспроизведения треков
- **User Behavior** - Анализ пользовательского поведения
- **Performance Metrics** - Метрики производительности

### Внешний мониторинг
- **Supabase Dashboard** - Мониторинг базы данных
- **Vercel Analytics** - Производительность фронтенда
- **Error Tracking** - Отслеживание ошибок

## 🚀 Будущие улучшения архитектуры

### Краткосрочные цели (Q1-Q2 2025)
- **Service Worker кэширование** ✅ - Реализовано автоматическое кэширование аудиофайлов
- **Real-time уведомления** через Supabase Realtime для статуса генерации
- **Оптимизация производительности** ✅ - Добавлены скелетоны загрузки и оптимизирован рендеринг
- **Расширенная аналитика** пользователей и треков
- **Улучшенная обработка ошибок** с детальным логированием
- **Мини-плеер** ✅ - Реализован для фонового воспроизведения

## 🔧 Service Worker архитектура

### Компоненты кэширования
```mermaid
graph TB
    subgraph "Service Worker"
        SW[Service Worker] --> CM[Cache Manager]
        CM --> AC[Audio Cache]
        CM --> SC[Static Cache]
        CM --> DC[Dynamic Cache]
    end
    
    subgraph "Storage"
        AC --> IDB[IndexedDB]
        SC --> CS[Cache Storage]
        DC --> CS
    end
    
    subgraph "Application"
        APP[React App] --> SW
        AP[Audio Player] --> SW
        SW --> NET[Network]
    end
```

### Стратегии кэширования
- **Cache First** - Для аудиофайлов (приоритет кэша)
- **Network First** - Для API запросов (приоритет сети)
- **Stale While Revalidate** - Для статических ресурсов

### Управление кэшем
- **Автоматическая очистка** старых файлов при превышении лимита
- **Предзагрузка** популярных треков
- **Офлайн-доступ** к кэшированным аудиофайлам

### Среднесрочные цели (Q3-Q4 2025)
- **Микрофронтенды** для больших команд разработки
- **GraphQL API** для более эффективных запросов
- **Advanced Audio Processing** с Web Audio API
- **Collaborative Features** для совместной работы над треками
- **Mobile App** с React Native

### Долгосрочные цели (2026+)
- **Machine Learning Pipeline** для персонализации рекомендаций
- **Multi-tenant архитектура** для корпоративных клиентов
- **Blockchain Integration** для NFT и авторских прав
- **Advanced AI Models** собственной разработки
- **Global CDN** для аудио контента

---

*Документ обновлен: Январь 2025*
*Версия архитектуры: 1.2.0*
*Статус: Активная разработка*