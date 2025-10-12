# 🏗️ Архитектура Albert3 Muse Synth Studio

В этом документе представлен обзор архитектуры приложения, включая фронтенд, бэкенд и взаимодействие между ними.

## Диаграмма архитектуры системы

Эта диаграмма показывает высокоуровневую структуру проекта, включая основные компоненты и их взаимодействие.

```mermaid
graph TD
    subgraph "Пользовательский интерфейс (Frontend)"
        A[React App (Vite + TS)]
        B[UI Components (shadcn/ui)]
        C[State Management (Zustand, React Query)]
        D[Audio Player]
        E[Service Worker (Offline/Caching)]
    end

    subgraph "Инфраструктура Supabase (Backend)"
        F[Supabase Client]
        G[Edge Functions (Deno)]
        H[Authentication]
        I[Database (PostgreSQL)]
        J[Storage]
        K[Realtime]
    end

    subgraph "Внешние API"
        L[Suno API]
    end

    A --> F
    F --> H
    F --> I
    F --> J
    F --> G
    F --> K

    G --> L
    G --> I
    G --> J

    D --> E
    E --> J

    style A fill:#61DAFB,stroke:#333,stroke-width:2px
    style L fill:#FF6F61,stroke:#333,stroke-width:2px
    style F fill:#3ECF8E,stroke:#333,stroke-width:2px
```

## Схема модели данных

Эта диаграмма описывает структуру базы данных, основные таблицы и их связи.

```mermaid
erDiagram
    users {
        UUID id PK "auth.users.id"
        string email
        json raw_user_meta_data
    }

    profiles {
        UUID id PK "FK to users.id"
        string username
        string avatar_url
        timestamp updated_at
    }

    tracks {
        UUID id PK
        UUID user_id FK "to profiles.id"
        string title
        string prompt
        string status "pending, processing, completed, failed"
        string audio_url
        string cover_url
        int duration
        string suno_id
        string idempotency_key "For idempotent requests"
        json metadata
        timestamp created_at
    }

    track_versions {
        UUID id PK
        UUID parent_track_id FK "to tracks.id"
        int version_number
        boolean is_master
        string audio_url
        string cover_url
        int duration
        string suno_id
        json metadata
        timestamp created_at
    }

    ai_jobs {
        UUID id PK
        UUID user_id FK "to profiles.id"
        UUID track_id FK "to tracks.id"
        string provider "e.g., suno, replicate"
        string status "pending, completed, failed"
        string idempotency_key
        json request_payload
        json response_payload
        timestamp created_at
    }

    users ||--o{ profiles : "has one"
    profiles ||--|{ tracks : "creates"
    tracks ||--|{ track_versions : "has"
    profiles ||--|{ ai_jobs : "initiates"
    tracks ||--o{ ai_jobs : "relates to"
```