# 🔌 API Документация Albert3 Muse Synth Studio

[![API Version](https://img.shields.io/badge/API-v1.3.0-blue.svg)](https://github.com/your-repo/albert3-muse-synth-studio)
[![Last Updated](https://img.shields.io/badge/Updated-January%202025-green.svg)](https://github.com/your-repo/albert3-muse-synth-studio)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](https://github.com/your-repo/albert3-muse-synth-studio)

## 📋 Обзор API

Albert3 Muse Synth Studio предоставляет современный RESTful API через Supabase Edge Functions для генерации музыки с помощью ИИ, создания текстов песен, разделения треков на стемы и обработки аудио. Все эндпоинты требуют аутентификации через JWT токены и поддерживают real-time уведомления.

### Базовый URL
```
https://[your-project-id].supabase.co/functions/v1/
```

### Аутентификация
Все запросы должны содержать заголовок Authorization:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Поддерживаемые форматы
- **Входные данные:** JSON
- **Аудио форматы:** MP3, WAV, FLAC
- **Изображения:** JPEG, PNG, WebP
- **Максимальный размер файла:** 50MB

---

## 🎵 Эндпоинты для генерации музыки

### 1. Генерация музыки через Suno AI

**Эндпоинт:** `POST /generate-music-suno`

Создает задачу генерации музыки в Suno AI. Edge Function вызывает прокси `sunoapi.org` (с fallback на официальные Suno endpoints), автоматически создаёт запись в `tracks`/`ai_jobs` и инициирует асинхронный поллинг результата.

#### Параметры запроса

```typescript
interface SunoGenerationRequest {
  prompt: string;                    // Описание желаемой музыки (обязательно)
  tags?: string[];                   // Теги/жанры (массив)
  title?: string;                    // Название композиции
  make_instrumental?: boolean;       // Инструментальная версия (по умолчанию: false)
  wait_audio?: boolean;              // Ждать готовый аудиофайл (по умолчанию: false)
  model_version?: string;            // Версия модели (по умолчанию: "chirp-v3-5")
  idempotencyKey?: string;           // Опциональный ключ идемпотентности
  trackId?: string;                  // Существующий трек для перегенерации
  continue_clip_id?: string | null;  // ID клипа для продолжения (опционально)
  audio_prompt_id?: string | null;   // ID аудиоподсказки (опционально)
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-music-suno" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Энергичная рок-композиция с гитарными соло и мощными барабанами",
    "tags": ["rock", "energetic", "guitar solo"],
    "title": "Электрический шторм",
    "make_instrumental": false,
    "wait_audio": false,
    "model_version": "chirp-v3-5",
    "idempotencyKey": "f4d58b3b-7b7d-4f75-a0f2-123456789abc"
  }'
```

#### Ответ

```typescript
interface SunoGenerationResponse {
  success: boolean;
  trackId: string;                  // ID трека в таблице tracks
  taskId: string;                   // Task ID из Suno API
  jobId?: string | null;            // Ссылка на запись в таблице ai_jobs
  message: string;                  // Текстовое описание статуса
  error?: string;                   // Сообщение об ошибке (если success = false)
  details?: {
    endpoint?: string | null;       // Endpoint Suno, вернувший ошибку
    status?: number | null;         // HTTP статус Suno API
    body?: string | null;           // Тело ответа Suno (для отладки)
  } | string;                        // Либо строка с описанием ошибки
}
```

#### Коды ответов
- `200` — задача успешно создана или возобновлена (идемпотентный ответ)
- `401` — неавторизованный доступ или ошибка токена Suno
- `402` — недостаточно средств на аккаунте Suno
- `404` — указанный трек не найден или недоступен
- `429` — Suno вернул превышение лимита (повторите позже)
- `5xx` — внутренняя ошибка Suno или нашей функции (см. `details`)

---

### 2. Генерация музыки через Replicate

**Эндпоинт:** `POST /generate-music-replicate`

Создает музыкальную композицию с помощью различных моделей на платформе Replicate.

#### Параметры запроса

```typescript
interface ReplicateGenerationRequest {
  model: string;                     // Модель для генерации (обязательно)
  prompt: string;                    // Описание желаемой музыки (обязательно)
  duration?: number;                 // Длительность в секундах (по умолчанию: 30)
  temperature?: number;              // Креативность (0.0-1.0, по умолчанию: 0.8)
  top_k?: number;                   // Top-k sampling (по умолчанию: 250)
  top_p?: number;                   // Top-p sampling (по умолчанию: 0.0)
  seed?: number;                    // Seed для воспроизводимости
  format?: "wav" | "mp3";           // Формат выходного файла (по умолчанию: "wav")
  normalization_strategy?: "loudness" | "clip" | "peak" | "rms"; // Стратегия нормализации
  user_id?: string;                 // ID пользователя
}
```

#### Доступные модели

- `facebook/musicgen-large`: Большая модель MusicGen для высококачественной генерации
- `facebook/musicgen-medium`: Средняя модель MusicGen (баланс качества и скорости)
- `facebook/musicgen-small`: Компактная модель MusicGen для быстрой генерации
- `riffusion/riffusion`: Модель Riffusion для экспериментальной генерации
- `meta-llama/musicgen-stereo-large`: Стерео версия MusicGen

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-music-replicate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "facebook/musicgen-large",
    "prompt": "Спокойная джазовая композиция с саксофоном и фортепиано",
    "duration": 60,
    "temperature": 0.7,
    "format": "mp3",
    "normalization_strategy": "loudness"
  }'
```

#### Ответ

```typescript
interface ReplicateGenerationResponse {
  success: boolean;
  data?: {
    id: string;                     // ID предсказания Replicate
    status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
    urls?: string[];                // URLs сгенерированных аудиофайлов
    created_at: string;             // Время создания
    completed_at?: string;          // Время завершения
    model: string;                  // Использованная модель
    input: ReplicateGenerationRequest; // Входные параметры
    logs?: string;                  // Логи генерации
    error?: string;                 // Сообщение об ошибке (если есть)
  };
  error?: string;                   // Общее сообщение об ошибке
  request_id?: string;              // ID запроса для отслеживания
}
```

---

---

## 🎛️ Эндпоинты для обработки аудио

### 1. Разделение треков на стемы

**Эндпоинт:** `POST /separate-stems`

Разделяет аудиотрек на отдельные инструментальные стемы (вокал, барабаны, бас, другие инструменты).

#### Параметры запроса

```typescript
interface StemSeparationRequest {
  audio_url?: string;                // URL аудиофайла (обязательно, если нет audio_file)
  audio_file?: File;                 // Файл аудио (обязательно, если нет audio_url)
  model?: "spleeter" | "demucs" | "htdemucs"; // Модель для разделения (по умолчанию: "htdemucs")
  stems?: "2stems" | "4stems" | "5stems"; // Количество стемов (по умолчанию: "4stems")
  output_format?: "wav" | "mp3" | "flac"; // Формат выходных файлов (по умолчанию: "wav")
  quality?: "low" | "medium" | "high";    // Качество обработки (по умолчанию: "medium")
  normalize?: boolean;               // Нормализовать громкость (по умолчанию: true)
  track_id?: string;                 // ID трека в базе данных
  user_id?: string;                  // ID пользователя
}
```

#### Доступные модели и стемы

**Модели:**
- `spleeter`: Быстрая модель от Deezer (2, 4, 5 стемов)
- `demucs`: Высококачественная модель Facebook (4 стема)
- `htdemucs`: Улучшенная версия Demucs (4 стема, лучшее качество)

**Конфигурации стемов:**
- `2stems`: Вокал + Аккомпанемент
- `4stems`: Вокал + Барабаны + Бас + Другие инструменты
- `5stems`: Вокал + Барабаны + Бас + Фортепиано + Другие инструменты

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/separate-stems" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/track.mp3",
    "model": "htdemucs",
    "stems": "4stems",
    "output_format": "wav",
    "quality": "high",
    "normalize": true
  }'
```

#### Ответ

```typescript
interface StemSeparationResponse {
  success: boolean;
  data?: {
    id: string;                     // ID задачи разделения
    status: "queued" | "processing" | "completed" | "failed";
    input_file: {
      url: string;                  // URL исходного файла
      duration: number;             // Длительность в секундах
      format: string;               // Формат файла
      size: number;                 // Размер в байтах
    };
    stems?: {
      vocals?: string;              // URL файла с вокалом
      drums?: string;               // URL файла с барабанами
      bass?: string;                // URL файла с басом
      piano?: string;               // URL файла с фортепиано (только для 5stems)
      other?: string;               // URL файла с другими инструментами
      accompaniment?: string;       // URL файла с аккомпанементом (только для 2stems)
    };
    metadata: {
      model: string;                // Использованная модель
      stems_config: string;         // Конфигурация стемов
      processing_time: number;      // Время обработки в секундах
      quality: string;              // Качество обработки
    };
    created_at: string;             // Время создания
    completed_at?: string;          // Время завершения
  };
  error?: string;                   // Сообщение об ошибке
  request_id?: string;              // ID запроса для отслеживания
}
```

### 2. Получение статуса разделения стемов

**Эндпоинт:** `GET /separate-stems/{task_id}/status`

Получает текущий статус задачи разделения стемов.

#### Параметры запроса

- `task_id` (path parameter): ID задачи разделения

#### Пример запроса

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/separate-stems/123e4567-e89b-12d3-a456-426614174000/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Ответ

```typescript
interface StemSeparationStatusResponse {
  success: boolean;
  data?: {
    id: string;                     // ID задачи
    status: "queued" | "processing" | "completed" | "failed";
    progress?: number;              // Прогресс выполнения (0-100)
    estimated_time_remaining?: number; // Оставшееся время в секундах
    error_message?: string;         // Сообщение об ошибке (если статус "failed")
    stems?: {                       // Доступно только при статусе "completed"
      vocals?: string;
      drums?: string;
      bass?: string;
      piano?: string;
      other?: string;
      accompaniment?: string;
    };
  };
  error?: string;
}
```

---

## 🎤 Эндпоинты для работы с текстами песен

### 1. Генерация текстов песен

**Эндпоинт:** `POST /generate-lyrics`

Создает текст песни на основе темы, настроения и музыкального стиля с помощью ИИ.

#### Параметры запроса

```typescript
interface LyricsGenerationRequest {
  theme: string;                     // Тема песни (обязательно)
  mood?: string;                     // Настроение (например: "веселое", "грустное", "энергичное")
  genre?: string;                    // Музыкальный жанр (например: "рок", "поп", "джаз")
  language?: string;                 // Язык текста (по умолчанию: "ru")
  structure?: "verse-chorus" | "verse-chorus-bridge" | "custom"; // Структура песни
  length?: "short" | "medium" | "long"; // Длина текста (по умолчанию: "medium")
  style?: string;                    // Стиль написания (например: "поэтический", "разговорный")
  keywords?: string[];               // Ключевые слова для включения
  avoid_words?: string[];            // Слова, которых следует избегать
  user_id?: string;                  // ID пользователя
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-lyrics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "Путешествие по звездам",
    "mood": "мечтательное",
    "genre": "космический рок",
    "language": "ru",
    "structure": "verse-chorus-bridge",
    "length": "medium",
    "keywords": ["звезды", "космос", "мечты"],
    "style": "поэтический"
  }'
```

#### Ответ

```typescript
interface LyricsGenerationResponse {
  success: boolean;
  data?: {
    id: string;                     // Уникальный ID генерации
    lyrics: string;                 // Сгенерированный текст песни
    structure: {                    // Структура песни
      verses: string[];             // Куплеты
      chorus?: string;              // Припев
      bridge?: string;              // Бридж
      outro?: string;               // Концовка
    };
    metadata: {
      theme: string;                // Тема песни
      mood: string;                 // Настроение
      genre: string;                // Жанр
      language: string;             // Язык
      word_count: number;           // Количество слов
      estimated_duration: number;   // Примерная длительность в секундах
    };
    created_at: string;             // Время создания
  };
  error?: string;                   // Сообщение об ошибке
  request_id?: string;              // ID запроса для отслеживания
}
```

### 2. Улучшение промптов

**Эндпоинт:** `POST /improve-prompt`

Улучшает и расширяет пользовательский промпт для более качественной генерации музыки.

#### Параметры запроса

```typescript
interface PromptImprovementRequest {
  original_prompt: string;           // Исходный промпт (обязательно)
  target_service?: "suno" | "replicate" | "both"; // Целевой сервис (по умолчанию: "both")
  enhancement_level?: "light" | "medium" | "heavy"; // Уровень улучшения (по умолчанию: "medium")
  focus_areas?: string[];            // Области для улучшения (например: ["rhythm", "instruments", "mood"])
  language?: string;                 // Язык промпта (по умолчанию: "ru")
  user_id?: string;                  // ID пользователя
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/improve-prompt" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "original_prompt": "грустная песня",
    "target_service": "suno",
    "enhancement_level": "medium",
    "focus_areas": ["instruments", "mood", "tempo"],
    "language": "ru"
  }'
```

#### Ответ

```typescript
interface PromptImprovementResponse {
  success: boolean;
  data?: {
    original_prompt: string;        // Исходный промпт
    improved_prompt: string;        // Улучшенный промпт
    improvements: {
      added_elements: string[];     // Добавленные элементы
      enhanced_aspects: string[];   // Улучшенные аспекты
      suggestions: string[];        // Дополнительные предложения
    };
    target_service: string;         // Целевой сервис
    confidence_score: number;       // Оценка качества улучшения (0-1)
  };
  error?: string;                   // Сообщение об ошибке
  request_id?: string;              // ID запроса для отслеживания
}
```

---

## 🔄 Callback эндпоинты

### 1. Callback для Suno AI

**Эндпоинт:** `POST /suno-callback`

Получает уведомления о завершении генерации музыки через Suno AI.

#### Параметры запроса

```typescript
interface SunoCallbackRequest {
  id: string;                        // ID задачи генерации
  status: "queued" | "generating" | "completed" | "failed";
  clips?: Array<{
    id: string;                      // ID клипа
    title: string;                   // Название трека
    audio_url?: string;              // URL аудиофайла
    image_url?: string;              // URL изображения обложки
    video_url?: string;              // URL видеофайла
    lyric?: string;                  // Текст песни
    prompt?: string;                 // Использованный промпт
    tags?: string;                   // Теги/жанры
    duration?: number;               // Длительность в секундах
    created_at: string;              // Время создания
  }>;
  error_message?: string;            // Сообщение об ошибке
  metadata?: {
    model_version?: string;          // Версия модели Suno
    generation_time?: number;        // Время генерации в секундах
    credits_used?: number;           // Использованные кредиты
  };
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/suno-callback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "clips": [{
      "id": "clip_123",
      "title": "Электронная мечта",
      "audio_url": "https://suno.ai/audio/clip_123.mp3",
      "image_url": "https://suno.ai/images/clip_123.jpg",
      "lyric": "В мире электронных снов...",
      "prompt": "электронная музыка, мечтательная",
      "tags": "electronic, ambient",
      "duration": 180,
      "created_at": "2025-01-15T10:30:00Z"
    }],
    "metadata": {
      "model_version": "v3.5",
      "generation_time": 45,
      "credits_used": 10
    }
  }'
```

#### Ответ

```typescript
interface SunoCallbackResponse {
  success: boolean;
  message: string;                   // Сообщение о результате обработки
  processed_clips?: number;          // Количество обработанных клипов
  error?: string;                    // Сообщение об ошибке
}
```

### 2. Callback для разделения стемов

**Эндпоинт:** `POST /stems-callback`

Получает уведомления о завершении разделения аудио на стемы.

#### Параметры запроса

```typescript
interface StemsCallbackRequest {
  task_id: string;                   // ID задачи разделения
  status: "queued" | "processing" | "completed" | "failed";
  input_file: {
    url: string;                     // URL исходного файла
    duration: number;                // Длительность в секундах
    format: string;                  // Формат файла
    size: number;                    // Размер в байтах
  };
  stems?: {
    vocals?: string;                 // URL файла с вокалом
    drums?: string;                  // URL файла с барабанами
    bass?: string;                   // URL файла с басом
    piano?: string;                  // URL файла с фортепиано
    other?: string;                  // URL файла с другими инструментами
    accompaniment?: string;          // URL файла с аккомпанементом
  };
  metadata: {
    model: string;                   // Использованная модель
    stems_config: string;            // Конфигурация стемов
    processing_time: number;         // Время обработки в секундах
    quality: string;                 // Качество обработки
  };
  error_message?: string;            // Сообщение об ошибке
  created_at: string;                // Время создания задачи
  completed_at?: string;             // Время завершения
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/stems-callback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "456e7890-e89b-12d3-a456-426614174000",
    "status": "completed",
    "input_file": {
      "url": "https://example.com/track.mp3",
      "duration": 240,
      "format": "mp3",
      "size": 5242880
    },
    "stems": {
      "vocals": "https://storage.example.com/stems/vocals.wav",
      "drums": "https://storage.example.com/stems/drums.wav",
      "bass": "https://storage.example.com/stems/bass.wav",
      "other": "https://storage.example.com/stems/other.wav"
    },
    "metadata": {
      "model": "htdemucs",
      "stems_config": "4stems",
      "processing_time": 120,
      "quality": "high"
    },
    "created_at": "2025-01-15T10:30:00Z",
    "completed_at": "2025-01-15T10:32:00Z"
  }'
```

#### Ответ

```typescript
interface StemsCallbackResponse {
  success: boolean;
  message: string;                   // Сообщение о результате обработки
  stems_saved?: number;              // Количество сохраненных стемов
  track_updated?: boolean;           // Обновлен ли трек в базе данных
  error?: string;                    // Сообщение об ошибке
}
```

### 3. Webhook для уведомлений

**Эндпоинт:** `POST /webhook-notifications`

Универсальный webhook для получения уведомлений от внешних сервисов.

#### Параметры запроса

```typescript
interface WebhookNotificationRequest {
  event_type: "music_generated" | "stems_separated" | "lyrics_created" | "error_occurred";
  source: "suno" | "replicate" | "internal";
  timestamp: string;                 // ISO 8601 timestamp
  data: {
    task_id?: string;                // ID связанной задачи
    user_id?: string;                // ID пользователя
    track_id?: string;               // ID трека
    status?: string;                 // Статус операции
    result_urls?: string[];          // URLs результатов
    error_details?: {
      code: string;                  // Код ошибки
      message: string;               // Сообщение об ошибке
      details?: any;                 // Дополнительные детали
    };
    metadata?: any;                  // Дополнительные метаданные
  };
  signature?: string;                // Подпись для верификации
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/webhook-notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=abc123..." \
  -d '{
    "event_type": "music_generated",
    "source": "suno",
    "timestamp": "2025-01-15T10:30:00Z",
    "data": {
      "task_id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "user_456",
      "status": "completed",
      "result_urls": [
        "https://suno.ai/audio/clip_123.mp3",
        "https://suno.ai/images/clip_123.jpg"
      ],
      "metadata": {
        "title": "Электронная мечта",
        "duration": 180,
        "genre": "electronic"
      }
    }
  }'
```

#### Ответ

```typescript
interface WebhookNotificationResponse {
  success: boolean;
  message: string;                   // Сообщение о результате обработки
  processed: boolean;                // Обработано ли уведомление
  actions_taken?: string[];          // Список выполненных действий
  error?: string;                    // Сообщение об ошибке
}
```

---

## 📊 Database API (через Supabase Client)

### Треки

#### Получение треков пользователя
```typescript
// GET /tracks (через Supabase Client)
const { data, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### Создание нового трека
```typescript
// POST /tracks (через Supabase Client)
const { data, error } = await supabase
  .from('tracks')
  .insert({
    title: 'Название трека',
    prompt: 'Описание музыки',
    user_id: userId,
    status: 'pending'
  });
```

#### Обновление трека
```typescript
// PATCH /tracks/:id (через Supabase Client)
const { data, error } = await supabase
  .from('tracks')
  .update({
    status: 'completed',
    audio_url: 'https://example.com/audio.mp3'
  })
  .eq('id', trackId);
```

---

### Лайки треков

#### Лайк трека
```typescript
// POST /track_likes (через Supabase Client)
const { data, error } = await supabase
  .from('track_likes')
  .insert({
    track_id: trackId,
    user_id: userId
  });
```

#### Удаление лайка
```typescript
// DELETE /track_likes (через Supabase Client)
const { data, error } = await supabase
  .from('track_likes')
  .delete()
  .eq('track_id', trackId)
  .eq('user_id', userId);
```

---

### Версии треков

#### Получение версий трека
```typescript
// GET /track_versions (через Supabase Client)
const { data, error } = await supabase
  .from('track_versions')
  .select('*')
  .eq('track_id', trackId)
  .order('version_number', { ascending: true });
```

---

### Стемы треков

#### Получение стемов трека
```typescript
// GET /track_stems (через Supabase Client)
const { data, error } = await supabase
  .from('track_stems')
  .select('*')
  .eq('track_id', trackId);
```

---

## 🔐 Безопасность API

### Аутентификация
- Все эндпоинты требуют JWT токен в заголовке Authorization
- Токены проверяются через Supabase Auth
- Неавторизованные запросы возвращают статус 401

### CORS
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

### Валидация данных
- Все входные данные проходят валидацию
- Используется санитизация для предотвращения XSS
- Обязательные поля проверяются на наличие

### Rate Limiting
- Рекомендуется реализовать ограничения на количество запросов
- Особенно важно для генерации музыки (ресурсоемкие операции)

---

## 📈 Мониторинг и логирование

### Логирование
```typescript
// Пример логирования в Edge Functions
console.log('Starting music generation for track:', trackId);
console.error('Error in music generation:', error);
```

### Метрики
- Время выполнения запросов
- Количество успешных/неуспешных генераций
- Использование внешних API (Suno, Replicate)

---

## 🚀 Примеры использования

### JavaScript/TypeScript Client
```typescript
class MusicAPI {
  constructor(private supabaseUrl: string, private apiKey: string) {}

  async generateMusic(request: GenerateSunoRequest) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-suno`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return response.json();
  }

  async generateLyrics(request: GenerateLyricsRequest) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/generate-lyrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return response.json();
  }
}
```

### Python Client
```python
import requests
import json

class MusicAPI:
    def __init__(self, supabase_url: str, api_key: str):
        self.base_url = f"{supabase_url}/functions/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def generate_music(self, track_id: str, title: str, prompt: str):
        data = {
            "trackId": track_id,
            "title": title,
            "prompt": prompt
        }
        
        response = requests.post(
            f"{self.base_url}/generate-suno",
            headers=self.headers,
            json=data
        )
        
        return response.json()
```

---

## 🔧 Настройка окружения

### Переменные окружения для Edge Functions
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs
SUNO_API_KEY=your-suno-api-key
REPLICATE_API_KEY=your-replicate-api-key
LOVABLE_API_KEY=your-lovable-api-key
```

### Развертывание Edge Functions
```bash
# Установка Supabase CLI
npm install -g supabase

# Логин в Supabase
supabase login

# Развертывание функций
supabase functions deploy generate-suno
supabase functions deploy generate-lyrics
supabase functions deploy improve-prompt
supabase functions deploy separate-stems
supabase functions deploy generate-music
supabase functions deploy suno-callback
supabase functions deploy stems-callback
```

---

## 📚 Дополнительные ресурсы

### Документация внешних API
- [Suno AI API](https://suno.ai/api-docs)
- [Replicate API](https://replicate.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Примеры интеграции
- [React Hook для генерации музыки](../../src/hooks/useMusicGeneration.ts)
- [API Service Layer](../../src/services/api.service.ts)
- [Компонент генератора музыки](../../src/components/MusicGenerator.tsx)

---

*Документация обновлена: Январь 2025*  
*Версия API: 1.0*