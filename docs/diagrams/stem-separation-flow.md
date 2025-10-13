# 🎵 Диаграмма потока разделения стемов

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant UI as TrackCard/DetailPanel
    participant Hook as useStemSeparation
    participant EF as Edge Function<br/>(separate-stems)
    participant DB as Supabase DB
    participant Suno as Suno API
    participant Storage as Supabase Storage

    User->>UI: Клик "Separate Stems"
    UI->>UI: Открывает SeparateStemsDialog
    User->>UI: Выбирает тип: separate_vocal/split_stem
    User->>UI: Клик "Разделить"
    
    UI->>Hook: separateStems({trackId, audioId, type})
    Hook->>EF: POST /separate-stems
    Note over Hook,EF: Body: {taskId, audioId, type, callbackUrl}
    
    EF->>DB: SELECT track для валидации
    DB-->>EF: Track data
    
    EF->>Suno: POST /api/v1/stem/separate
    Note over EF,Suno: {<br/>  audio_id: "xxx",<br/>  type: "separate_vocal"<br/>}
    
    Suno-->>EF: {success: true, task_id: "stem_xxx"}
    
    EF->>DB: UPDATE tracks SET metadata
    Note over EF,DB: metadata.suno_stem_task_id = "stem_xxx"<br/>metadata.stem_separation_mode = "separate_vocal"
    
    EF-->>Hook: {success: true, taskId: "xxx"}
    Hook-->>UI: onSuccess callback
    UI-->>User: Toast "Разделение начато..."
    UI->>UI: Закрывает dialog
    
    %% Background polling
    Note over EF,Suno: Background polling каждые 10s
    
    loop Каждые 10 секунд
        EF->>Suno: GET /api/v1/stem/query?taskId=stem_xxx
        Suno-->>EF: {status: "processing", progress: 45%}
    end
    
    Suno->>EF: {status: "completed", stems: [{type, url}...]}
    
    %% Download stems to Storage
    loop Для каждого stem
        EF->>Suno: Download stem audio
        Suno-->>EF: Binary audio data
        EF->>Storage: Upload to tracks-audio/stems/
        Storage-->>EF: Public URL
    end
    
    %% Save to DB
    loop Для каждого stem
        EF->>DB: INSERT INTO track_stems
        Note over EF,DB: {<br/>  track_id,<br/>  stem_type: "vocals",<br/>  audio_url: "storage_url",<br/>  separation_mode: "separate_vocal"<br/>}
    end
    
    EF->>DB: UPDATE tracks SET has_stems = true
    
    %% Realtime notification
    DB->>UI: Realtime subscription update
    UI->>UI: Обновляет TrackStemsPanel
    UI-->>User: Toast "Стемы готовы!"
    UI->>UI: Показывает stems в DetailPanel
```

---

## 📊 Типы разделения

### 1. `separate_vocal` (Базовое разделение)

**Результат:** 2 стема
- 🎤 **Vocals** - изолированный вокал
- 🎹 **Instrumental** - инструментальная часть

**Время обработки:** 20-40 секунд  
**Использование:** Быстрое удаление вокала, создание караоке-версий

---

### 2. `split_stem` (Продвинутое разделение)

**Результат:** До 12 стемов
- 🎤 **Vocals** - основной вокал
- 🎵 **Backing Vocals** - бэк-вокал
- 🥁 **Drums** - ударные
- 🎸 **Bass** - бас
- 🎸 **Guitar** - гитара
- 🎹 **Keyboard** - клавишные
- 🥁 **Percussion** - перкуссия
- 🎻 **Strings** - струнные
- 🎺 **Brass** - духовые (медные)
- 🎷 **Woodwinds** - духовые (деревянные)
- 🎛️ **Synth** - синтезаторы
- ✨ **FX** - эффекты

**Время обработки:** 60-120 секунд  
**Использование:** Профессиональный ремикс, stem mixing, детальная обработка

---

## 🔄 Состояния процесса

```mermaid
stateDiagram-v2
    [*] --> Idle: Пользователь на странице трека
    
    Idle --> Selecting: Открывает SeparateStemsDialog
    Selecting --> Idle: Отменяет
    Selecting --> Submitting: Выбирает тип и подтверждает
    
    Submitting --> Validating: POST /separate-stems
    Validating --> Error: Валидация не прошла
    Validating --> Processing: Запрос отправлен в Suno
    
    Processing --> Polling: Edge Function polling
    Polling --> Polling: status: processing
    Polling --> Downloading: status: completed
    
    Downloading --> Uploading: Stems скачаны из Suno
    Uploading --> SavingDB: Stems загружены в Storage
    
    SavingDB --> Complete: Записи в track_stems созданы
    SavingDB --> Error: Ошибка записи
    
    Complete --> Idle: Realtime update UI
    Error --> Idle: Показывает ошибку
```

---

## 🗄️ Структура данных

### Track Metadata (во время обработки)
```json
{
  "suno_stem_task_id": "stem_abc123",
  "stem_separation_mode": "split_stem",
  "stem_separation_started_at": "2025-10-13T12:00:00Z",
  "stem_separation_progress": 75
}
```

### Track Stems (после завершения)
```sql
-- Пример записи в track_stems
{
  id: "uuid",
  track_id: "parent-track-id",
  version_id: null,
  stem_type: "vocals",
  audio_url: "https://storage.../vocals.mp3",
  separation_mode: "split_stem",
  suno_task_id: "stem_abc123",
  metadata: {
    duration: 180,
    file_size: 5242880,
    sample_rate: 44100
  },
  created_at: "2025-10-13T12:02:00Z"
}
```

---

## ⚡ Производительность

### Оптимизации:
1. **Параллельная загрузка стемов** - до 3 одновременно
2. **Chunked upload** для больших файлов (>10MB)
3. **Retry логика** для failed downloads (3 попытки)
4. **Кэширование** уже разделенных треков

### Метрики:
- **separate_vocal:** ~30s среднее время
- **split_stem:** ~90s среднее время
- **Success Rate:** 95%+
- **Storage Used:** ~15MB на full split_stem

---

## 🎛️ UI Components

### SeparateStemsDialog
- Выбор типа разделения (radio buttons)
- Описание каждого типа
- Preview доступных стемов
- Progress indicator (при processing)

### TrackStemsPanel (DetailPanel → Stems Tab)
- Grid view всех стемов
- Play/Pause для каждого стема
- Download кнопка
- Delete stem опция
- Stem mixer (если >2 стемов)

---

## 🔒 Security & RLS

### RLS Policies:
```sql
-- Users can insert stems for their own tracks
CREATE POLICY "Users can insert stems for their own tracks"
ON track_stems FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM tracks
    WHERE tracks.id = track_stems.track_id
    AND tracks.user_id = auth.uid()
  )
);

-- Users can view stems of their own tracks
CREATE POLICY "Users can view stems of their own tracks"
ON track_stems FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tracks
    WHERE tracks.id = track_stems.track_id
    AND tracks.user_id = auth.uid()
  )
);

-- Public tracks stems are viewable by everyone
CREATE POLICY "Users can view stems of public tracks"
ON track_stems FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tracks
    WHERE tracks.id = track_stems.track_id
    AND tracks.is_public = true
  )
);
```

---

## 🚨 Error Handling

### Типичные ошибки:

1. **Invalid audio format**
   - Код: 400
   - Сообщение: "Unsupported audio format"
   - Решение: Конвертировать в MP3/WAV

2. **Track too short**
   - Код: 400
   - Сообщение: "Track must be at least 15 seconds"
   - Решение: Использовать треки длиннее 15s

3. **Suno API timeout**
   - Код: 504
   - Сообщение: "Suno API timeout"
   - Решение: Retry через 30 секунд

4. **Storage quota exceeded**
   - Код: 507
   - Сообщение: "Storage quota exceeded"
   - Решение: Удалить старые stems

---

*Последнее обновление: 13 октября 2025*  
*Версия: 1.0.0*
