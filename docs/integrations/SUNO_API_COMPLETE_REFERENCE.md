# Suno API Complete Reference

**Последнее обновление:** 2025-10-16  
**API версия:** v1  
**Base URL:** `https://api.sunoapi.org/api/v1`

---

## 🎯 Обзор

Albert3 Muse Synth Studio интегрирован с Suno AI API для генерации музыки, текстов песен и разделения треков на стемы.

### Основные endpoints

| Endpoint | Назначение | Rate Limit |
|----------|------------|------------|
| `/generate` | Генерация музыки | 10/min |
| `/generate/extend` | Расширение трека | 10/min |
| `/generate/cover` | Создание кавера | 10/min |
| `/lyrics/generate` | Генерация текстов | 10/min |
| `/vocal-removal/generate` | Разделение стемов | 5/min |

---

## 🎵 Music Generation

### Request Format

```typescript
POST /api/v1/generate

{
  "prompt": string,
  "tags": string[],          // Массив тегов
  "title"?: string,
  "instrumental"?: boolean,  // ⚠️ API ожидает "instrumental" (не "make_instrumental")
  "model"?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5",
  "customMode"?: boolean,
  "callBackUrl"?: string,
  "negativeTags"?: string,
  "vocalGender"?: "m" | "f",
  "styleWeight"?: number,     // 0-1
  "weirdnessConstraint"?: number,  // 0-1
  "audioWeight"?: number,     // 0-1
  "referenceAudioUrl"?: string // URL референсного аудио
}
```

### ✅ Правильные параметры

**ВАЖНО:** Внутри приложения используем `make_instrumental`, но при отправке в Suno API параметр автоматически трансформируется в `instrumental`.

```javascript
// ✅ ПРАВИЛЬНО - формат Suno API
{
  "tags": ["rock", "energetic", "guitar"],
  "instrumental": false,
  "referenceAudioUrl": "https://..."
}

// ℹ️ Внутри приложения (наш формат)
{
  "tags": ["rock", "energetic", "guitar"],
  "make_instrumental": false,  // Трансформируется в "instrumental" автоматически
  "referenceAudioUrl": "https://..."
}
```

### Response Format

```typescript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123..."
  }
}
```

### Модели

| Модель | Описание | Макс. длительность |
|--------|----------|-------------------|
| `V5` | Последняя версия, fastest | 4 минуты |
| `V4_5PLUS` | Более насыщенное звучание | 8 минут |
| `V4_5` | Улучшенное понимание промптов | 8 минут |
| `V4` | Улучшенное качество вокала | 4 минуты |
| `V3_5` | Базовая модель | 4 минуты |

---

## 🎤 Lyrics Generation

### Request Format

```typescript
POST /api/v1/lyrics/generate

{
  "prompt": string,          // Описание текста (макс 200 слов)
  "callBackUrl": string      // Required
}
```

### Response Format

```typescript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "xyz789..."
  }
}
```

### Callback Format

```typescript
{
  "code": 200,
  "msg": "All generated successfully.",
  "data": {
    "callbackType": "complete",
    "taskId": "xyz789...",
    "data": [
      {
        "text": "[Verse]\n...",
        "title": "Song Title",
        "status": "complete",
        "errorMessage": ""
      },
      // ... до 3-5 вариантов
    ]
  }
}
```

---

## 🎛️ Stem Separation

### Request Format

```typescript
POST /api/v1/vocal-removal/generate

{
  "taskId": string,          // ID задачи генерации трека
  "audioId": string,         // suno_id трека
  "type": "separate_vocal" | "split_stem",
  "callBackUrl"?: string
}
```

### Типы разделения

**`separate_vocal`** (2 стема):
- `vocal` - вокал
- `instrumental` - инструментал

**`split_stem`** (до 12 стемов):
- `vocal` - основной вокал
- `backing_vocals` - бэк-вокал
- `drums` - барабаны
- `bass` - бас
- `guitar` - гитара
- `keyboard` - клавишные
- `strings` - струнные
- `brass` - духовые (медь)
- `woodwinds` - духовые (дерево)
- `percussion` - перкуссия
- `synth` - синтезатор
- `fx` - эффекты

### Callback Format

```typescript
// separate_vocal
{
  "code": 200,
  "data": {
    "task_id": "abc123...",
    "vocal_removal_info": {
      "origin_url": "",
      "instrumental_url": "https://...",
      "vocal_url": "https://..."
    }
  }
}

// split_stem
{
  "code": 200,
  "data": {
    "task_id": "abc123...",
    "vocal_removal_info": {
      "vocal_url": "https://...",
      "drums_url": "https://...",
      "bass_url": "https://...",
      // ... остальные стемы
    }
  }
}
```

---

## 🔄 Task Status Polling

### Query Task

```typescript
GET /api/v1/generate/record-info?taskId=abc123...
```

### Response

```typescript
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123...",
    "status": "PENDING" | "SUCCESS" | "FAILED",
    "response": {
      "taskId": "abc123...",
      "sunoData": [
        {
          "id": "track-uuid",
          "audioUrl": "https://...",
          "imageUrl": "https://...",
          "title": "Track Title",
          "tags": "rock, energetic",
          "duration": 180,
          "modelName": "V5"
        }
      ]
    }
  }
}
```

---

## 🔒 Webhook Security (HMAC)

### Верификация подписи

```typescript
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const receivedSig = Uint8Array.from(
    atob(signature),
    c => c.charCodeAt(0)
  );
  
  return timingSafeEqual(
    new Uint8Array(expectedSig),
    receivedSig
  );
}
```

### Использование в Edge Functions

```typescript
const signature = req.headers.get('X-Suno-Signature');
const bodyText = await req.text();
const secret = Deno.env.get('SUNO_WEBHOOK_SECRET');

if (secret && signature) {
  const isValid = await verifyWebhookSignature(bodyText, signature, secret);
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401 }
    );
  }
}

const payload = JSON.parse(bodyText);
// ... обработка
```

---

## 🚨 Error Codes

| Code | Значение | Действие |
|------|----------|----------|
| 200 | Success | - |
| 400 | Invalid parameters | Проверить формат запроса |
| 401 | Unauthorized | Проверить API Key |
| 404 | Invalid endpoint | Проверить URL |
| 405 | Rate limit exceeded | Подождать 1 минуту |
| 413 | Prompt too long | Сократить промпт |
| 429 | Insufficient credits | Пополнить баланс |
| 430 | Too many requests | Снизить частоту |
| 455 | System maintenance | Повторить позже |
| 500 | Server error | Обратиться в поддержку |

---

## 📊 Rate Limits

- **Default:** 10 requests/minute
- **Stem separation:** 5 requests/minute
- **При превышении:** HTTP 429, retry через 60 секунд

---

## 🔧 Best Practices

### 1. Используйте callbacks вместо polling

```typescript
// ✅ Лучше
{
  "callBackUrl": "https://your-app.com/api/callback"
}

// ❌ Хуже (polling)
while (!completed) {
  await queryTask(taskId);
  await delay(5000);
}
```

### 2. Обрабатывайте ошибки gracefully

```typescript
try {
  const result = await sunoClient.generateTrack(payload);
} catch (error) {
  if (error instanceof SunoApiError) {
    if (error.details.status === 429) {
      // Rate limit - retry с exponential backoff
      await delay(60000);
      return retry();
    } else if (error.details.status === 429) {
      // Insufficient credits - уведомить пользователя
      toast.error('Недостаточно кредитов');
    }
  }
  throw error;
}
```

### 3. Валидируйте входные данные

```typescript
const MAX_PROMPT_LENGTH = 200; // для lyrics
const MAX_TAGS = 10;

if (wordCount(prompt) > MAX_PROMPT_LENGTH) {
  throw new Error('Prompt too long');
}

if (tags.length > MAX_TAGS) {
  tags = tags.slice(0, MAX_TAGS);
}
```

### 4. Логируйте все API вызовы

```typescript
logger.info('🎵 Calling Suno API', {
  endpoint: '/generate',
  model: 'V5',
  hasCustomMode: !!payload.customMode,
  tagsCount: payload.tags.length
});
```

---

## 📚 Связанные документы

- [SUNO_API_AUDIT.md](./SUNO_API_AUDIT.md) - Результаты аудита интеграции
- [STEMS_SYSTEM.md](../STEMS_SYSTEM.md) - Система разделения стемов
- [EXTEND_AND_COVER.md](../EXTEND_AND_COVER.md) - Расширение треков и каверы

---

## 🆘 Troubleshooting

### Проблема: 401 Unauthorized

**Решение:**
1. Проверить `SUNO_API_KEY` в secrets
2. Проверить формат заголовка: `Authorization: Bearer YOUR_KEY`

### Проблема: Стемы не генерируются

**Решение:**
1. Убедиться что трек создан через Suno (есть `suno_id`)
2. Проверить что `audioId` совпадает с `suno_id`
3. Проверить логи callback endpoint

### Проблема: Callback не приходят

**Решение:**
1. Убедиться что `callBackUrl` публично доступен
2. Проверить что endpoint возвращает 200 status
3. Проверить HMAC signature verification

---

**Версия документа:** 1.0.0  
**Поддержка:** dev@albert3.app
