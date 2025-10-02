# 🔌 API Документация Albert3 Muse Synth Studio

[![API Version](https://img.shields.io/badge/API-v1.2.0-blue.svg)](https://github.com/your-repo/albert3-muse-synth-studio)
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

Создает музыкальную композицию с помощью Suno AI на основе текстового описания.

#### Параметры запроса

```typescript
interface SunoGenerationRequest {
  prompt: string;                    // Описание желаемой музыки (обязательно)
  make_instrumental?: boolean;       // Инструментальная версия (по умолчанию: false)
  wait_audio?: boolean;             // Ожидать готовый аудиофайл (по умолчанию: false)
  model_version?: string;           // Версия модели (по умолчанию: "chirp-v3-5")
  tags?: string;                    // Музыкальные теги/жанры
  title?: string;                   // Название композиции
  continue_at?: number;             // Продолжить с определенной секунды
  continue_clip_id?: string;        // ID клипа для продолжения
  add_to_playlist?: boolean;        // Добавить в плейлист (по умолчанию: false)
  user_id?: string;                 // ID пользователя
}
```

#### Пример запроса

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-music-suno" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Энергичная рок-композиция с гитарными соло и мощными барабанами",
    "tags": "rock, energetic, guitar solo",
    "title": "Электрический шторм",
    "make_instrumental": false,
    "wait_audio": true,
    "model_version": "chirp-v3-5"
  }'
```

#### Ответ

```typescript
interface SunoGenerationResponse {
  success: boolean;
  data?: {
    id: string;                     // Уникальный ID генерации
    title: string;                  // Название композиции
    image_url?: string;             // URL обложки
    lyric?: string;                 // Текст песни
    audio_url?: string;             // URL аудиофайла (если wait_audio: true)
    video_url?: string;             // URL видео
    created_at: string;             // Время создания
    model_name: string;             // Используемая модель
    status: "submitted" | "queued" | "streaming" | "complete" | "error";
    gpt_description_prompt?: string; // Улучшенное описание от GPT
    prompt: string;                 // Исходный промпт
    type: string;                   // Тип генерации
    tags: string;                   // Теги композиции
  }[];
  error?: string;                   // Сообщение об ошибке
  request_id?: string;              // ID запроса для отслеживания
}
```

#### Коды ответов
- `200` - Успешное создание задачи генерации
- `400` - Неверные параметры запроса
- `401` - Неавторизованный доступ
- `500` - Внутренняя ошибка сервера

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

### 3. Разделение на стемы

**Эндпоинт:** `POST /separate-stems`

Разделяет аудиотрек на отдельные инструментальные дорожки (стемы).

#### Параметры запроса
```typescript
interface SeparateStemsRequest {
  trackId: string;           // ID трека для разделения
  separationMode?: string;   // Режим разделения (по умолчанию: "4stems")
}
```

#### Пример запроса
```bash
curl -X POST https://your-project.supabase.co/functions/v1/separate-stems \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "123e4567-e89b-12d3-a456-426614174000",
    "separationMode": "4stems"
  }'
```

#### Ответ
```typescript
interface SeparateStemsResponse {
  success: boolean;
  message: string;
  predictionId?: string;     // ID задачи разделения
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

## 🔄 Callback API

### 6. Suno Callback

**Эндпоинт:** `POST /suno-callback`

Webhook для получения результатов генерации от Suno API.

#### Параметры запроса
```typescript
interface SunoCallbackRequest {
  id: string;                // ID задачи в Suno
  status: string;            // Статус выполнения
  audio_url?: string;        // URL аудиофайла
  video_url?: string;        // URL видеофайла
  image_url?: string;        // URL обложки
  // ... другие поля от Suno API
}
```

---

### 7. Stems Callback

**Эндпоинт:** `POST /stems-callback`

Webhook для получения результатов разделения на стемы.

#### Параметры запроса
```typescript
interface StemsCallbackRequest {
  id: string;                // ID предсказания
  status: string;            // Статус выполнения
  output?: string[];         // Массив URL стемов
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
- [React Hook для генерации музыки](./src/hooks/useMusicGeneration.ts)
- [API Service Layer](./src/services/api.service.ts)
- [Компонент генератора музыки](./src/components/MusicGenerator.tsx)

---

*Документация обновлена: Январь 2025*  
*Версия API: 1.0*