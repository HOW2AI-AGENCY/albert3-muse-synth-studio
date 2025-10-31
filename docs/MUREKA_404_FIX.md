# 🔧 Mureka API 404 Error Fix

## 🐛 Проблема

При генерации Mureka треков Edge Function получал **404 ошибку** при попытке опросить статус задачи:

```
🔴 [MUREKA] Polling error
Mureka API error (404): 404 page not found
```

**Симптомы:**
- ✅ Генерация стартует успешно (баланс уменьшается)
- ❌ Polling не находит задачу (404)
- ❌ Треки застревают в статусе `processing`
- ❌ Frontend не получает готовые треки

---

## 🔍 Root Cause Analysis

### Что было неправильно:

```typescript
// ❌ НЕПРАВИЛЬНО: task_id передавался как query parameter
const endpoint = `/v1/song/query?task_id=${taskId}`;

// Результат: GET https://api.mureka.ai/v1/song/query?task_id=103276303482881
// Response: 404 page not found
```

### Что говорит официальная документация:

Согласно [Mureka API Platform Docs](https://platform.mureka.ai/docs/api/operations/get-v1-song-query-%7Btask_id%7D.html):

```
GET /v1/song/query/{task_id}

Parameters:
  Path Parameters:
    task_id* - The task_id of the song generation task (required)
    Type: string
    Example: 435134
```

**task_id должен быть в PATH, а не в query string!**

---

## ✅ Решение

### Исправленный код:

```typescript
// ✅ ПРАВИЛЬНО: task_id в URL path
async queryTask(taskId: string): Promise<MurekaGenerationResponse> {
  logger.info('🔄 [MUREKA] Querying task', { taskId });
  
  // CORRECT: task_id in URL path, not query param
  const endpoint = `/v1/song/query/${taskId}`;
  
  return makeRequest(endpoint, 'GET');
}

// Результат: GET https://api.mureka.ai/v1/song/query/103276303482881
// Response: 200 OK + track data ✅
```

### Где исправлено:

**Файл:** `supabase/functions/_shared/mureka.ts`  
**Строка:** 739-746  
**Метод:** `createMurekaClient().queryTask()`

---

## 🧪 Тестирование

### До исправления:
```bash
GET /v1/song/query?task_id=103276303482881
→ 404 page not found ❌
```

### После исправления:
```bash
GET /v1/song/query/103276303482881
→ 200 OK ✅
→ {
    "id": "103276303482881",
    "status": "succeeded",
    "clips": [
      {
        "audio_url": "https://...",
        "image_url": "https://...",
        "title": "Generated Track",
        "duration": 120
      }
    ]
  }
```

---

## 📊 Влияние

### Затронутые Edge Functions:
- ✅ `generate-mureka` - основная генерация (polling цикл)
- ✅ `check-stuck-tracks` - мониторинг застрявших треков
- ✅ `add-instrumental-mureka` - добавление инструментальной версии
- ✅ `describe-song` - описание трека
- ✅ `recognize-song` - распознавание музыки
- ✅ `restore-mureka-tracks` - массовое восстановление

### Все функции теперь используют правильный endpoint.

---

## 🚀 Deployment

**Статус:** ✅ Deployed  
**Дата:** 2025-10-31  
**Версия:** v2.4.1

---

## 🔄 Дальнейшие действия

1. ✅ **Исправлен endpoint** в `mureka.ts`
2. ⏳ **Ожидается восстановление застрявших треков** (автоматически при следующем polling)
3. 📊 **Мониторинг Sentry** - следующий шаг для отслеживания ошибок

---

## 📚 Референсы

- [Mureka API Platform Docs](https://platform.mureka.ai/docs/)
- [Query Task Endpoint](https://platform.mureka.ai/docs/api/operations/get-v1-song-query-%7Btask_id%7D.html)
- [Generate Song Endpoint](https://platform.mureka.ai/docs/api/operations/post-v1-song-generate.html)

---

*Last updated: 2025-10-31 15:40 UTC*
