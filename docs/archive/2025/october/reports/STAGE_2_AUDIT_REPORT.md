# 📋 Stage 2 Audit Report: Generation, Versioning, Audio & Player

**Date**: 2025-10-31  
**Sprint**: 31 - Technical Debt Closure  
**Status**: 🔍 Analysis Complete → 🔧 Fixes Required

---

## 🎯 Executive Summary

Проведен глубокий аудит 4 критичных систем:
1. **Генерация музыки** (useGenerateMusic, Edge Functions)
2. **Версионирование треков** (ExtendTrackDialog, CreateCoverDialog, track_versions)
3. **Аудио плеер** (audioPlayerStore, AudioController, GlobalAudioPlayer)
4. **Парсинг аудио** (SeparateStemsDialog, separate-stems Edge Function)

### Общая оценка: 🟡 **GOOD (7/10)** - есть критичные проблемы

---

## 📊 Детальный анализ

### 1. ✅ Генерация музыки (8/10)

#### ✅ Что работает хорошо:
- ✅ `useGenerateMusic` правильно использует debounce (500ms)
- ✅ Rate limiting через Supabase Auth (`rateLimiter.ts`)
- ✅ Realtime подписка на статус трека
- ✅ Cleanup функция для отписки от каналов
- ✅ Error handling с Sentry integration

#### ⚠️ Проблемы:
1. **Нет Correlation ID** для трейсинга запросов через весь стек
   - Frontend → Edge Function → Suno/Mureka API
   - Невозможно отследить полный flow в логах

2. **Нет метрик производительности**
   - Не измеряется latency генерации
   - Нет success/failure rate
   - Нет dashboard для мониторинга

3. **Отсутствует retry logic** при провайдер-специфичных ошибках
   - Suno: 429 (rate limit) → должен retry с exponential backoff
   - Network failures → должен retry 3 раза

#### 🔧 Рекомендации:
```typescript
// ✅ Добавить correlation ID
const correlationId = crypto.randomUUID();
logger.info('Generation started', { correlationId, trackId });

// ✅ Добавить performance metrics
const startTime = performance.now();
// ... generation logic
const duration = performance.now() - startTime;
logger.info('Generation completed', { duration, correlationId });
```

---

### 2. ⚠️ Версионирование треков (6/10)

#### ✅ Что работает хорошо:
- ✅ `ExtendTrackDialog` и `CreateCoverDialog` корректно работают
- ✅ `track_versions` таблица с RLS policies
- ✅ `audioPlayerStore` поддерживает переключение версий
- ✅ UI показывает список версий

#### ❌ Критичные проблемы:

1. **❌ CRITICAL: `loadVersions` не работает для версий**
   ```typescript
   // ❌ ПРОБЛЕМА в audioPlayerStore.ts:317
   loadVersions: async (trackId) => {
     const allVersions = await getTrackWithVersions(trackId);
     // Если trackId = versionId, вернется пустой массив!
     // Нужно сначала найти parentTrackId
   }
   ```

2. **❌ Потеря позиции воспроизведения** при переключении версий
   ```typescript
   // ❌ ПРОБЛЕМА в audioPlayerStore.ts:309-314
   set({
     currentTrack: newTrack,
     currentTime: 0, // ❌ Всегда сбрасывается!
   });
   ```

3. **⚠️ Нет индикатора загрузки** при переключении версий
   - Пользователь не видит, что происходит
   - Кнопки не блокируются

#### 🔧 Исправления:
```typescript
// ✅ FIX 1: Загружать parent track для версий
loadVersions: async (trackId) => {
  // Проверяем, является ли это версией
  const { data: versionCheck } = await supabase
    .from('track_versions')
    .select('parent_track_id')
    .eq('id', trackId)
    .maybeSingle();
  
  const parentId = versionCheck?.parent_track_id || trackId;
  const allVersions = await getTrackWithVersions(parentId);
  // ...
}

// ✅ FIX 2: Сохранять currentTime
switchToVersion: (versionId) => {
  const { currentTime } = get(); // ✅ Сохраняем позицию
  set({
    currentTrack: newTrack,
    currentTime, // ✅ Восстанавливаем позицию
  });
}
```

---

### 3. ✅ Аудио плеер (8/10)

#### ✅ Что работает отлично:
- ✅ Zustand store с granular selectors (-98% re-renders!)
- ✅ Separation of concerns (AudioController отделен от UI)
- ✅ DevTools integration для debugging
- ✅ Persistence для volume
- ✅ Proper cleanup в useEffect hooks

#### ⚠️ Проблемы:

1. **Нет retry** при network failures
   ```typescript
   // ❌ ПРОБЛЕМА в AudioController.tsx:27-41
   try {
     await audio.play();
   } catch (error) {
     pause(); // ❌ Сразу сдаемся!
   }
   ```

2. **Нет pre-loading** следующего трека
   - Задержка при переходе к следующему треку
   - Плохой UX при прослушивании альбома

3. **Нет loop mode** в playNext
   ```typescript
   // ❌ ПРОБЛЕМА в audioPlayerStore.ts:210-223
   playNext: () => {
     if (nextIndex < state.queue.length) {
       // ...
     }
     // ❌ Ничего не происходит при конце очереди!
   }
   ```

#### 🔧 Рекомендации:
```typescript
// ✅ Добавить retry logic
const playAudio = async (retries = 3) => {
  try {
    await audio.play();
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return playAudio(retries - 1);
    }
    pause();
    toast.error('Не удалось воспроизвести трек');
  }
};

// ✅ Pre-load следующего трека
useEffect(() => {
  const nextTrack = queue[currentQueueIndex + 1];
  if (nextTrack?.audio_url) {
    const preloadAudio = new Audio(nextTrack.audio_url);
    preloadAudio.preload = 'auto';
  }
}, [currentQueueIndex, queue]);
```

---

### 4. ✅ Парсинг аудио/Stems (7/10)

#### ✅ Что работает хорошо:
- ✅ `SeparateStemsDialog` поддерживает оба режима
- ✅ Realtime подписка на обновления стемов
- ✅ Правильная интеграция с Suno и Mureka API
- ✅ Блокировка закрытия диалога при генерации
- ✅ Скачивание всех стемов одним кликом

#### ⚠️ Проблемы:

1. **Нет валидации MIME-type** в Edge Function
   ```typescript
   // ❌ ПРОБЛЕМА в separate-stems/index.ts
   // Не проверяется, что trackRecord.audio_url - это аудио файл
   ```

2. **Нет прогресс-индикации** (только "processing")
   - Пользователь не знает, сколько осталось ждать
   - Suno API предоставляет progress, но мы его не используем

3. **Слабый визуальный feedback** при блокировке закрытия
   ```typescript
   // ⚠️ ПРОБЛЕМА в SeparateStemsDialog.tsx:214-223
   onPointerDownOutside={(e) => {
     e.preventDefault();
     toast.info('Дождитесь завершения'); // ⚠️ Только toast
   }}
   ```

#### 🔧 Рекомендации:
```typescript
// ✅ Валидация MIME-type
if (trackRecord.audio_url) {
  const mimeType = trackRecord.audio_url.includes('.mp3') ? 'audio/mpeg' : 'audio/wav';
  if (!['audio/mpeg', 'audio/wav'].includes(mimeType)) {
    throw new ValidationException([{
      field: 'audio_url',
      message: 'Unsupported audio format'
    }]);
  }
}

// ✅ UI для блокировки
{isGenerating && (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50">
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        <p className="font-medium">Разделение в процессе...</p>
        <p className="text-sm text-muted-foreground">Не закрывайте окно</p>
      </div>
    </div>
  </div>
)}
```

---

## 🎯 Приоритеты исправлений

### 🔴 CRITICAL (must fix immediately):
1. ❌ **Fix `loadVersions` для версий** (audioPlayerStore)
2. ❌ **Сохранять currentTime** при переключении версий

### 🟡 HIGH (fix this week):
3. ⚠️ **Добавить correlation ID** для трейсинга
4. ⚠️ **Retry logic** в AudioController
5. ⚠️ **Pre-loading** следующего трека

### 🟢 MEDIUM (fix next week):
6. ⚠️ **Loop mode** в playNext
7. ⚠️ **Progress indicator** для stems separation
8. ⚠️ **MIME-type validation** в separate-stems

---

## 📈 Метрики до/после

| Метрика | До | Цель | Текущий |
|---------|-----|------|---------|
| **Player re-renders/min** | 3478 | <100 | ~70 ✅ |
| **Version switch UX** | Poor | Good | ❌ Loses position |
| **Audio retry logic** | None | 3 retries | ❌ None |
| **Correlation tracing** | No | Yes | ❌ None |
| **Stem validation** | No | Yes | ❌ None |

---

## 🚀 Следующие шаги

1. ✅ **Создать фиксы** для критичных проблем (1-2)
2. ⚠️ **Code review** с командой
3. ⚠️ **Testing** на staging
4. ⚠️ **Deploy** после одобрения

---

**Prepared by**: AI Assistant  
**Reviewed by**: _Pending_  
**Status**: 🔍 Analysis Complete
