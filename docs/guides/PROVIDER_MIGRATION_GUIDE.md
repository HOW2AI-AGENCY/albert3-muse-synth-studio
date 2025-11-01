# Provider Migration Guide
**Для разработчиков**: Руководство по миграции между провайдерами и использованию ProviderFactory

**Версия**: 3.1.0  
**Дата**: 2025-11-02  
**Статус**: Active

---

## 📚 Содержание

1. [Введение](#введение)
2. [Миграция на ProviderFactory](#миграция-на-providerfactory)
3. [Миграция Suno → Mureka](#миграция-suno--mureka)
4. [Миграция Mureka → Suno](#миграция-mureka--suno)
5. [Сравнение возможностей](#сравнение-возможностей)
6. [Best Practices](#best-practices)

---

## 🎯 Введение

С версии **3.1.0** в проекте используется паттерн **ProviderFactory** для унифицированной работы с музыкальными провайдерами. Это упрощает переключение между Suno AI и Mureka AI, а также улучшает производительность за счёт кеширования адаптеров.

### Основные преимущества:
- ✅ **Единый интерфейс** для всех провайдеров
- ✅ **Автоматическое кеширование** адаптеров (singleton pattern)
- ✅ **Type-safe** выбор провайдера
- ✅ **Легкая расширяемость** для новых провайдеров

---

## 🔄 Миграция на ProviderFactory

### Старый подход (router.ts) ❌ DEPRECATED

```typescript
// ❌ Устаревший способ (будет удалён в v3.2.0)
import { generateMusic as routeToProvider } from '@/services/providers/router';

const result = await routeToProvider({
  provider: 'suno',
  prompt: 'Epic orchestral music',
  tags: 'orchestral, cinematic'
});
```

### Новый подход (ProviderFactory) ✅ RECOMMENDED

```typescript
// ✅ Рекомендуемый способ (v3.1.0+)
import { ProviderFactory } from '@/services/providers/factory';

const provider = ProviderFactory.getProvider('suno');
const result = await provider.generateMusic({
  prompt: 'Epic orchestral music',
  styleTags: ['orchestral', 'cinematic']
});
```

### Краткая форма

```typescript
// ✅ Ещё короче
import { getProviderAdapter } from '@/services/providers/factory';

const result = await getProviderAdapter('suno').generateMusic(params);
```

---

## 🔄 Миграция Suno → Mureka

### 1. Обновить параметры генерации

```typescript
// ❌ Suno-specific параметры
const sunoParams = {
  provider: 'suno',
  prompt: 'Energetic rock song',
  referenceAudioUrl: 'https://example.com/audio.mp3', // ⚠️ URL напрямую
  customMode: true,                                    // ⚠️ Не поддерживается Mureka
  vocalGender: 'f',                                    // ⚠️ Не поддерживается Mureka
  styleWeight: 0.8,                                    // ⚠️ Не поддерживается Mureka
  weirdness: 0.3                                       // ⚠️ Не поддерживается Mureka
};

// ✅ Mureka-compatible параметры
const murekaParams = {
  provider: 'mureka',
  prompt: 'Energetic rock song',
  // ⚠️ Требует предварительной загрузки файла!
  referenceAudioId: '12345',  // Получить через uploadFile()
  isBGM: false                 // Mureka-specific опция
};
```

### 2. Загрузка референсного аудио

**Suno** (прямой URL):
```typescript
const sunoProvider = ProviderFactory.getProvider('suno');

const result = await sunoProvider.generateMusic({
  prompt: 'Rock song',
  referenceAudioUrl: 'https://example.com/audio.mp3' // ✅ Прямой URL
});
```

**Mureka** (требует загрузки):
```typescript
const murekaProvider = ProviderFactory.getProvider('mureka');

// ШАГ 1: Загрузить файл
const audioBlob = await fetch('https://example.com/audio.mp3')
  .then(res => res.blob());

// ШАГ 2: Получить file_id через Mureka client
import { createMurekaClient } from '@/services/mureka';
const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
const uploadResult = await murekaClient.uploadFile(audioBlob, { purpose: 'audio' });
const fileId = uploadResult.data.file_id;

// ШАГ 3: Использовать file_id
const result = await murekaProvider.generateMusic({
  prompt: 'Rock song',
  referenceAudioId: fileId // ✅ Загруженный file_id
});
```

### 3. Адаптировать обработку ответов

**Suno** (быстрый ответ):
```typescript
// Suno возвращает готовые треки сразу (2-3 минуты)
const { audio_url, cover_url, video_url } = response.data;
console.log('Track ready:', audio_url);
```

**Mureka** (требует polling):
```typescript
// Mureka требует polling (до 10 минут)
const { taskId } = response.data;

// Polling каждые 10 секунд
const pollStatus = async () => {
  const status = await murekaProvider.queryTask(taskId);
  
  if (status.status === 'completed') {
    console.log('Track ready:', status.audioUrl);
  } else if (status.status === 'failed') {
    console.error('Generation failed:', status.errorMessage);
  } else {
    // Продолжить polling
    setTimeout(pollStatus, 10000);
  }
};

pollStatus();
```

### 4. Учесть ограничения возможностей

| Фича | Suno | Mureka | Решение |
|------|------|--------|---------|
| **Extend Track** | ✅ | ❌ | Использовать Suno |
| **Song Recognition** | ❌ | ✅ | Использовать Mureka |
| **Reference Audio** | URL | File ID | См. примеры выше |
| **Custom Mode** | ✅ | ❌ | Упростить для Mureka |
| **Vocal Gender** | ✅ | ❌ | Не использовать с Mureka |
| **Stem Separation** | ✅ | ✅ | Оба поддерживают |

---

## 🔄 Миграция Mureka → Suno

### 1. Упростить референсную аудио

```typescript
// ❌ Mureka (2 шага: загрузка + генерация)
const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
const uploadResult = await murekaClient.uploadFile(audioBlob, { purpose: 'audio' });
const fileId = uploadResult.data.file_id;

const result = await murekaProvider.generateMusic({
  prompt: 'Rock song',
  referenceAudioId: fileId
});

// ✅ Suno (1 шаг: прямой URL)
const result = await sunoProvider.generateMusic({
  prompt: 'Rock song',
  referenceAudioUrl: 'https://example.com/audio.mp3' // Прямой URL
});
```

### 2. Активировать Custom Mode (детальный контроль)

```typescript
// Mureka (автоматический режим)
const murekaParams = {
  provider: 'mureka',
  prompt: 'Epic music',
  styleTags: ['epic', 'orchestral']
};

// Suno (детальный контроль параметров)
const sunoParams = {
  provider: 'suno',
  prompt: 'Epic music',
  styleTags: ['epic', 'orchestral'],
  customMode: true,        // ✅ Включить детальный контроль
  vocalGender: 'f',        // Женский вокал
  styleWeight: 0.9,        // Сильное влияние стиля
  lyricsWeight: 0.7,       // Умеренное влияние текста
  weirdness: 0.3           // Небольшая креативность
};
```

### 3. Использовать Extend Track

```typescript
// ❌ Mureka не поддерживает Extend Track
// Нужно пересоздать композицию полностью

// ✅ Suno поддерживает продление треков
const extendResult = await sunoProvider.extendTrack({
  originalTrackId: 'track-uuid-123',
  prompt: 'Continue with an epic guitar solo',
  duration: 60 // Продлить на 60 секунд
});
```

---

## 🔍 Сравнение возможностей

### Таблица фич

| Возможность | Suno AI | Mureka AI | Рекомендация |
|-------------|---------|-----------|--------------|
| **Генерация музыки** | ✅ Fast (2-3 мин) | ✅ Standard (5-10 мин) | Suno для скорости |
| **Extend Track** | ✅ | ❌ | Только Suno |
| **Stem Separation** | ✅ | ✅ | Оба провайдера |
| **Generate Lyrics** | ✅ | ✅ | Оба провайдера |
| **Song Recognition** | ❌ | ✅ | Только Mureka |
| **Describe Song** | ❌ | ✅ | Только Mureka |
| **Reference Audio** | URL (прямо) | File ID (загрузка) | Suno проще |
| **Custom Mode** | ✅ | ❌ | Только Suno |
| **Vocal Gender** | ✅ | ❌ | Только Suno |
| **Max Duration** | 4 минуты | 3 минуты | Suno длиннее |
| **Cost (credits)** | 10 | 8 | Mureka дешевле |

### Когда использовать Suno:
- ✅ Нужна **максимальная длительность** (до 4 минут)
- ✅ Требуется **Extend Track** / **Create Cover**
- ✅ Нужен **WAV export** высокого качества
- ✅ Важен **Custom Mode** с детальным контролем параметров
- ✅ Нужна **быстрая генерация** (2-3 минуты)

### Когда использовать Mureka:
- ✅ Нужна **Song Recognition** (Shazam-like)
- ✅ Требуется **AI-описание композиции**
- ✅ **Бюджет ограничен** (дешевле на 20%)
- ✅ Нужна **детальная информация о треке** (жанр, настроение, инструменты, BPM)

---

## 💡 Best Practices

### 1. Гибридный подход

```typescript
/**
 * ✅ РЕКОМЕНДУЕТСЯ: Использовать сильные стороны каждого провайдера
 */

// Шаг 1: Прототипирование с Mureka (быстрее, дешевле)
const murekaProvider = ProviderFactory.getProvider('mureka');
const prototypeResult = await murekaProvider.generateMusic({
  prompt: 'Epic orchestral battle theme',
  styleTags: ['orchestral', 'epic', 'cinematic']
});

// Шаг 2: Анализ результата через Mureka AI
const description = await murekaProvider.describeSong({
  audioUrl: prototypeResult.audioUrl
});
console.log('Genre:', description.genre);
console.log('Mood:', description.mood);
console.log('BPM:', description.tempo_bpm);

// Шаг 3: Финальная генерация через Suno (выше качество)
const sunoProvider = ProviderFactory.getProvider('suno');
const finalResult = await sunoProvider.generateMusic({
  prompt: 'Epic orchestral battle theme',
  styleTags: ['orchestral', 'epic', 'cinematic'],
  customMode: true,
  styleWeight: 0.9,
  referenceAudioUrl: prototypeResult.audioUrl // Использовать Mureka как референс
});
```

### 2. Обработка ошибок

```typescript
import { ProviderFactory } from '@/services/providers/factory';
import { logger } from '@/utils/logger';

async function generateWithFallback(params: GenerationParams) {
  try {
    // Попробовать основной провайдер
    const provider = ProviderFactory.getProvider(params.provider);
    return await provider.generateMusic(params);
  } catch (error) {
    logger.error(`${params.provider} generation failed`, error);
    
    // Fallback на альтернативный провайдер
    const fallbackProvider = params.provider === 'suno' ? 'mureka' : 'suno';
    logger.info(`Falling back to ${fallbackProvider}`);
    
    const provider = ProviderFactory.getProvider(fallbackProvider);
    return await provider.generateMusic({
      ...params,
      provider: fallbackProvider
    });
  }
}
```

### 3. Кеширование результатов

```typescript
import { ProviderFactory } from '@/services/providers/factory';
import { Cache } from '@/utils/cache';

const resultCache = new Cache<GenerationResult>({ ttl: 3600 });

async function generateWithCache(params: GenerationParams) {
  const cacheKey = `${params.provider}:${params.prompt}:${params.styleTags.join(',')}`;
  
  // Проверить кеш
  const cached = resultCache.get(cacheKey);
  if (cached) {
    logger.info('Returning cached result');
    return cached;
  }
  
  // Генерация
  const provider = ProviderFactory.getProvider(params.provider);
  const result = await provider.generateMusic(params);
  
  // Сохранить в кеш
  resultCache.set(cacheKey, result);
  
  return result;
}
```

### 4. Мониторинг производительности

```typescript
import { ProviderFactory } from '@/services/providers/factory';
import { performance } from '@/utils/performance';

async function generateWithMetrics(params: GenerationParams) {
  const startTime = performance.now();
  const provider = ProviderFactory.getProvider(params.provider);
  
  try {
    const result = await provider.generateMusic(params);
    
    const duration = performance.now() - startTime;
    logger.info('Generation metrics', {
      provider: params.provider,
      duration,
      success: true
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('Generation failed', {
      provider: params.provider,
      duration,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
```

---

## 📝 Чек-лист миграции

### Для Suno → Mureka:
- [ ] Заменить `referenceAudioUrl` на `referenceAudioId`
- [ ] Добавить логику загрузки файла через `uploadFile()`
- [ ] Удалить `customMode`, `vocalGender`, `styleWeight`, `weirdness`
- [ ] Добавить обработку `isBGM` (опционально)
- [ ] Обновить polling интервал (10 секунд вместо 5)
- [ ] Протестировать на staging

### Для Mureka → Suno:
- [ ] Заменить `referenceAudioId` на `referenceAudioUrl`
- [ ] Удалить логику загрузки через `uploadFile()`
- [ ] Добавить `customMode` для детального контроля (опционально)
- [ ] Настроить `vocalGender`, `styleWeight` и т.д. (опционально)
- [ ] Обновить polling интервал (5 секунд)
- [ ] Протестировать на staging

---

## 🆘 Troubleshooting

### Проблема: "Unsupported provider"
```typescript
// ❌ Неправильно
const provider = ProviderFactory.getProvider('replicate'); // Throws error

// ✅ Правильно
const supportedProviders = ProviderFactory.getSupportedProviders();
console.log(supportedProviders); // ['suno', 'mureka']

if (ProviderFactory.isProviderSupported(userProvider)) {
  const provider = ProviderFactory.getProvider(userProvider);
}
```

### Проблема: "Reference audio не работает в Mureka"
```typescript
// ❌ Неправильно (прямой URL не поддерживается)
const result = await murekaProvider.generateMusic({
  referenceAudioUrl: 'https://example.com/audio.mp3'
});

// ✅ Правильно (загрузить файл сначала)
const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
const audioBlob = await fetch('https://example.com/audio.mp3').then(r => r.blob());
const uploadResult = await murekaClient.uploadFile(audioBlob, { purpose: 'audio' });

const result = await murekaProvider.generateMusic({
  referenceAudioId: uploadResult.data.file_id
});
```

---

**Версия гайда**: 1.0.0  
**Последнее обновление**: 2025-11-02  
**Авторы**: Development Team

Если у вас возникли вопросы по миграции, создайте issue в GitHub или обратитесь к команде разработки.
