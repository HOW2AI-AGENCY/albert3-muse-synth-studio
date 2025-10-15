# Music Providers Guide

## Обзор

Albert3 Muse Synth Studio поддерживает несколько провайдеров для генерации музыки:

- **Suno AI** - Основной провайдер с полным набором функций
- **Mureka AI** - Альтернативный провайдер с уникальными возможностями

---

## 🎯 Сравнительная таблица возможностей

| Возможность | Suno AI | Mureka AI |
|-------------|---------|-----------|
| **Генерация музыки** | ✅ | ✅ |
| **Кастомный режим** | ✅ | ✅ |
| **Референсное аудио** | ✅ File URL | ✅ File ID (после загрузки) |
| **Генерация текстов** | ✅ | ✅ |
| **Продление текстов** | ✅ | ✅ |
| **Extend Track** | ✅ | ❌ |
| **Create Cover** | ✅ | ❌ |
| **Separate Stems** | ✅ | ✅ |
| **Add Instrumental** | ✅ | ✅ |
| **Download WAV** | ✅ | ❌ |
| **Song Recognition** | ❌ | ✅ |
| **Song Description** | ❌ | ✅ |

---

## 📚 Suno AI Best Practices

### 1. Генерация музыки

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('generate-suno', {
  body: {
    prompt: "Uplifting electronic dance music",
    tags: "edm, energetic, uplifting",
    title: "Dance All Night",
    customMode: true,
    make_instrumental: false,
    model: "V5",
    referenceAudioUrl: "https://example.com/reference.mp3" // Optional
  }
});
```

**Важные параметры:**

- `prompt` - Описание желаемой музыки (обязательно)
- `tags` - Стили и теги через запятую (обязательно для Custom Mode)
- `customMode` - Включить кастомный режим для большего контроля
- `model` - Модель генерации: `V3_5`, `V4`, `V4_5`, `V4_5PLUS`, `V5`
- `referenceAudioUrl` - URL референсного аудио (не требует предварительной загрузки)

### 2. Stem Separation (Разделение на стемы)

```typescript
const { data, error } = await supabase.functions.invoke('separate-stems', {
  body: {
    trackId: "uuid-of-track",
    separationMode: "separate_vocal" // or "split_stem"
  }
});
```

**Режимы разделения:**

- `separate_vocal` - Базовое разделение на вокал + инструментал (2 стема)
- `split_stem` - Полное разделение на все инструменты (до 12 стемов)

### 3. Add Instrumental

```typescript
const { data, error } = await supabase.functions.invoke('add-instrumental', {
  body: {
    uploadUrl: "https://storage.url/vocals.mp3",
    title: "My Track",
    tags: "pop, upbeat",
    negativeTags: "slow, sad",
    model: "V4_5PLUS"
  }
});
```

### 4. Extend Track

```typescript
const { data, error } = await supabase.functions.invoke('extend-track', {
  body: {
    trackId: "uuid-of-track",
    continueAt: 120, // Продолжить с 120 секунды
    duration: 60     // Добавить 60 секунд
  }
});
```

### 5. Create Cover

```typescript
const { data, error } = await supabase.functions.invoke('create-cover', {
  body: {
    referenceTrackId: "uuid-of-reference-track",
    prompt: "Rock version",
    tags: "rock, electric guitar, drums"
  }
});
```

---

## 🎨 Mureka AI Best Practices

### 1. Генерация музыки

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('generate-mureka', {
  body: {
    prompt: "Uplifting electronic dance music",
    title: "Dance All Night",
    style: "edm",
    model: "chirp-v4",
    instrumental: false,
    // referenceAudioUrl НЕ поддерживается напрямую
    // Требуется предварительная загрузка через uploadFile
  }
});
```

**⚠️ Важные отличия от Suno:**

- `referenceAudioUrl` не поддерживается напрямую
- Требуется загрузка файла через `uploadFile` API для получения `file_id`
- После получения `file_id` используйте параметр `ref_id` в генерации

### 2. Работа с референсным аудио

```typescript
// 1. Загрузить файл в Mureka
const uploadResponse = await fetch(referenceAudioUrl);
const audioBlob = await uploadResponse.blob();

const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
const uploadResult = await murekaClient.uploadFile(audioBlob);
const fileId = uploadResult.file_id;

// 2. Использовать file_id для генерации
const { data, error } = await supabase.functions.invoke('generate-mureka', {
  body: {
    prompt: "Create similar music",
    ref_id: fileId, // Используем загруженный file_id
    title: "Similar Track",
    model: "chirp-v4"
  }
});
```

### 3. Stem Separation

```typescript
const { data, error } = await supabase.functions.invoke('separate-stems', {
  body: {
    trackId: "uuid-of-mureka-track",
    separationMode: "split_stem" // Mureka поддерживает оба режима
  }
});
```

**✅ Mureka поддерживает stem separation!**  
Используется endpoint: `POST https://api.mureka.ai/v1/song/stem`

### 4. Add Instrumental

```typescript
const { data, error } = await supabase.functions.invoke('add-instrumental-mureka', {
  body: {
    uploadUrl: "https://storage.url/vocals.mp3",
    title: "My Track",
    prompt: "Add upbeat instrumental with drums and guitar",
    model: "chirp-v4"
  }
});
```

**⚠️ Отличия от Suno:**

- Вместо `tags` и `negativeTags` используется `prompt`
- Модель: `chirp-v4` (не `V4_5PLUS` или `V5`)
- Автоматическая загрузка файла в Mureka

### 5. Song Recognition

```typescript
const { data, error } = await supabase.functions.invoke('recognize-song', {
  body: {
    audioFileUrl: "https://storage.url/song.mp3"
  }
});

// Response includes:
// - recognized_title
// - recognized_artist
// - recognized_album
// - confidence_score
```

**🎵 Уникальная возможность Mureka!**  
Определяет название, исполнителя и альбом по аудио.

### 6. Song Description (AI Analysis)

```typescript
const { data, error } = await supabase.functions.invoke('describe-song', {
  body: {
    trackId: "uuid-of-track",
    audioFileUrl: "https://storage.url/song.mp3"
  }
});

// Response includes:
// - ai_description
// - detected_genre
// - detected_mood
// - detected_instruments
// - tempo_bpm
// - energy_level
// - danceability
```

**🎨 Уникальная возможность Mureka!**  
AI анализ музыки с детальным описанием.

---

## 🔄 Миграция между провайдерами

### Suno → Mureka

**Что работает одинаково:**

- Генерация музыки с промптом
- Stem separation
- Add instrumental

**Что требует адаптации:**

```typescript
// Suno
{
  referenceAudioUrl: "https://example.com/reference.mp3"
}

// Mureka (требуется загрузка)
const fileId = await uploadToMureka(referenceAudioUrl);
{
  ref_id: fileId
}
```

**Что не поддерживается в Mureka:**

- Extend Track
- Create Cover
- Download WAV

---

## 🛠️ Troubleshooting

### Suno API

**Problem**: Ошибка 429 (Rate Limit)

```typescript
// Решение: Exponential backoff с повтором
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    const response = await sunoClient.generateTrack(payload);
    break;
  } catch (error) {
    if (error.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      continue;
    }
    throw error;
  }
}
```

**Problem**: Отсутствует `suno_task_id`

```typescript
// Решение: Проверить metadata трека
const trackMetadata = track.metadata as Record<string, unknown>;
const taskId = trackMetadata.suno_task_id;

if (!taskId) {
  throw new Error('Missing Suno task identifier');
}
```

### Mureka API

**Problem**: Референсное аудио не работает

```typescript
// ❌ Неправильно
{
  referenceAudioUrl: "https://example.com/reference.mp3"
}

// ✅ Правильно
const fileId = await murekaClient.uploadFile(audioBlob);
{
  ref_id: fileId
}
```

**Problem**: Недоступны Extend/Cover

```typescript
// Решение: Использовать Suno для этих операций
const provider = track.provider;

if (['extend', 'cover'].includes(operation)) {
  if (provider === 'mureka') {
    throw new Error('Extend/Cover доступны только для Suno треков');
  }
  // Продолжить с Suno
}
```

---

## 📊 Performance Tips

### Suno AI

1. **Используйте Circuit Breaker** для автоматического фолбэка при ошибках
2. **Кешируйте balance** на 5 минут (300 секунд)
3. **Batch polling** для нескольких треков одновременно
4. **Оптимизируйте референсное аудио**: сжимайте до MP3 192kbps

### Mureka AI

1. **Переиспользуйте file_id**: не загружайте один файл дважды
2. **Асинхронная загрузка**: загружайте файлы в background
3. **Polling с интервалом 5 секунд** для задач
4. **Используйте Song Description** для автотегирования треков

---

## 🔐 Security

### API Keys Management

```typescript
// ❌ Не делайте так
const SUNO_API_KEY = "sk-123456789";

// ✅ Используйте переменные окружения
const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');

if (!SUNO_API_KEY || !MUREKA_API_KEY) {
  throw new Error('API keys not configured');
}
```

### RLS Policies

```sql
-- Tracks доступны только владельцу или публичные
CREATE POLICY "Users can view own tracks"
  ON tracks FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Stem separation только для своих треков
CREATE POLICY "Users can separate stems for own tracks"
  ON tracks FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 📖 API Reference

### Suno API Endpoints

- `POST /api/v1/generate` - Генерация музыки
- `GET /api/v1/generate/record-info?taskId=xxx` - Статус задачи
- `POST /api/v1/vocal-removal/generate` - Stem separation
- `GET /api/v1/vocal-removal/record-info?taskId=xxx` - Статус стемов
- `POST /api/v1/lyrics/generate` - Генерация текстов
- `POST /api/v1/generate/extend` - Продление трека
- `POST /api/v1/generate/add-instrumental` - Добавление инструментала

### Mureka API Endpoints

- `POST /v1/song/generate` - Генерация музыки
- `GET /v1/song/query/{task_id}` - Статус задачи
- `POST /v1/song/stem` - Stem separation
- `GET /v1/song/stem/{task_id}` - Статус стемов
- `POST /v1/files/upload` - Загрузка файла
- `POST /v1/instrumental/generate` - Генерация инструментала
- `GET /v1/instrumental/query/{task_id}` - Статус инструментала
- `POST /v1/song/recognize` - Распознавание песни
- `POST /v1/song/describe` - Описание песни
- `POST /v1/lyrics/generate` - Генерация текстов
- `POST /v1/lyrics/extend` - Продление текстов

---

*Last updated: 2025-10-15*  
*Version: 2.4.0*
