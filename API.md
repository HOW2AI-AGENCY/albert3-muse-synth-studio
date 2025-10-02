# 🔌 API Документация Albert3 Muse Synth Studio

## 📋 Обзор API

Albert3 Muse Synth Studio предоставляет RESTful API через Supabase Edge Functions для генерации музыки, текстов песен и обработки аудио. Все эндпоинты требуют аутентификации через JWT токены.

### Базовый URL
```
https://[your-project-id].supabase.co/functions/v1/
```

### Аутентификация
Все запросы должны содержать заголовок Authorization:
```http
Authorization: Bearer <jwt_token>
```

---

## 🎵 Музыкальные API

### 1. Генерация музыки через Suno AI

**Эндпоинт:** `POST /generate-suno`

Создает музыкальный трек с использованием Suno AI API.

#### Параметры запроса
```typescript
interface GenerateSunoRequest {
  trackId: string;           // ID трека в базе данных
  title: string;             // Название трека
  prompt: string;            // Описание желаемой музыки
  lyrics?: string;           // Текст песни (опционально)
  hasVocals?: boolean;       // Включить вокал (по умолчанию: false)
  styleTags?: string[];      // Теги стиля музыки
  customMode?: boolean;      // Использовать кастомный режим (по умолчанию: false)
}
```

#### Пример запроса
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-suno \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Летняя мелодия",
    "prompt": "Легкая акустическая мелодия с гитарой, летнее настроение",
    "hasVocals": false,
    "styleTags": ["acoustic", "summer", "chill"]
  }'
```

#### Ответ
```typescript
interface GenerateSunoResponse {
  success: boolean;
  message: string;
  trackId: string;
  sunoIds?: string[];        // ID треков в Suno API
}
```

#### Коды ответов
- `200` - Успешное создание задачи генерации
- `400` - Неверные параметры запроса
- `401` - Неавторизованный доступ
- `500` - Внутренняя ошибка сервера

---

### 2. Генерация музыки через Replicate

**Эндпоинт:** `POST /generate-music`

Альтернативный способ генерации музыки через Replicate API.

#### Параметры запроса
```typescript
interface GenerateMusicRequest {
  trackId: string;           // ID трека в базе данных
  prompt: string;            // Описание желаемой музыки
}
```

#### Пример запроса
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-music \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "123e4567-e89b-12d3-a456-426614174000",
    "prompt": "Энергичная электронная музыка в стиле synthwave"
  }'
```

#### Ответ
```typescript
interface GenerateMusicResponse {
  success: boolean;
  message: string;
  predictionId?: string;     // ID предсказания в Replicate
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

## ✍️ Текстовые API

### 4. Генерация текстов песен

**Эндпоинт:** `POST /generate-lyrics`

Создает текст песни на основе заданных параметров.

#### Параметры запроса
```typescript
interface GenerateLyricsRequest {
  theme: string;             // Тема песни
  mood: string;              // Настроение
  genre: string;             // Жанр музыки
  language?: 'ru' | 'en';    // Язык (по умолчанию: 'ru')
  structure?: string;        // Структура песни
}
```

#### Пример запроса
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-lyrics \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "любовь",
    "mood": "романтичное",
    "genre": "поп",
    "language": "ru",
    "structure": "verse-chorus-verse-chorus-bridge-chorus"
  }'
```

#### Ответ
```typescript
interface GenerateLyricsResponse {
  lyrics: string;            // Сгенерированный текст
  metadata: {
    theme: string;
    mood: string;
    genre: string;
    language: string;
    structure: string;
  };
}
```

---

### 5. Улучшение промптов

**Эндпоинт:** `POST /improve-prompt`

Улучшает описание музыки для более качественной генерации.

#### Параметры запроса
```typescript
interface ImprovePromptRequest {
  prompt: string;            // Исходное описание музыки
}
```

#### Пример запроса
```bash
curl -X POST https://your-project.supabase.co/functions/v1/improve-prompt \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "грустная музыка"
  }'
```

#### Ответ
```typescript
interface ImprovePromptResponse {
  improvedPrompt: string;    // Улучшенное описание
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