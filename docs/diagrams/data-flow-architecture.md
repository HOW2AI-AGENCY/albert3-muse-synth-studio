# 🔄 Data Flow Architecture - Albert3 Muse Synth Studio

**Последнее обновление**: 13 октября 2025  
**Версия**: 2.7.1

Этот документ описывает потоки данных в приложении Albert3 Muse Synth Studio, включая взаимодействие между Frontend, Backend (Supabase), внешними API и различными подсистемами.

---

## 📊 Общая схема потоков данных

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Components]
        State[State Management]
        Cache[Client Cache]
        SW[Service Worker]
    end

    subgraph "API Layer"
        Supabase[Supabase Client]
        TanStack[TanStack Query]
    end

    subgraph "Backend Layer"
        Auth[Supabase Auth]
        DB[(PostgreSQL)]
        Storage[Supabase Storage]
        EdgeFunc[Edge Functions]
        Realtime[Realtime Subscriptions]
    end

    subgraph "External Services"
        Suno[Suno AI API]
        Sentry[Sentry Monitoring]
    end

    UI --> State
    State --> TanStack
    TanStack --> Supabase
    UI --> Cache
    Cache --> SW
    
    Supabase --> Auth
    Supabase --> DB
    Supabase --> Storage
    Supabase --> EdgeFunc
    Supabase --> Realtime
    
    EdgeFunc --> Suno
    EdgeFunc --> DB
    EdgeFunc --> Storage
    
    UI --> Sentry
    EdgeFunc --> Sentry
    
    Realtime -.->|Push Updates| UI

    style UI fill:#61DAFB
    style DB fill:#3ECF8E
    style Suno fill:#FF6F61
    style Sentry fill:#362D59
```

---

## 🎵 1. Music Generation Flow

Детальный поток генерации музыки через Suno API с обработкой callbacks и polling.

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant TQ as TanStack Query
    participant Supabase
    participant EF as Edge Function<br/>(generate-suno)
    participant DB as PostgreSQL
    participant Suno as Suno AI API
    participant Storage

    User->>UI: Заполняет форму генерации
    UI->>UI: Валидация (Zod schema)
    UI->>TQ: useMutation.mutate()
    
    TQ->>Supabase: auth.getSession()
    Supabase-->>TQ: JWT token
    
    TQ->>EF: POST /functions/v1/generate-suno
    Note over TQ,EF: Body: { prompt, tags, make_instrumental, model_version }
    
    EF->>EF: Валидация входных данных
    EF->>DB: INSERT INTO tracks<br/>(status='pending', user_id, prompt, ...)
    DB-->>EF: track_id
    
    EF->>Suno: POST /api/v1/generate/v2/
    Note over EF,Suno: Body: { prompt, tags, callback_url }
    Suno-->>EF: { task_id, status='processing' }
    
    EF->>DB: UPDATE tracks<br/>SET suno_task_id=..., status='processing'
    EF-->>TQ: { success: true, trackId }
    TQ-->>UI: Success response
    UI-->>User: "Генерация началась!"
    
    Note over Suno: Background processing (30-120 sec)
    
    alt Callback Flow (Preferred)
        Suno->>EF: POST /suno-callback<br/>{ task_id, status, audio_url, ... }
        EF->>Storage: Download & Upload audio
        Storage-->>EF: Supabase public URL
        EF->>Storage: Download & Upload cover
        Storage-->>EF: Supabase public URL
        EF->>DB: UPDATE tracks<br/>SET status='completed', audio_url=..., cover_url=...
    else Polling Flow (Fallback)
        loop Every 5 seconds
            EF->>Suno: GET /api/v1/query?task_id=...
            Suno-->>EF: { status, audio_url, ... }
            alt Status = completed
                EF->>Storage: Download & Upload files
                EF->>DB: UPDATE tracks (completed)
            end
        end
    end
    
    DB->>UI: Realtime subscription update
    UI-->>User: "Трек готов! 🎵"
```

**Ключевые моменты**:
- **Dual-mode**: Callback (приоритет) + Polling (fallback)
- **Storage migration**: Файлы сразу переносятся в Supabase Storage
- **Realtime updates**: UI получает обновления без перезагрузки
- **Error recovery**: Retry mechanism через `track_retry_attempts` таблицу

---

## 🔐 2. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Supabase
    participant Auth as Supabase Auth
    participant DB
    participant RLS as Row Level Security

    User->>UI: Вход (email + password)
    UI->>Supabase: auth.signInWithPassword()
    Supabase->>Auth: Проверка credentials
    Auth->>DB: SELECT FROM auth.users
    DB-->>Auth: User record
    Auth->>Auth: Generate JWT token
    Auth-->>Supabase: { user, session }
    Supabase-->>UI: Login success
    
    Note over UI: Store session in memory<br/>(не в localStorage!)
    
    UI->>Supabase: from('tracks').select()
    Supabase->>RLS: Apply RLS policies<br/>(auth.uid() check)
    RLS->>DB: Filtered query
    DB-->>UI: User's tracks only
    
    alt Admin Request
        UI->>Supabase: Check user role
        Supabase->>DB: SELECT FROM user_roles<br/>WHERE user_id=auth.uid()
        DB-->>Supabase: role='admin'
        Supabase->>RLS: Admin override policies
        RLS->>DB: Full access query
        DB-->>UI: All data
    end
```

**Security Layers**:
1. **JWT Authentication**: Каждый запрос валидируется
2. **RLS Policies**: Database-level access control
3. **Role-based Access**: `user_roles` таблица с enum `app_role`
4. **Security Definer Functions**: `has_role()` для проверки без рекурсии

---

## 📁 3. File Upload & Storage Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Supabase
    participant Storage
    participant DB
    participant CDN

    User->>UI: Выбирает файл (audio/image)
    UI->>UI: Валидация (type, size, format)
    
    UI->>Supabase: storage.from('bucket').upload()
    Note over UI,Supabase: File + metadata
    
    Supabase->>Storage: RLS policy check
    Storage->>Storage: Generate unique path<br/>(user_id/timestamp/filename)
    Storage->>Storage: Save file
    Storage-->>Supabase: { path, public_url }
    
    Supabase-->>UI: Upload success
    UI->>DB: UPDATE tracks<br/>SET audio_url=public_url
    
    alt Optimized Delivery
        User->>UI: Запрос файла
        UI->>CDN: GET public_url
        CDN-->>UI: Cached file (fast!)
    end
```

**Storage Buckets**:
- `tracks-audio` (public): Audio файлы треков
- `tracks-covers` (public): Обложки треков
- `tracks-videos` (public): Video файлы
- `reference-audio` (public): Референсные аудио для extend/cover

**Optimizations**:
- Service Worker кэширование
- CDN для статических файлов
- Progressive loading для больших файлов

---

## 🔄 4. Real-time Subscriptions Flow

```mermaid
graph LR
    subgraph "Database Events"
        Insert[INSERT track]
        Update[UPDATE track]
        Delete[DELETE track]
    end

    subgraph "Supabase Realtime"
        Channel[Channel: tracks]
        Broadcast[Broadcast Event]
    end

    subgraph "Frontend Subscribers"
        Sub1[Component A]
        Sub2[Component B]
        Sub3[Component C]
    end

    Insert --> Channel
    Update --> Channel
    Delete --> Channel
    
    Channel --> Broadcast
    
    Broadcast --> Sub1
    Broadcast --> Sub2
    Broadcast --> Sub3
    
    Sub1 --> |Re-render|Sub1
    Sub2 --> |Re-render|Sub2
    Sub3 --> |Re-render|Sub3

    style Channel fill:#3ECF8E
    style Broadcast fill:#FFD700
```

**Пример использования**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('track-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tracks',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        queryClient.invalidateQueries(['tracks']);
        toast.success('Трек обновлён!');
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [userId]);
```

---

## 🎛️ 5. Audio Player Data Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: App Start
    
    Idle --> Loading: playTrack()
    Loading --> Playing: Audio loaded
    Loading --> Error: Load failed
    
    Playing --> Paused: pause()
    Paused --> Playing: resume()
    
    Playing --> Loading: switchVersion()
    Playing --> Loading: playNext()
    
    Playing --> [*]: clearTrack()
    Paused --> [*]: clearTrack()
    Error --> Idle: retry()
    
    state Playing {
        [*] --> Streaming
        Streaming --> Buffering: Network slow
        Buffering --> Streaming: Buffer full
    }
```

**Context Flow**:
```mermaid
graph TD
    A[AudioPlayerContext] --> B[useAudioPlayback]
    A --> C[useAudioQueue]
    A --> D[useAudioVersions]
    
    B --> E[HTMLAudioElement]
    C --> F[Queue State]
    D --> G[Track Versions]
    
    E --> H[UI Components]
    F --> H
    G --> H
    
    H --> I[GlobalAudioPlayer]
    H --> J[MiniPlayer]
    H --> K[FullScreenPlayer]
```

**Data Sources**:
1. **Current Track**: От `useTracks()` hook
2. **Queue**: Локальный state в context
3. **Versions**: От `useTrackVersions()` hook
4. **Audio URL**: Из Supabase Storage (кэшируется Service Worker)

---

## 📊 6. Analytics & Monitoring Flow

```mermaid
graph TB
    subgraph "User Actions"
        A1[Track Play]
        A2[Track Like]
        A3[Generation]
        A4[Error Event]
    end

    subgraph "Frontend Tracking"
        B1[usePlayAnalytics]
        B2[Logger Utility]
        B3[Sentry SDK]
    end

    subgraph "Data Storage"
        C1[Supabase DB<br/>analytics table]
        C2[Sentry Cloud]
    end

    subgraph "Dashboards"
        D1[Admin Analytics]
        D2[Sentry Dashboard]
    end

    A1 --> B1
    A2 --> B1
    A3 --> B2
    A4 --> B3
    
    B1 --> C1
    B2 --> C1
    B3 --> C2
    
    C1 --> D1
    C2 --> D2

    style C1 fill:#3ECF8E
    style C2 fill:#362D59
```

**Tracked Metrics**:
- **User Actions**: Play, Like, Download, Share
- **Generation Metrics**: Success rate, duration, provider
- **Performance**: Web Vitals (LCP, FCP, CLS, TTFB)
- **Errors**: Frontend errors, API failures, edge function crashes

---

## 🔀 7. Track Versioning Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Hook as useExtendTrack
    participant EF as extend-track function
    participant DB
    participant Storage

    User->>UI: Нажимает "Extend" на треке
    UI->>Hook: extendTrack(trackId, params)
    Hook->>EF: POST /functions/v1/extend-track
    
    EF->>DB: INSERT INTO tracks<br/>(metadata: { extended_from: trackId })
    DB-->>EF: new_track_id
    
    Note over EF: Generation process<br/>(аналогично generate-suno)
    
    EF->>DB: UPDATE new track<br/>SET status='completed', audio_url=...
    
    EF->>DB: INSERT INTO track_versions<br/>(parent_track_id=trackId,<br/>version_number=2, ...)
    
    DB->>UI: Realtime update
    UI-->>User: "Версия 2 готова!"
    
    User->>UI: Switch to Version 2
    UI->>Hook: switchToVersion(versionId)
    Hook->>UI: Update audio player
```

**Version Management**:
- **Master Track**: Оригинальный трек (parent)
- **Versions**: Extend, Cover, Remix варианты
- **Version Selector**: UI компонент для переключения
- **Stems Inheritance**: Stems связаны с версией

---

## 🛠️ 8. Error Handling & Recovery Flow

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type}
    
    B -->|Network Error| C[Retry Logic]
    B -->|Auth Error| D[Re-authenticate]
    B -->|Validation Error| E[Show Toast]
    B -->|Server Error| F[Log to Sentry]
    
    C --> G{Retry Count}
    G -->|< 3| H[Exponential Backoff]
    G -->|>= 3| I[Show Error UI]
    
    H --> J[Retry Request]
    J --> K{Success?}
    K -->|Yes| L[Continue]
    K -->|No| C
    
    D --> M[Redirect to Login]
    E --> N[User Action Required]
    F --> O[Admin Notification]
    
    I --> P[Offer Manual Retry]
    P --> Q{User Retries?}
    Q -->|Yes| C
    Q -->|No| R[Cancel Operation]

    style F fill:#FF6B6B
    style L fill:#51CF66
```

**Error Categories**:
1. **Recoverable**: Network timeouts, temporary API failures
2. **User Actionable**: Validation errors, auth issues
3. **Critical**: Database failures, storage quota exceeded
4. **Silent**: Analytics tracking failures (не блокируют UX)

---

## 🔧 9. Caching Strategy

```mermaid
graph TB
    subgraph "Cache Layers"
        L1[Browser Memory<br/>TanStack Query]
        L2[IndexedDB<br/>IDB Cache]
        L3[Service Worker<br/>Network Cache]
        L4[Supabase Edge<br/>Cache]
    end

    Request[User Request] --> L1
    L1 -->|Miss| L2
    L2 -->|Miss| L3
    L3 -->|Miss| L4
    L4 -->|Miss| API[Backend API]
    
    API --> L4
    L4 --> L3
    L3 --> L2
    L2 --> L1
    L1 --> Response[User Response]

    style L1 fill:#61DAFB
    style L2 fill:#FFD93D
    style L3 fill:#6BCF7F
    style L4 fill:#3ECF8E
```

**Cache TTL**:
- **TanStack Query**: 5 минут (tracks list), 1 минута (track details)
- **IndexedDB**: 24 часа (audio metadata)
- **Service Worker**: 7 дней (audio files), 1 день (covers)
- **Supabase Edge**: 5 минут (API responses)

---

## 📈 10. Performance Optimizations

### 10.1 Bundle Splitting
```
Entry Point (main.tsx)
  ├── Core Bundle (~150KB)
  │   ├── React + React Router
  │   ├── Supabase Client
  │   └── TanStack Query
  │
  ├── UI Bundle (~80KB)
  │   ├── shadcn/ui components
  │   └── Lucide icons (tree-shaked)
  │
  └── Feature Bundles (lazy loaded)
      ├── MusicGenerator (~40KB)
      ├── TrackVersions (~30KB)
      ├── StemMixer (~35KB)
      └── Analytics (~25KB)
```

### 10.2 Data Fetching Optimization
```typescript
// ✅ GOOD: Parallel fetching
const [tracks, user, balance] = await Promise.all([
  supabase.from('tracks').select(),
  supabase.from('profiles').select(),
  supabase.functions.invoke('get-balance')
]);

// ❌ BAD: Sequential fetching
const tracks = await supabase.from('tracks').select();
const user = await supabase.from('profiles').select();
const balance = await supabase.functions.invoke('get-balance');
```

---

## 🎯 Key Takeaways

1. **Separation of Concerns**: Frontend (UI/State) ↔ API Layer ↔ Backend (DB/Storage/Functions)
2. **Real-time First**: WebSocket subscriptions для мгновенных обновлений
3. **Progressive Enhancement**: Offline support через Service Worker
4. **Error Resilience**: Multi-layer retry + fallback mechanisms
5. **Performance**: Aggressive caching + lazy loading + code splitting
6. **Security**: RLS + JWT + Role-based access на каждом уровне
7. **Observability**: Sentry + Analytics + Performance monitoring

---

## 🔗 Related Documentation

- [System Architecture](system-architecture.md) - Общая архитектура
- [Music Generation Flow](music-generation-flow.md) - Детали генерации
- [Stem Separation Flow](stem-separation-flow.md) - Обработка стемов
- [Database ERD](database-erd.md) - Схема базы данных
- [User Journey Map](user-journey-map.md) - Пользовательские сценарии

---

*Последнее обновление: 13 октября 2025*  
*Версия: 2.7.1*  
*Статус: Production Ready*
