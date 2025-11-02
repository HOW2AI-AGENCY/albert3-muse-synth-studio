# 🔄 Data Flow Diagrams

## Music Generation Flow (Suno AI)

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant Service as GenerationService
    participant Edge as generate-suno
    participant Suno as Suno API
    participant DB as PostgreSQL
    participant Callback as suno-callback
    
    User->>UI: Submit generation form
    UI->>Service: generate({ provider: 'suno', ... })
    Service->>Service: checkDuplicateRequest()
    Service->>Edge: POST /functions/v1/generate-suno
    
    Edge->>Edge: validateParams()
    Edge->>Suno: Check balance
    Suno-->>Edge: balance > 0 ✓
    
    Edge->>DB: INSERT track (status: pending)
    Edge->>Suno: POST /api/v1/generate
    Suno-->>Edge: { taskId: "xxx" }
    Edge->>DB: UPDATE track (status: processing)
    
    Edge-->>Service: { success: true, trackId, taskId }
    Service->>Service: subscribe(trackId)
    Service-->>UI: { trackId, taskId }
    UI-->>User: "Генерация началась..."
    
    Note over Suno,Callback: Background processing
    
    alt Callback Strategy
        Suno->>Callback: POST /suno-callback
        Callback->>DB: UPDATE track (status: completed)
        DB->>Service: Realtime notification
        Service-->>UI: Track completed
        UI-->>User: "Готово! 🎵"
    else Polling Fallback
        Edge->>Suno: GET /record-info (every 5s)
        Suno-->>Edge: { status: "SUCCESS" }
        Edge->>DB: UPDATE track (completed)
        DB->>Service: Realtime notification
        Service-->>UI: Track completed
        UI-->>User: "Готово! 🎵"
    end
```

## Music Generation Flow (Mureka AI)

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Service as GenerationService
    participant Edge as generate-mureka
    participant Mureka as Mureka API
    participant DB
    
    User->>UI: Submit generation form
    UI->>Service: generate({ provider: 'mureka', ... })
    Service->>Edge: POST /functions/v1/generate-mureka
    
    Edge->>DB: INSERT track (status: pending)
    
    alt Has lyrics
        Edge->>Edge: Use provided lyrics
    else No lyrics
        Edge->>Mureka: POST /v1/lyrics/generate
        Mureka-->>Edge: { variants: [...] }
        Edge->>DB: INSERT lyrics_jobs + variants
        
        alt Multiple variants
            Edge-->>UI: { requiresLyricsSelection: true }
            UI->>User: Show variant selector
            User->>UI: Select variant
            UI->>Edge: Continue with selected variant
        else Single variant
            Edge->>Edge: Auto-select first variant
        end
    end
    
    Edge->>Mureka: POST /v1/song/generate
    Mureka-->>Edge: { task_id: "xxx" }
    Edge->>DB: UPDATE track (mureka_task_id, status: processing)
    Edge-->>Service: { trackId, task_id }
    
    Note over Edge,Mureka: Polling (every 5s, max 2 min)
    
    loop Until completed
        Edge->>Mureka: GET /v1/song/query/{task_id}
        Mureka-->>Edge: { status: "preparing/completed" }
    end
    
    Edge->>DB: UPDATE track (status: completed, audio_url)
    DB->>Service: Realtime notification
    Service-->>UI: Track completed
    UI-->>User: "Готово! 🎵"
```

## Stem Separation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Edge as separate-stems
    participant Fal as Fal.AI
    participant DB
    
    User->>UI: Click "Separate Stems"
    UI->>Edge: POST { trackId, mode: "split_stem" }
    
    Edge->>DB: SELECT audio_url FROM tracks
    DB-->>Edge: audio_url
    
    Edge->>Fal: POST /stem-splitter
    Fal-->>Edge: { request_id }
    
    Edge->>DB: INSERT track_stems (status: processing)
    Edge-->>UI: { jobId }
    
    loop Poll every 3s
        Edge->>Fal: GET /requests/{request_id}
        alt Completed
            Fal-->>Edge: { status: "COMPLETED", stems: [...] }
            Edge->>DB: UPDATE stems (audio_urls)
            DB->>UI: Realtime update
            UI-->>User: "12 stems ready!"
        else Processing
            Fal-->>Edge: { status: "IN_PROGRESS" }
        end
    end
```

## Track Versioning Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Edge as generate-suno
    participant DB
    participant Callback as suno-callback
    
    User->>UI: Generate music (Suno)
    UI->>Edge: POST /generate-suno
    Edge->>DB: INSERT track (parent)
    
    Note over Callback: Suno returns 2 variants
    
    Callback->>DB: INSERT track_versions (variant_index=0, is_primary=true)
    Callback->>DB: INSERT track_versions (variant_index=1, is_primary=false)
    
    DB->>UI: Realtime update
    UI-->>User: Show 2 versions
    
    User->>UI: Set version 1 as preferred
    UI->>DB: UPDATE track_versions (is_preferred_variant=true)
    DB-->>UI: Updated
    UI-->>User: "Version 1 is now preferred"
```

## Audio Player State Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: play(track)
    Loading --> Playing: audio.play()
    Loading --> Error: load failed
    Playing --> Paused: pause()
    Paused --> Playing: resume()
    Playing --> Loading: next()
    Playing --> Idle: stop()
    Error --> Idle: reset()
    
    Playing --> Playing: seek(time)
    Playing --> Playing: setVolume(vol)
```

## Realtime Sync Flow

```mermaid
sequenceDiagram
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant Client1 as User 1 Browser
    participant Client2 as User 2 Browser
    
    Client1->>RT: Subscribe to tracks changes
    Client2->>RT: Subscribe to tracks changes
    
    Client1->>DB: UPDATE track (like_count++)
    DB->>RT: Broadcast INSERT/UPDATE/DELETE
    
    RT->>Client1: { eventType: 'UPDATE', new: {...} }
    RT->>Client2: { eventType: 'UPDATE', new: {...} }
    
    Client1->>Client1: Invalidate query cache
    Client2->>Client2: Invalidate query cache
    
    Client1->>Client1: Re-render UI
    Client2->>Client2: Re-render UI
```
