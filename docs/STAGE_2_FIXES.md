# 🔧 Stage 2 Fixes Implementation Plan

**Date**: 2025-10-31  
**Sprint**: 31 - Technical Debt Closure  
**Based on**: STAGE_2_AUDIT_REPORT.md

---

## 🎯 Critical Fixes (Must implement now)

### Fix 1: ❌ `loadVersions` не работает для версий

**Problem**:
```typescript
// ❌ Если trackId = versionId, вернется пустой массив
const allVersions = await getTrackWithVersions(trackId);
```

**Solution**:
```typescript
// ✅ Сначала проверяем, является ли это версией
loadVersions: async (trackId) => {
  try {
    // Проверяем, является ли trackId версией
    const { data: versionCheck } = await supabase
      .from('track_versions')
      .select('parent_track_id')
      .eq('id', trackId)
      .maybeSingle();
    
    // Если это версия, загружаем версии для parent
    const parentId = versionCheck?.parent_track_id || trackId;
    
    const allVersions = await getTrackWithVersions(parentId);
    // ... rest of logic
  } catch (error) {
    logError('Failed to load versions', error);
  }
}
```

**Files to modify**:
- `src/stores/audioPlayerStore.ts` (line 317)

---

### Fix 2: ❌ Потеря позиции при переключении версий

**Problem**:
```typescript
// ❌ Всегда сбрасывается currentTime
set({
  currentTrack: newTrack,
  currentTime: 0, // ❌ Потеря позиции!
});
```

**Solution**:
```typescript
// ✅ Сохраняем и восстанавливаем позицию
switchToVersion: (versionId) => {
  const { currentTime, isPlaying } = get(); // ✅ Запоминаем
  
  // ... create newTrack
  
  set({
    currentTrack: newTrack,
    currentTime, // ✅ Восстанавливаем позицию
    isPlaying, // ✅ Сохраняем состояние воспроизведения
  });
}
```

**Files to modify**:
- `src/stores/audioPlayerStore.ts` (line 266-315)

---

## 🟡 High Priority Fixes

### Fix 3: ⚠️ Correlation ID для трейсинга

**Problem**:
Невозможно отследить полный flow запроса через Frontend → Edge Function → Provider API.

**Solution**:
1. Генерировать `correlationId` на frontend
2. Передавать через заголовок `X-Correlation-ID`
3. Логировать на всех этапах

**Implementation**:
```typescript
// Frontend (useGenerateMusic.ts)
const correlationId = crypto.randomUUID();
logger.info('Generation started', { correlationId });

const { data } = await supabase.functions.invoke('generate-suno', {
  headers: { 'X-Correlation-ID': correlationId },
  body: params
});

// Edge Function
const correlationId = req.headers.get('X-Correlation-ID') || crypto.randomUUID();
logger.info('Edge function received request', { correlationId });
```

**Files to modify**:
- `src/hooks/useGenerateMusic.ts`
- `src/hooks/useExtendTrack.ts`
- `src/hooks/useCreateCover.ts`
- `supabase/functions/generate-suno/index.ts`
- `supabase/functions/extend-track/index.ts`
- `supabase/functions/create-cover/index.ts`

---

### Fix 4: ⚠️ Retry logic в AudioController

**Problem**:
```typescript
// ❌ Сразу сдаемся при ошибке
try {
  await audio.play();
} catch (error) {
  pause();
}
```

**Solution**:
```typescript
// ✅ Retry с exponential backoff
const playAudioWithRetry = async (
  audio: HTMLAudioElement,
  retries = 3,
  delay = 1000
) => {
  try {
    await audio.play();
    logger.info('Audio playback started', { trackId });
  } catch (error) {
    if (retries > 0) {
      logger.warn('Audio play failed, retrying...', { 
        retriesLeft: retries,
        delay 
      });
      await new Promise(r => setTimeout(r, delay));
      return playAudioWithRetry(audio, retries - 1, delay * 2);
    }
    
    logger.error('Audio play failed after all retries', error);
    pause();
    toast.error('Не удалось воспроизвести трек');
  }
};
```

**Files to modify**:
- `src/components/player/AudioController.tsx` (line 27-48)

---

### Fix 5: ⚠️ Pre-loading следующего трека

**Problem**:
Задержка при переходе к следующему треку.

**Solution**:
```typescript
// ✅ Pre-load в фоне
useEffect(() => {
  const nextTrack = queue[currentQueueIndex + 1];
  
  if (nextTrack?.audio_url) {
    const preloadAudio = new Audio();
    preloadAudio.src = nextTrack.audio_url;
    preloadAudio.preload = 'auto';
    
    // Cleanup
    return () => {
      preloadAudio.src = '';
    };
  }
}, [currentQueueIndex, queue]);
```

**Files to modify**:
- `src/components/player/AudioController.tsx` (add new useEffect)

---

## 🟢 Medium Priority Fixes

### Fix 6: ⚠️ Loop mode в playNext

**Solution**:
```typescript
// ✅ Добавить loop режим
interface AudioPlayerState {
  // ... existing
  loopMode: 'off' | 'all' | 'one';
}

playNext: () => {
  const { loopMode, queue, currentQueueIndex } = get();
  const nextIndex = currentQueueIndex + 1;
  
  if (nextIndex < queue.length) {
    // Play next track
  } else if (loopMode === 'all' && queue.length > 0) {
    // Restart from beginning
    const firstTrack = queue[0];
    set({ currentTrack: firstTrack, currentQueueIndex: 0 });
  }
}
```

**Files to modify**:
- `src/stores/audioPlayerStore.ts`
- `src/components/player/GlobalAudioPlayer.tsx` (add loop button)

---

### Fix 7: ⚠️ Progress indicator для stems

**Solution**:
```typescript
// ✅ Poll для progress
useEffect(() => {
  if (!isGenerating) return;
  
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from('tracks')
      .select('metadata->stem_task_status, metadata->stem_progress')
      .eq('id', trackId)
      .single();
    
    setProgress(data?.stem_progress || 0);
  }, 2000);
  
  return () => clearInterval(interval);
}, [isGenerating]);
```

**Files to modify**:
- `src/components/tracks/SeparateStemsDialog.tsx`

---

### Fix 8: ⚠️ MIME-type validation

**Solution**:
```typescript
// ✅ Валидация в Edge Function
const ALLOWED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav'
];

// Check audio_url extension
const audioExtension = trackRecord.audio_url.split('.').pop()?.toLowerCase();
const isValidFormat = ['mp3', 'wav'].includes(audioExtension || '');

if (!isValidFormat) {
  throw new ValidationException([{
    field: 'audio_url',
    message: 'Unsupported audio format. Only MP3 and WAV are supported.'
  }]);
}
```

**Files to modify**:
- `supabase/functions/separate-stems/index.ts` (line 90-100)

---

## 📋 Implementation Checklist

### Critical Fixes (Do NOW):
- [ ] Fix 1: `loadVersions` для версий
- [ ] Fix 2: Сохранение currentTime при переключении

### High Priority (This week):
- [ ] Fix 3: Correlation ID tracing
- [ ] Fix 4: Retry logic в AudioController
- [ ] Fix 5: Pre-loading следующего трека

### Medium Priority (Next week):
- [ ] Fix 6: Loop mode
- [ ] Fix 7: Progress indicator
- [ ] Fix 8: MIME-type validation

---

## 🧪 Testing Plan

### Unit Tests:
- [ ] `audioPlayerStore.loadVersions` с version ID
- [ ] `audioPlayerStore.switchToVersion` сохраняет время
- [ ] `AudioController` retry logic

### Integration Tests:
- [ ] Version switching без потери позиции
- [ ] Pre-loading работает в очереди
- [ ] Correlation ID передается через стек

### Manual Testing:
- [ ] Воспроизведение → переключение версии → позиция сохранена ✅
- [ ] Network failure → retry → успех ✅
- [ ] Stems separation → прогресс отображается ✅

---

**Status**: 📝 Plan Ready  
**Next**: 🔧 Start Implementation
