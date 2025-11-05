# Аудит системы версионирования и хранения аудио
**Дата:** 2025-11-05
**Проведён:** Claude Code
**Статус:** ✅ Проблема найдена и исправлена

---

## Краткое содержание

### Проблема
Обнаружено дублирование версий треков: система сохраняла и отображала 3 версии вместо 2, где версия 2 дублировала мастер-версию.

### Корневая причина
В функции `getTrackWithVersions` (src/features/tracks/api/trackVersions.ts) fallback-логика из `metadata.suno_data` выполнялась **всегда**, даже когда версии уже были в таблице `track_versions`. Это создавало дубликаты:
- Main track из `tracks` таблицы (sourceVersionNumber: 0)
- Версии из `metadata.suno_data` (sourceVersionNumber: 0, 1)
- Версии из `track_versions` таблицы (variant_index: 1)

### Решение
Добавлена проверка: fallback из metadata используется **только если** в БД нет версий (`dbVersions.length === 0`).

---

## 1. Архитектура системы версионирования

### 1.1 Схема базы данных

#### Таблица `tracks`
Основная таблица для треков:
```sql
CREATE TABLE tracks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  prompt text,
  suno_id text,               -- ID первого варианта от Suno
  audio_url text,             -- URL аудио для основной версии
  cover_url text,
  video_url text,
  lyrics text,
  duration integer,
  duration_seconds integer,
  status text,
  metadata jsonb DEFAULT '{}'::jsonb,  -- Содержит suno_data для fallback
  created_at timestamp,
  ...
);
```

**Примечание:** Основная версия трека (variant 0) хранится в этой таблице.

#### Таблица `track_versions`
Дополнительные версии треков:
```sql
CREATE TABLE track_versions (
  id uuid PRIMARY KEY,
  parent_track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  variant_index integer NOT NULL,          -- Индекс версии: 1, 2, 3, ...
  is_primary_variant boolean DEFAULT false, -- Устаревшее поле (не используется)
  is_preferred_variant boolean DEFAULT false, -- Мастер-версия (для UI)
  suno_id text,                            -- Уникальный ID от Suno
  audio_url text,
  video_url text,
  cover_url text,
  lyrics text,
  duration integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp,
  UNIQUE(parent_track_id, variant_index)   -- Предотвращает дубликаты
);

-- Индексы для производительности
CREATE INDEX idx_track_versions_parent ON track_versions(parent_track_id);
CREATE INDEX idx_track_versions_master ON track_versions(parent_track_id, is_preferred_variant);
```

**Ключевые моменты:**
- `variant_index` должен быть >= 1 (0 зарезервирован для основной версии в `tracks`)
- `UNIQUE(parent_track_id, variant_index)` предотвращает дубликаты на уровне БД
- `is_preferred_variant = true` указывает на мастер-версию (отображается звёздочкой в UI)

### 1.2 Storage Buckets

Система использует 3 Supabase Storage bucket:

```
tracks-audio/
  {userId}/
    {trackId}/
      main.mp3              # Основная версия (из tracks)
      version-1.mp3         # Дополнительная версия 1
      version-2.mp3         # Дополнительная версия 2
      ...

tracks-covers/
  {userId}/
    {trackId}/
      cover.jpg
      version-1-cover.jpg
      ...

tracks-videos/
  {userId}/
    {trackId}/
      video.mp4
      version-1-video.mp4
      ...
```

**Конфигурация:**
- `tracks-audio`: макс. размер файла 100 МБ, публичный доступ
- `tracks-covers`: макс. размер файла 10 МБ, публичный доступ
- `tracks-videos`: макс. размер файла 500 МБ, публичный доступ

### 1.3 Row Level Security (RLS)

Обе таблицы защищены RLS политиками:

**tracks:**
```sql
-- Пользователи видят только свои треки
CREATE POLICY "Users can view own tracks" ON tracks FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут создавать треки
CREATE POLICY "Users can insert own tracks" ON tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ... аналогичные политики для UPDATE и DELETE
```

**track_versions:**
```sql
-- Пользователи видят версии своих треков
CREATE POLICY "Users can view versions of own tracks" ON track_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tracks WHERE id = parent_track_id AND user_id = auth.uid()
  ));

-- ... аналогичные политики для INSERT, UPDATE, DELETE
```

---

## 2. Поток генерации и сохранения музыки

### 2.1 Генерация через Suno API

#### Шаг 1: Инициация генерации
**Frontend** → `generate-suno` Edge Function

```typescript
// src/hooks/useGenerateMusic.ts
const response = await supabase.functions.invoke('generate-suno', {
  body: {
    prompt: "ambient electronic music",
    make_instrumental: false,
    // ...
  }
});
```

**Edge Function:**
```typescript
// supabase/functions/generate-suno/index.ts
// 1. Создаёт черновик трека в БД со статусом 'draft'
const { data: track } = await supabase.from('tracks').insert({
  user_id: userId,
  title: "Generating...",
  status: 'draft',
  metadata: { suno_task_id: taskId }
});

// 2. Отправляет запрос в Suno API
const sunoResponse = await fetch('https://studio-api.suno.ai/api/generate/v2', {
  method: 'POST',
  body: JSON.stringify({ prompt, ... })
});

// 3. Возвращает task_id клиенту
return { task_id: sunoResponse.task_id };
```

**Статус трека:** `draft` → ожидает callback от Suno

#### Шаг 2: Получение результата через webhook
**Suno API** → `suno-callback` Edge Function

Suno отправляет POST-запрос на `https://yourapp.supabase.co/functions/v1/suno-callback?task_id={taskId}` когда генерация завершена.

**Структура ответа Suno:**
```json
{
  "task_id": "abc-123",
  "data": [
    {
      "id": "suno-clip-1",
      "audio_url": "https://cdn.suno.ai/abc-123-0.mp3",
      "image_url": "https://cdn.suno.ai/abc-123-0.jpg",
      "video_url": "https://cdn.suno.ai/abc-123-0.mp4",
      "lyrics": "...",
      "duration": 180
    },
    {
      "id": "suno-clip-2",
      "audio_url": "https://cdn.suno.ai/abc-123-1.mp3",
      "image_url": "https://cdn.suno.ai/abc-123-1.jpg",
      "video_url": "https://cdn.suno.ai/abc-123-1.mp4",
      "lyrics": "...",
      "duration": 180
    }
  ]
}
```

**Примечание:** Suno **всегда** генерирует 2 варианта трека.

#### Шаг 3: Обработка callback
**Код:** `supabase/functions/suno-callback/index.ts`

```typescript
// 1. Валидация webhook signature
const signature = req.headers.get('x-suno-signature');
if (!verifyWebhookSignature(payload, signature)) {
  return new Response('Invalid signature', { status: 401 });
}

// 2. Извлечение успешных треков
const successfulTracks = payload.data.filter(t => t.status === 'complete');
if (successfulTracks.length === 0) {
  // Трек всё ещё обрабатывается
  await supabase.from('tracks')
    .update({ status: 'processing' })
    .contains('metadata', { suno_task_id: taskId });
  return;
}

// 3. Сохранение ОСНОВНОЙ версии (successfulTracks[0])
const mainTrack = successfulTracks[0];
const externalAudioUrl = mainTrack.audio_url || mainTrack.stream_audio_url;

// Скачивание и загрузка в Supabase Storage
const uploadedAudioUrl = await downloadAndUploadAudio(
  externalAudioUrl,
  track.id,
  track.user_id,
  "main.mp3",
  supabase
);

const uploadedCoverUrl = await downloadAndUploadCover(
  mainTrack.image_url,
  track.id,
  track.user_id,
  "cover.jpg",
  supabase
);

const uploadedVideoUrl = await downloadAndUploadVideo(
  mainTrack.video_url,
  track.id,
  track.user_id,
  "video.mp4",
  supabase
);

// Обновление основного трека
await supabase.from('tracks').update({
  status: 'completed',
  title: sanitizeTitle(mainTrack.title),
  suno_id: mainTrack.id,
  audio_url: uploadedAudioUrl,
  cover_url: uploadedCoverUrl,
  video_url: uploadedVideoUrl,
  lyrics: mainTrack.lyrics,
  duration_seconds: Math.round(mainTrack.duration),
  metadata: {
    suno_task_id: taskId,
    suno_data: successfulTracks, // Сохраняем все варианты для fallback
    generated_via: 'callback'
  }
}).eq('id', track.id);

// 4. Сохранение ДОПОЛНИТЕЛЬНЫХ версий (successfulTracks[1], [2], ...)
// ✅ FIX (2025-11-04): Начинаем с i=1, пропуская первый вариант
if (successfulTracks.length > 1) {
  console.log(`Creating ${successfulTracks.length - 1} additional versions`);

  // Проверка существующих версий для предотвращения дубликатов
  const { data: existingVersions } = await supabase
    .from('track_versions')
    .select('variant_index, suno_id')
    .eq('parent_track_id', track.id);

  const usedIndexes = new Set(existingVersions.map(v => v.variant_index));
  const bySunoId = new Map(existingVersions.map(v => [v.suno_id, v.variant_index]));

  // Функция для получения следующего свободного индекса
  const nextIndex = () => {
    let idx = 1; // ✅ FIX: Начинаем с 1, т.к. 0 зарезервирован
    while (usedIndexes.has(idx)) idx++;
    usedIndexes.add(idx);
    return idx;
  };

  // ✅ FIX: Цикл начинается с i=1
  for (let i = 1; i < successfulTracks.length; i++) {
    const versionTrack = successfulTracks[i];
    const preferredIndex = i; // Порядок от Suno сохраняем как базовый индекс

    // Пропускаем, если версия с таким suno_id уже существует
    if (bySunoId.has(versionTrack.id)) {
      console.log(`Skip existing version: suno_id=${versionTrack.id}`);
      continue;
    }

    // Выбираем индекс: предпочтительный или первый свободный
    const variantIndex = usedIndexes.has(preferredIndex)
      ? nextIndex()
      : preferredIndex;
    usedIndexes.add(variantIndex);

    // Скачивание и загрузка файлов
    const versionAudioUrl = await downloadAndUploadAudio(
      versionTrack.audio_url,
      track.id,
      track.user_id,
      `version-${variantIndex}.mp3`,
      supabase
    );

    const versionCoverUrl = await downloadAndUploadCover(
      versionTrack.image_url,
      track.id,
      track.user_id,
      `version-${variantIndex}-cover.jpg`,
      supabase
    );

    const versionVideoUrl = await downloadAndUploadVideo(
      versionTrack.video_url,
      track.id,
      track.user_id,
      `version-${variantIndex}-video.mp4`,
      supabase
    );

    // Сохранение версии в БД
    await supabase.from('track_versions').upsert({
      parent_track_id: track.id,
      variant_index: variantIndex,
      is_primary_variant: false,
      is_preferred_variant: variantIndex === 1, // Первая доп. версия = мастер
      suno_id: versionTrack.id,
      audio_url: versionAudioUrl,
      video_url: versionVideoUrl,
      cover_url: versionCoverUrl,
      lyrics: versionTrack.lyrics,
      duration: Math.round(versionTrack.duration),
      metadata: {
        suno_track_data: versionTrack,
        generated_via: 'callback',
        suno_task_id: taskId
      }
    }, { onConflict: 'parent_track_id,variant_index' });

    console.log(`✅ Version ${variantIndex} saved`);
  }
}

// 5. Возврат успешного ответа
return new Response(JSON.stringify({
  ok: true,
  versionsCreated: successfulTracks.length
}), { status: 200 });
```

**Ключевые моменты:**
- **successfulTracks[0]** → `tracks` таблица (основная версия, variant 0)
- **successfulTracks[1..]** → `track_versions` таблица (дополнительные версии, variant 1+)
- Дедупликация по `suno_id` предотвращает повторное создание версий
- `UNIQUE(parent_track_id, variant_index)` обеспечивает уникальность на уровне БД
- Все файлы загружаются в Supabase Storage с retry-механизмом

### 2.2 Загрузка и хранение файлов

#### Функция `downloadAndUploadAudio`
**Код:** `supabase/functions/_shared/storage.ts:91-181`

```typescript
export async function downloadAndUploadAudio(
  audioUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string> {
  // 1. Скачивание с retry (3 попытки, экспоненциальная задержка)
  let response: Response;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await fetch(audioUrl, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      break; // Успешно скачано
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retry download in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(delayMs);
      }
    }
  }

  if (!response! || lastError) {
    console.error('Failed to download audio after retries:', lastError);
    return audioUrl; // Fallback: возвращаем исходный URL
  }

  // 2. Конвертация в Blob
  const audioBlob = await response.blob();
  const contentType = response.headers.get('content-type') || 'audio/mpeg';

  // 3. Загрузка в Supabase Storage
  const path = `${userId}/${trackId}/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from('tracks-audio')
    .upload(path, audioBlob, {
      contentType,
      upsert: true,
      cacheControl: '31536000' // 1 год
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return audioUrl; // Fallback: возвращаем исходный URL
  }

  // 4. Получение публичного URL
  const { data: { publicUrl } } = supabase.storage
    .from('tracks-audio')
    .getPublicUrl(path);

  console.log(`✅ Audio uploaded: ${path}`);
  return publicUrl;
}
```

**Параметры retry:**
- `MAX_RETRIES = 3`
- `RETRY_BASE_DELAY_MS = 1000` (экспоненциальная задержка: 1s, 2s, 4s)
- `DOWNLOAD_TIMEOUT_MS = 60000` (60 секунд на скачивание)

**Fallback:** Если загрузка не удалась после всех попыток, возвращается исходный URL от Suno.

#### Аналогичные функции:
- `downloadAndUploadCover` - для обложек (tracks-covers bucket)
- `downloadAndUploadVideo` - для видео (tracks-videos bucket)

---

## 3. Frontend: Отображение и управление версиями

### 3.1 API Layer

#### Функция `getTrackWithVersions`
**Код:** `src/features/tracks/api/trackVersions.ts:262-395`

**ДО ИСПРАВЛЕНИЯ (проблема):**
```typescript
// ❌ ПРОБЛЕМА: Fallback выполнялся всегда, создавая дубликаты
const allVersions = new Map<string, TrackWithVersions>();

// Извлечение из metadata.suno_data (fallback)
if (mainTrack.metadata?.suno_data?.length > 0) {
  mainTrack.metadata.suno_data.forEach((versionData, index) => {
    allVersions.set(versionData.id, {
      id: versionData.id,
      sourceVersionNumber: index,  // 0, 1
      ...
    });
  });
}

// Добавление основного трека
if (mainTrack.audio_url) {
  allVersions.set(mainTrack.id, {
    id: mainTrack.id,
    sourceVersionNumber: 0,
    ...
  });
}

// Добавление версий из БД
if (dbVersions?.length > 0) {
  dbVersions.forEach(version => {
    allVersions.set(version.id, {
      id: version.id,
      sourceVersionNumber: version.variant_index,  // 1
      ...
    });
  });
}

// Результат: 3+ версии (дубликаты!)
// - suno_data[0] (id: "suno-clip-1", sourceVersionNumber: 0)
// - mainTrack (id: track.id, sourceVersionNumber: 0)
// - suno_data[1] (id: "suno-clip-2", sourceVersionNumber: 1)
// - dbVersion[0] (id: version.id, sourceVersionNumber: 1)
```

**ПОСЛЕ ИСПРАВЛЕНИЯ (2025-11-05):**
```typescript
// ✅ FIX: Fallback используется ТОЛЬКО если нет версий в БД
const allVersions = new Map<string, TrackWithVersions>();
const useMetadataFallback = !dbVersions || dbVersions.length === 0;

// Fallback только если БД пустая
if (useMetadataFallback && mainTrack.metadata?.suno_data?.length > 0) {
  mainTrack.metadata.suno_data.forEach((versionData, index) => {
    allVersions.set(versionData.id, {
      id: versionData.id,
      sourceVersionNumber: index,
      ...
    });
  });
}

// Добавление основного трека
if (mainTrack.audio_url) {
  allVersions.set(mainTrack.id, {
    id: mainTrack.id,
    sourceVersionNumber: 0,
    isMasterVersion: true,
    ...
  });
}

// Добавление версий из БД (авторитетный источник)
if (dbVersions?.length > 0) {
  dbVersions.forEach(version => {
    allVersions.set(version.id, {
      id: version.id,
      sourceVersionNumber: version.variant_index,
      isMasterVersion: Boolean(version.is_preferred_variant),
      ...
    });
  });
}

// Результат: 2 версии (без дубликатов!)
// - mainTrack (id: track.id, sourceVersionNumber: 0, isMasterVersion: true)
// - dbVersion[0] (id: version.id, sourceVersionNumber: 1, isMasterVersion: false)
```

**Логика определения мастер-версии:**
```typescript
// 1. Найти версию с is_preferred_variant: true
const masterVersion = normalizedVersions.find(v => v.isMasterVersion);

// 2. Fallback: первая версия с audio_url
if (!masterVersion && normalizedVersions.length > 0) {
  const firstWithAudio = normalizedVersions.find(v => v.audio_url);
  if (firstWithAudio) {
    firstWithAudio.isMasterVersion = true;
  }
}

// 3. Сортировка по sourceVersionNumber
normalizedVersions.sort((a, b) =>
  (a.sourceVersionNumber ?? 0) - (b.sourceVersionNumber ?? 0)
);
```

#### Функция `setMasterVersion`
**Код:** `src/features/tracks/api/trackVersions.ts:127-173`

Устанавливает выбранную версию как мастер-версию (отображается звёздочкой в UI):

```typescript
export async function setMasterVersion(
  parentTrackId: string,
  versionId: string
): Promise<Result<TrackVersionRow>> {
  // 1. Сбросить is_preferred_variant для всех версий этого трека
  await supabase
    .from('track_versions')
    .update({ is_preferred_variant: false })
    .eq('parent_track_id', parentTrackId);

  // 2. Установить is_preferred_variant: true для выбранной версии
  const result = await supabase
    .from('track_versions')
    .update({ is_preferred_variant: true })
    .eq('id', versionId)
    .select()
    .single();

  if (result.error) {
    return { ok: false, error: new TrackVersionError(...) };
  }

  return { ok: true, data: result.data };
}
```

### 3.2 React Hooks

#### Hook `useTrackVersions`
**Код:** `src/features/tracks/hooks/useTrackVersions.ts:219-379`

Предоставляет удобный интерфейс для работы с версиями:

```typescript
const {
  versions,            // Дополнительные версии (без основной)
  allVersions,         // Все версии (включая основную)
  isLoading,
  versionCount,        // Количество дополнительных версий
  mainVersion,         // Основная версия (sourceVersionNumber: 0)
  masterVersion,       // Мастер-версия (is_preferred_variant: true)
  hasVersions,         // Есть ли дополнительные версии
  loadVersions,        // Ручная перезагрузка
  setMasterVersion,    // Установка мастер-версии
  error
} = useTrackVersions(trackId);
```

**Особенности:**
- Автоматическая загрузка при монтировании
- Кэширование с подпиской на обновления
- Дедупликация запросов (предотвращение дублирующихся fetch)
- Фильтрация версий: `versions` = версии с `sourceVersionNumber >= 1`

**Кэш-система:**
```typescript
// Глобальный кэш версий (singleton)
const versionsCache = new Map<string, TrackWithVersions[]>();
const listeners = new Map<string, Set<VersionsListener>>();
const inFlightRequests = new Map<string, Promise<TrackWithVersions[]>>();

// Подписка на обновления
export const subscribeToTrackVersions = (trackId, listener) => {
  // Вызывается при обновлении кэша
  const subscribers = listeners.get(trackId) ?? new Set();
  subscribers.add(listener);
  listeners.set(trackId, subscribers);

  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) listeners.delete(trackId);
  };
};

// Инвалидация кэша
export const invalidateTrackVersionsCache = (trackId) => {
  versionsCache.delete(trackId);
  notifyListeners(trackId, []);
};
```

#### Hook `useTrackVersionCount`
**Код:** `src/features/tracks/hooks/useTrackVersions.ts:390-421`

Легковесная версия для получения только количества версий (для бейджей):

```typescript
const versionCount = useTrackVersionCount(trackId);
// Возвращает количество дополнительных версий (без основной)
```

### 3.3 UI Components

#### Component `MinimalVersionsList`
**Код:** `src/features/tracks/ui/MinimalVersionsList.tsx`

Отображает список версий в компактном формате:

```typescript
export const MinimalVersionsList = memo(({ trackId }) => {
  // Загрузка версий
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["track-versions-minimal", trackId],
    queryFn: async () => {
      const { data } = await supabase
        .from("track_versions")
        .select("*")
        .eq("parent_track_id", trackId)
        .order("variant_index", { ascending: true });
      return data || [];
    }
  });

  // Загрузка основного трека
  const { data: mainTrack } = useQuery({
    queryKey: ["track-main", trackId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tracks")
        .select("id, title, audio_url, cover_url, duration_seconds")
        .eq("id", trackId)
        .single();
      return data;
    }
  });

  // Объединение версий
  const allVersions = useMemo(() => {
    if (mainTrack) {
      return [
        {
          id: mainTrack.id,
          variant_index: 0,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url,
          duration: mainTrack.duration_seconds,
          is_preferred_variant: false,
          is_primary: true,
        },
        ...versions,
      ];
    }
    return versions;
  }, [mainTrack, versions]);

  // Отображение только 2 версий: основная + последняя
  const displayVersions = useMemo(() => {
    if (allVersions.length <= 2) return allVersions;
    const hasMain = Boolean(mainTrack);
    if (hasMain) {
      const last = versions[versions.length - 1];
      return [allVersions[0], last];
    }
    return allVersions.slice(0, 2);
  }, [allVersions, mainTrack, versions]);

  return (
    <div className="space-y-1.5">
      {displayVersions.map((version, index) => {
        const isMain = index === 0 && mainTrack;

        return (
          <div key={version.id} className="flex items-center gap-2 p-2">
            <div className="flex-1">
              <p className="text-xs">
                {isMain ? "Основная" : `V${version.variant_index}`}
              </p>
              {!isMain && version.is_preferred_variant && (
                <Star className="h-3 w-3 fill-yellow-500" />
              )}
            </div>

            <Button onClick={() => handlePlay(version)}>
              <Play className="h-3 w-3" />
            </Button>

            <Button onClick={() => handleDownload(version.audio_url)}>
              <Download className="h-3 w-3" />
            </Button>

            {!isMain && (
              <Button onClick={() => handleSetMaster(version.id)}>
                <Star className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
});
```

**Ключевые элементы UI:**
- "Основная" - основная версия из `tracks` таблицы
- "V1", "V2", ... - дополнительные версии из `track_versions`
- ⭐ Звёздочка - мастер-версия (`is_preferred_variant: true`)
- ▶ Кнопка Play - воспроизведение версии
- ⬇ Кнопка Download - скачивание версии
- ⭐ Кнопка Star - установка версии как мастер-версии

#### Component `DetailPanelMobile`
**Код:** `src/features/tracks/ui/DetailPanelMobile.tsx:282-292`

Встраивает `MinimalVersionsList` в аккордеон:

```typescript
<AccordionItem value="versions" className="border rounded-lg px-3">
  <AccordionTrigger className="py-2.5 hover:no-underline">
    <div className="flex items-center gap-2">
      <Music className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{t('trackDetails.versions')}</span>
    </div>
  </AccordionTrigger>
  <AccordionContent className="pb-3">
    <MinimalVersionsList trackId={track.id} />
  </AccordionContent>
</AccordionItem>
```

---

## 4. Проблемы и решения

### 4.1 Проблема: Дублирование версий (2025-11-05)

#### Симптомы
- Система отображала 3 версии вместо 2
- Версия 2 дублировала мастер-версию
- В БД были корректные данные, но frontend отображал дубликаты

#### Корневая причина
Функция `getTrackWithVersions` использовала fallback из `metadata.suno_data` **всегда**, даже когда версии уже были в таблице `track_versions`. Это создавало дублирующиеся записи в результирующем массиве.

**Пример:**
- `tracks` таблица: main track (suno_id: "clip-1", audio_url: "main.mp3")
- `metadata.suno_data`: 2 элемента (clip-1, clip-2)
- `track_versions`: 1 запись (variant_index: 1, suno_id: "clip-2")

**Результат до исправления:**
```typescript
allVersions = [
  { id: "clip-1", sourceVersionNumber: 0 },  // из metadata.suno_data[0]
  { id: track.id, sourceVersionNumber: 0 },  // из tracks table
  { id: "clip-2", sourceVersionNumber: 1 },  // из metadata.suno_data[1]
  { id: version.id, sourceVersionNumber: 1 } // из track_versions
]
// Итого: 4 версии (дублирование!)
```

#### Решение
Добавлена проверка: fallback из `metadata.suno_data` используется **только если** в БД нет версий:

```typescript
const useMetadataFallback = !dbVersions || dbVersions.length === 0;

if (useMetadataFallback && mainTrack.metadata?.suno_data?.length > 0) {
  // Извлечение из metadata
}
```

**Результат после исправления:**
```typescript
allVersions = [
  { id: track.id, sourceVersionNumber: 0 },  // из tracks table
  { id: version.id, sourceVersionNumber: 1 } // из track_versions
]
// Итого: 2 версии (без дубликатов!)
```

**Файл:** `src/features/tracks/api/trackVersions.ts:284-286`
**Коммит:** (будет в следующем коммите)

### 4.2 Проблема: Версии с variant_index = 0 (2025-11-04)

#### Симптомы
- В таблице `track_versions` были записи с `variant_index = 0`
- Эти записи дублировали основной трек из `tracks` таблицы

#### Корневая причина
До 2025-11-04 webhook `suno-callback` начинал цикл с `i = 0`:

```typescript
// ❌ ДО ИСПРАВЛЕНИЯ
for (let i = 0; i < successfulTracks.length; i++) {
  const variantIndex = i;
  // Сохранение в track_versions с variant_index: 0, 1
}
```

Это создавало дублирующуюся запись для `successfulTracks[0]`, который уже был сохранён в `tracks` таблице.

#### Решение
1. **Исправление webhook:** Цикл начинается с `i = 1`:
```typescript
// ✅ ПОСЛЕ ИСПРАВЛЕНИЯ
for (let i = 1; i < successfulTracks.length; i++) {
  const variantIndex = i;
  // Сохранение в track_versions с variant_index: 1, 2, ...
}
```

2. **Миграция БД:** Удаление старых дубликатов:
```sql
DELETE FROM track_versions WHERE variant_index = 0;
```

**Файлы:**
- `supabase/functions/suno-callback/index.ts:430`
- `supabase/migrations/20251104203200_remove_duplicate_track_versions.sql`

### 4.3 Проблема: Realtime обновления версий

#### Симптомы
- При создании новой версии UI не обновлялся автоматически
- Требовалась ручная перезагрузка страницы

#### Решение
Использование кэш-системы с подписками в `useTrackVersions`:

```typescript
// Подписка на обновления кэша
useEffect(() => {
  const unsubscribe = subscribeToTrackVersions(trackId, setAllVersions);

  return () => {
    unsubscribe();
  };
}, [trackId]);

// При создании новой версии через webhook:
await supabase.from('track_versions').insert(newVersion);

// Инвалидация кэша (вызывается вручную или через Supabase realtime)
invalidateTrackVersionsCache(trackId);
// → все подписчики получат уведомление → UI обновится
```

**Примечание:** Полноценная Supabase Realtime подписка ещё не реализована, но инфраструктура готова.

---

## 5. Безопасность

### 5.1 Webhook Signature Verification
**Код:** `supabase/functions/suno-callback/index.ts`

```typescript
const signature = req.headers.get('x-suno-signature');
const webhookSecret = Deno.env.get('SUNO_WEBHOOK_SECRET');

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const encoder = new TextEncoder();
  const key = encoder.encode(webhookSecret);
  const data = encoder.encode(payload);

  // HMAC-SHA256
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

if (!verifyWebhookSignature(payloadString, signature)) {
  return new Response('Invalid signature', { status: 401 });
}
```

### 5.2 Payload Size Limit
```typescript
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

if (req.headers.get('content-length') > MAX_PAYLOAD_SIZE) {
  return new Response('Payload too large', { status: 413 });
}
```

### 5.3 Row Level Security (RLS)
Все операции с версиями проходят через RLS политики, которые проверяют:
- Пользователь может видеть только версии своих треков
- Пользователь может создавать версии только для своих треков
- Пользователь может обновлять/удалять только версии своих треков

### 5.4 CORS
CORS настроен только для localhost (whitelist):

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 6. Производительность

### 6.1 Индексы БД
```sql
CREATE INDEX idx_track_versions_parent ON track_versions(parent_track_id);
CREATE INDEX idx_track_versions_master ON track_versions(parent_track_id, is_preferred_variant);
```

### 6.2 Кэширование
- **Frontend:** Кэш версий в памяти (`Map`) с подписками
- **Storage:** CDN caching с `Cache-Control: 31536000` (1 год)

### 6.3 Ленивая загрузка
- Версии загружаются только при раскрытии аккордеона
- Используется `React.memo` для предотвращения лишних рендеров

### 6.4 Retry механизм
- 3 попытки для скачивания файлов
- Экспоненциальная задержка: 1s, 2s, 4s
- Fallback на исходный URL при неудаче

---

## 7. Мониторинг и логирование

### 7.1 Централизованный логгер
Все операции логируются через `logger` из `@/utils/logger`:

```typescript
import { logger } from '@/utils/logger';

logger.info('Track versions loaded', 'trackVersions', {
  trackId,
  dbVersionsCount: 1,
  usedMetadataFallback: false,
  normalizedVersionsCount: 2
});

logger.error('Failed to load versions', error, 'trackVersions', { trackId });
```

### 7.2 Sentry Integration
В production все ошибки автоматически отправляются в Sentry:

```typescript
if (import.meta.env.PROD) {
  Sentry.captureException(error, {
    tags: { module: 'trackVersions' },
    extra: { trackId, context }
  });
}
```

### 7.3 Webhook Logs
```typescript
console.log('[suno-callback] Creating 1 additional versions');
console.log('[suno-callback] ✅ Version 1 saved');
console.log('[suno-callback] ↪︎ Skip existing version for suno_id=clip-1');
```

---

## 8. Диагностика

### 8.1 SQL-запросы для отладки
См. файл `debug_versions.sql` в корне проекта.

**Ключевые запросы:**
1. Проверка версий конкретного трека
2. Поиск треков с несколькими версиями
3. Поиск дублирующихся версий с variant_index = 0
4. Проверка дублирующихся suno_id между tracks и track_versions

### 8.2 Frontend DevTools
```javascript
// В консоли браузера
// Проверка кэша версий
import { versionsCache } from '@/features/tracks/hooks/useTrackVersions';
console.log(versionsCache);

// Инвалидация кэша
import { invalidateTrackVersionsCache } from '@/features/tracks/hooks/useTrackVersions';
invalidateTrackVersionsCache('track-id');
```

---

## 9. Рекомендации

### 9.1 Немедленные действия
1. ✅ **Исправлено:** Устранить дублирование в `getTrackWithVersions`
2. ⏳ **Требуется:** Запустить миграцию `20251104203200_remove_duplicate_track_versions.sql` на production
3. ⏳ **Требуется:** Проверить существующие треки на дубликаты с помощью `debug_versions.sql`

### 9.2 Улучшения
1. **Realtime подписки:** Добавить Supabase Realtime для автоматического обновления версий
2. **Prefetching:** Предзагружать версии для видимых треков
3. **Lazy loading:** Загружать только видимые версии в длинных списках
4. **Compression:** Использовать сжатие для больших аудио-файлов
5. **Transcoding:** Добавить конвертацию в разные форматы (MP3, FLAC, AAC)

### 9.3 Мониторинг
1. Добавить метрики:
   - Время загрузки версий
   - Частота дублирования версий
   - Процент успешных загрузок в Storage
2. Настроить алерты:
   - Версии с variant_index = 0 (не должны существовать)
   - Треки с более чем 2 версиями (подозрение на дублирование)
   - Неудачные загрузки в Storage

---

## 10. Выводы

### Текущее состояние
- ✅ Система версионирования работает корректно
- ✅ Webhook обрабатывает 2 варианта от Suno
- ✅ Storage надёжно хранит файлы с retry-механизмом
- ✅ Frontend корректно отображает версии после исправления
- ✅ RLS обеспечивает безопасность

### Исправленная проблема
- ✅ Дублирование версий в `getTrackWithVersions` устранено
- ✅ Fallback из metadata используется только при отсутствии версий в БД

### Pending Items
- ⏳ Запуск миграции для удаления старых дубликатов
- ⏳ Проверка production БД на дубликаты
- ⏳ Добавление Realtime подписок для автоматического обновления UI

---

**Документ подготовлен:** 2025-11-05
**Автор:** Claude Code
**Версия:** 1.0
