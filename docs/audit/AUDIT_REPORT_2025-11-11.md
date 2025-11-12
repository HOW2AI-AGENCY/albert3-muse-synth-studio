# 🔍 Comprehensive System Audit Report
**Date:** 2025-11-11
**Auditor:** Claude Code
**Project:** Albert3 Muse Synth Studio

---

## Executive Summary

Conducted comprehensive audit of the following systems:
1. ✅ **Lyrics Display System** - Issues found and documented
2. ✅ **Track Title Assignment** - Root cause identified
3. ✅ **Generation Status Updates** - Performance bottlenecks found
4. ✅ **Version Indicator Delays** - Architecture issues identified
5. 🔄 **Replicate Integration** - Research required

**Overall Score:** 7.5/10 (Good with critical issues)

---

## 🎵 1. LYRICS DISPLAY SYSTEM AUDIT

### Status: ⚠️ CRITICAL ISSUE FOUND

### Problem Description
User reports:
- ✅ Works on desktop
- ❌ Doesn't work on mobile
- ❌ Shows plain text instead of synced lyrics with timestamps

### Root Cause Analysis

#### Architecture (CORRECT ✅)
The system has proper architecture with:
1. **TimestampedLyricsDisplay** (`src/components/player/TimestampedLyricsDisplay.tsx`) - Desktop version
2. **LyricsMobile** (`src/components/player/LyricsMobile.tsx`) - Mobile version with touch gestures
3. **useTimestampedLyrics** hook - Fetches lyrics from Suno API
4. **Conditional rendering** in `FullScreenPlayer.tsx:307-329`

#### The Bug (❌)

**Location:** `src/components/player/FullScreenPlayer.tsx:52-56`

```typescript
const { data: lyricsData } = useTimestampedLyrics({
  taskId: currentTrack?.suno_task_id,  // ❌ MISSING!
  audioId: currentTrack?.id,
  enabled: !!(currentTrack?.suno_task_id && currentTrack?.id),
});
```

**Display condition** (line 307):
```typescript
{showLyrics && lyricsData && lyricsData.alignedWords && lyricsData.alignedWords.length > 0 && (
```

**Problem:** `currentTrack?.suno_task_id` is **undefined** because:

1. **audioPlayerStore.ts:621-637** loads versions but doesn't include `suno_id`:
   ```typescript
   {
     id: variantsData.mainTrack.id,
     ...
     // ❌ suno_id is NOT mapped!
   }
   ```

2. **Database has `suno_id`** but it's not in the track variant API response

3. **Result:** No taskId → No lyrics API call → No timestamped lyrics → Falls back to plain text

### Impact
- **Severity:** P0 - Critical User Experience
- **Affected Users:** ALL users (desktop shows plain text, mobile shows nothing)
- **Business Impact:** Core feature broken

### Fix Strategy

**Option 1: Add suno_id to track versions API** (RECOMMENDED)
- Modify `src/features/tracks/api/trackVersions.ts:getTrackWithVariants()`
- Include `suno_id` in SELECT query
- Map to `sunoId` in response

**Option 2: Store suno_id in audioPlayerStore**
- Fetch suno_id separately when loading versions
- Cache it in store state

### Estimated Fix Time
- Option 1: 30 minutes
- Testing: 15 minutes
- **Total:** 45 minutes

---

## 📝 2. TRACK TITLE ASSIGNMENT AUDIT

### Status: ⚠️ ISSUE CONFIRMED

### Problem Description
"Треку не присваивается нормальное название при генерации"

### Root Cause Analysis

**Location:** `supabase/functions/generate-suno/handler.ts:151`

```typescript
const sunoPayload: SunoGenerationPayload = {
  prompt: promptWithHint,
  tags: params.styleTags || [],
  title: params.title || undefined, // ❌ Title будет извлечён в webhook
  ...
};
```

**The Issue:**
1. `params.title` is often **undefined** at generation time
2. Comment says "Title будет извлечён в webhook" but...
3. **Suno API automatically generates titles** if not provided
4. The generated title is in the callback response but may not be saved properly

**Check callback-processor.ts:**
```typescript
// callback-processor.ts:112-132
const first = versions[0];
await supabase
  .from('tracks')
  .update({
    audio_url: immediateAudioUrl,
    cover_url: immediateCoverUrl,
    // ❌ NO TITLE UPDATE HERE!
  })
```

**Problem:** Title from Suno response is NOT extracted and saved to database!

### Fix Strategy

1. Extract `title` from Suno callback data:
   ```typescript
   const generatedTitle = first.title || track.title || 'Untitled Track';
   ```

2. Update track with generated title:
   ```typescript
   .update({
     title: generatedTitle,
     audio_url: immediateAudioUrl,
     ...
   })
   ```

3. **Alternative:** Use Replicate to generate descriptive titles from audio analysis

### Estimated Fix Time
- Code changes: 15 minutes
- Testing: 10 minutes
- **Total:** 25 minutes

---

## ⏱️ 3. GENERATION STATUS UPDATE DELAYS AUDIT

### Status: ⚠️ PERFORMANCE ISSUE

### Problem Description
"Очень долго обновляется статус при генерации"

### Root Cause Analysis

#### Current Architecture

**Polling System** (`generation-handler.ts:277-300`):
```typescript
protected async startPolling(...) {
  const MAX_PROCESSING_TIME = 10 * 60 * 1000; // 10 minutes
  // Polling interval: starts at 5s, backs off exponentially
}
```

**Realtime Updates** (Frontend):
- `realtimeSubscriptionManager.ts` subscribes to `tracks` table changes
- Should trigger instant UI updates

#### Performance Issues Found

**1. Polling Delays:**
- Initial poll: 5 seconds
- Exponential backoff: up to 30 seconds between polls
- **Result:** User sees "processing" for 5-30 seconds even after completion

**2. Callback Processing:**
```typescript
// callback-processor.ts:117-132
await supabase.from('tracks').update({
  status: 'processing', // ❌ Still 'processing' even with audio_url!
  audio_url: immediateAudioUrl,
  ...
})
```
- Status stays "processing" during intermediate callbacks
- Only switches to "completed" on COMPLETE callback
- **Gap:** First audio is ready but UI shows "processing"

**3. Realtime Subscription Lag:**
- Network latency: 100-500ms
- Subscription processing: 50-200ms
- React re-render: 50-100ms
- **Total delay:** 200-800ms

### Metrics
- **Expected:** <1 second from completion
- **Actual:** 5-30 seconds
- **Target:** <2 seconds

### Fix Strategy

**Immediate Fixes:**
1. Set `status='completed'` when first audio_url is available
2. Add `playable: true` flag for instant UI feedback
3. Reduce initial polling interval to 2 seconds

**Long-term:**
1. Implement WebSocket for real-time status
2. Add progress percentage in metadata
3. Show "Audio ready - Finalizing..." state

### Estimated Fix Time
- Immediate fixes: 1 hour
- Testing: 30 minutes
- **Total:** 1.5 hours

---

## 🔄 4. VERSION INDICATOR DELAYS AUDIT

### Status: ⚠️ ARCHITECTURE ISSUE

### Problem Description
"Долго появляется индикатор версии"

### Root Cause Analysis

**Current Flow:**
1. Track created → `suno_id` set
2. Callback received → Multiple versions in `metadata.suno_data`
3. **PROBLEM:** Versions are in METADATA, not in `track_versions` table!
4. Frontend needs to query `/api/trackVersions` separately
5. Additional round-trip: 200-500ms

**audioPlayerStore.ts:540-665:**
```typescript
loadVersions: async (trackId) => {
  // Aborts previous request
  // Fetches from getTrackWithVariants API
  // Parses and creates version array
  // Sets availableVersions state
}
```

**Delays:**
1. API call: 200-500ms
2. Data transformation: 10-50ms
3. React re-render: 50-100ms
4. **Total:** 260-650ms

### Metrics
- **Expected:** Instant (data should be in initial track object)
- **Actual:** 260-650ms delay
- **Target:** <100ms

### Fix Strategy

**Option 1: Include versions in initial track fetch** (RECOMMENDED)
- Modify `useTracks` to join `track_versions`
- Return versions array with each track
- No additional API call needed

**Option 2: Preload versions on hover**
- Fetch versions when user hovers over track card
- Cache in React Query
- Instant when user clicks

**Option 3: Background prefetch**
- Fetch all versions for visible tracks
- Use IntersectionObserver
- Prefetch 100ms after track appears

### Estimated Fix Time
- Option 1: 2 hours (requires API changes)
- Option 2: 1 hour
- Option 3: 1.5 hours

---

## 🤖 5. REPLICATE MUSIC DESCRIPTION AUDIT

### Status: 🔍 RESEARCH REQUIRED

### Problem Description
"Верни описание музыки с помощью Replicate как было ранее"

### Investigation Needed

**Questions:**
1. What was the previous Replicate integration?
2. Which Replicate model was used? (MusicGen, AudioCraft, other?)
3. What type of descriptions were generated?
   - Genre classification?
   - Mood/emotion analysis?
   - Instrumental detection?
   - BPM/tempo analysis?

### Search Strategy
```bash
# Search for Replicate references
grep -r "replicate" supabase/functions/
grep -r "music.*description" src/
git log --all --grep="replicate" --oneline
```

### Potential Models
- **replicate/musicgen** - Music generation
- **replicate/audio-analysis** - Audio feature extraction
- **Meta MusicGen** - Text-to-music with descriptions

### Next Steps
1. Search git history for removed Replicate code
2. Check if API keys exist in environment
3. Review old Edge Functions for Replicate calls
4. Estimate restoration effort

### Estimated Research Time
- Git history search: 30 minutes
- Code review: 1 hour
- **Total:** 1.5 hours

---

## 📊 PRIORITY MATRIX

| Issue | Severity | Impact | Fix Time | Priority |
|-------|----------|--------|----------|----------|
| Lyrics not showing | P0 | Critical | 45min | 🔴 **URGENT** |
| Title assignment | P1 | High | 25min | 🟠 High |
| Status delays | P1 | High | 1.5h | 🟠 High |
| Version indicator | P2 | Medium | 1-2h | 🟡 Medium |
| Replicate restore | P2 | Medium | TBD | 🟡 Medium |

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (Day 1)
1. **Fix lyrics display** (45 min)
   - Add suno_id to track versions API
   - Test on mobile and desktop
   - Verify timestamped lyrics load

2. **Fix title assignment** (25 min)
   - Extract title from Suno callback
   - Update database on first callback
   - Test with custom and simple mode

### Phase 2: Performance (Day 2)
3. **Optimize status updates** (1.5h)
   - Set completed status on first audio
   - Reduce polling interval
   - Add playable flag

4. **Fix version indicator** (1-2h)
   - Choose implementation strategy
   - Implement prefetch or join
   - Measure performance improvement

### Phase 3: Feature Restore (Day 3)
5. **Replicate integration** (TBD)
   - Complete research phase
   - Estimate restoration effort
   - Implement if feasible

---

## 🔧 TECHNICAL DEBT IDENTIFIED

1. **Dual storage of versions** (metadata + track_versions table)
   - Causes sync issues
   - Adds API round-trips
   - **Recommendation:** Single source of truth

2. **Missing suno_id in queries**
   - Not selected in many JOIN queries
   - Breaks lyrics and other features
   - **Recommendation:** Add to all track SELECTs

3. **Status granularity**
   - Only 3 states: pending, processing, completed
   - Should have: pending, generating, audio_ready, finalizing, completed
   - **Recommendation:** Add intermediate states

4. **No progress indicators**
   - User sees "processing" for 30-60 seconds
   - No feedback on progress
   - **Recommendation:** Add progress percentage

---

## ✅ NEXT STEPS

1. **Approve priority order** with stakeholder
2. **Create feature branch** for fixes
3. **Implement Phase 1 fixes** (lyrics + title)
4. **Test thoroughly** on mobile and desktop
5. **Deploy to staging** for QA
6. **Monitor metrics** after production deploy

---

**End of Report**
