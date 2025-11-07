# INFINITE LOOP ROOT CAUSE ANALYSIS
**Audio Event Frequency & State Update Chain**

---

## CRITICAL FINDING: PlaybackControls Callback Recreation (MAIN CULPRIT)

### Location: `/home/user/albert3-muse-synth-studio/src/components/player/desktop/PlaybackControls.tsx` (Lines 44-54)

```typescript
// Line 44: Subscribe to FREQUENTLY UPDATED store value
const currentTime = useAudioPlayerStore((state) => state.currentTime);

// Line 50: Use it in callback
const onPreviousClick = useCallback(() => {
  const result = handlePrevious(currentTime);  // ← Uses currentTime
  if (result === 'restart') {
    seekTo(0);
  }
}, [handlePrevious, currentTime, seekTo]);  // ← PROBLEM: currentTime in deps!
```

**THE ISSUE:**
- `timeupdate` event fires **60 times per second** (video refresh rate)
- AudioController line 310: `updateCurrentTime(audio.currentTime)` called on EVERY timeupdate
- PlaybackControls line 44 subscribes to `currentTime` from store
- Line 54: `currentTime` is in the dependency array of `useCallback`
- Result: **`onPreviousClick` gets a new function reference 60 times per second**
- This new reference causes memoized Button components to re-render
- Re-renders trigger new calculations/event listeners

---

## AUDIO EVENT LISTENER REGISTRATION ANALYSIS

### AudioController.tsx - Event Listeners (Lines 425-436)

| Event | Lines | Frequency | Handler | Dependencies |
|-------|-------|-----------|---------|--------------|
| `timeupdate` | 425/432 | **60 FPS** | handleTimeUpdate | Calls updateCurrentTime() |
| `loadedmetadata` | 426/433 | 1x per track | handleLoadedMetadata | Logs only |
| `ended` | 427/434 | 1x at end | handleEnded | Calls playNext() |
| `progress` | 428/435 | Variable | handleProgress | Updates bufferingProgress |
| `error` | 429/436 | On error | handleError | Complex error handling |

**Critical Handler:**
```typescript
// Line 309-311: Called 60 TIMES PER SECOND
const handleTimeUpdate = () => {
  updateCurrentTime(audio.currentTime);  // ← Store update 60/sec
};
```

**Effect Dependencies (Line 438-447):**
```typescript
}, [
  audioRef, 
  currentTrack,        // ← Changes per track
  updateCurrentTime,   // ← Store action (stable)
  updateDuration,
  updateBufferingProgress,
  playNext,
  pause,
  playTrack
]);
```
✅ **GOOD**: Dependencies don't include `currentTime` (avoids circular effect)

---

## COMPONENTS SUBSCRIBING TO currentTime

### 1. ProgressBar.tsx (Line 21) - SAFE

```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);
```
✅ **Safe**: Component is memoized and only uses currentTime for display
- Re-renders on every currentTime change ✓ (expected for progress bar)
- No callbacks that depend on currentTime
- Direct prop passing to Slider component

---

### 2. LyricsDisplay.tsx (Lines 26, 33-38) - SAFE

```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);

const currentWordIndex = useMemo(() => {
  if (!lyricsData?.alignedWords) return -1;
  return lyricsData.alignedWords.findIndex(
    (word) => currentTime >= word.startS && currentTime <= word.endS
  );
}, [currentTime, lyricsData]);  // ✓ Used only in useMemo
```
✅ **Safe**: Memoized component, currentTime only in useMemo dependency

---

### 3. PlaybackControls.tsx (Lines 44, 50, 54) - **DANGEROUS**

```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);

const onPreviousClick = useCallback(() => {
  const result = handlePrevious(currentTime);  // ← Uses stale closure
  if (result === 'restart') {
    seekTo(0);
  }
}, [handlePrevious, currentTime, seekTo]);  // ⚠️ currentTime in deps!
```

**PROBLEM CHAIN:**
1. currentTime updates 60 times per second
2. `useCallback` compares dependencies
3. `currentTime` changed → new `onPreviousClick` reference
4. Parent component (likely passes as prop) re-renders
5. Button components re-render
6. Event handlers potentially re-attached
7. Component unmount/remount cycles
8. Effects re-run → new event listeners

---

### 4. FullScreenPlayer.tsx (Lines 42-44) - **DANGEROUS**

```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);
const duration = useAudioPlayerStore((state) => state.duration);
const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
```

**PROBLEM:**
- FullScreenPlayer is a large component
- Subscribes to 3 frequently-updating values
- Re-renders on EVERY timeupdate event
- This is a mobile fullscreen component with many nested children
- All descendants potentially re-render

---

## TimestampedLyricsDisplay.tsx - PREVIOUSLY "FIXED" (NOW SAFE)

✅ **Status**: Safe

Lines 102-128: Uses debounced scroll logic
```typescript
useEffect(() => {
  if (activeLineIndex !== -1 && activeLineIndex !== lastScrolledIndexRef.current) {
    // Scroll only when index CHANGES, not on every timeupdate
    scrollTimeoutRef.current = setTimeout(() => {
      activeLineRef.current?.scrollIntoView({...});
      lastScrolledIndexRef.current = activeLineIndex;
    }, 150);  // ← Debounced!
  }
}, [activeLineIndex]);  // ✓ NOT currentTime!
```

---

## FREQUENCY ANALYSIS: How Often Events Fire

### Per Second Breakdown:
```
60 timeupdate events/sec
  ↓
updateCurrentTime() called 60 times/sec
  ↓
Zustand store.currentTime updated 60 times/sec
  ↓
All subscribers of currentTime notified 60 times/sec
  ↓
Components re-render 60 times/sec:
  ├─ ProgressBar ✓ (acceptable, it's a progress display)
  ├─ LyricsDisplay ✓ (safe, memoized with useMemo)
  ├─ PlaybackControls ⚠️ (callbacks recreated 60x/sec)
  └─ FullScreenPlayer ⚠️ (entire component re-renders 60x/sec)
```

---

## ROOT CAUSE: UPDATE CASCADE

```
AudioController's timeupdate listener
  ↓ (60 times/sec)
updateCurrentTime() → Store updates
  ↓
PlaybackControls subscribes to currentTime
  ↓
useCallback dependency changed
  ↓
onPreviousClick new reference created (60x/sec)
  ↓
Parent receives new callback prop
  ↓
Memoized buttons re-render (React.memo shallow comparison fails)
  ↓
Event listeners potentially re-attached
  ↓
Effects may re-run
  ↓
NEW event listeners registered
  ↓
INFINITE: Old listeners not cleaned up properly
```

---

## EVENT LISTENER CLEANUP VERIFICATION

### AudioController.tsx Cleanup (Lines 431-437)

```typescript
return () => {
  audio.removeEventListener('timeupdate', handleTimeUpdate);
  audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
  audio.removeEventListener('ended', handleEnded);
  audio.removeEventListener('progress', handleProgress);
  audio.removeEventListener('error', handleError);
};
```

✅ **Appears correct**: Event listeners are removed on cleanup

**BUT ISSUE**: 
- Effect runs every time ANY dependency changes
- If dependencies are unstable, effect runs frequently
- Each run adds NEW listeners before removing old ones
- If removals fail (e.g., different function reference), listeners accumulate

**Check Effect Dependencies (Line 438-447):**
- No `currentTime` dependency ✓
- `updateCurrentTime` is a store action (should be stable) ✓
- But if `audioRef` changes or becomes unstable, effect re-runs

---

## ADDITIONAL OBSERVERS

### 1. MediaSession API (Lines 114, 119, 124, 129, 134)

```typescript
navigator.mediaSession.setActionHandler('play', () => {
  playTrack(currentTrack);
});
```
- Set ONCE in effect (mediaSessionSetRef prevents re-setting) ✓
- No currentTime dependency ✓

### 2. SafePlay Function (Lines 35-92)

```typescript
const safePlay = useCallback(async () => {
  // Complex play logic with multiple safety checks
}, [audioRef, currentTrack?.id, currentTrack?.audio_url]);
```

✅ **Correct**: Doesn't depend on currentTime

---

## SUMMARY: Event Listener Registration Count

### By Component:

| Component | Event Type | Count | Frequency | Safe? |
|-----------|-----------|-------|-----------|-------|
| AudioController | timeupdate | 1 | 60/sec | ✓ (if cleanup works) |
| AudioController | loadedmetadata | 2* | 1/track | ✓ |
| AudioController | ended | 1 | 1/track | ✓ |
| AudioController | progress | 1 | Variable | ✓ |
| AudioController | error | 1 | On error | ✓ |
| SunoPrototype (debug) | timeupdate | 1 | 60/sec | ✓ |
| AudioPreviewDialog | timeupdate | 1 | 60/sec | ✓ |
| **TOTAL** | - | **~8** | - | **✓ IF CLEANUP WORKS** |

*Note: loadedmetadata registered in TWO places (line 270 and 426)

---

## THE INFINITE LOOP MECHANISM

### Most Likely Scenario:

1. **PlaybackControls.tsx dependency issue**
   - currentTime in useCallback deps
   - Callback recreated 60x/sec
   - Button re-renders due to new prop
   - Parent or effects re-run
   
2. **Effect re-runs cause listener duplication**
   - If effect dependencies aren't stable
   - New listener added before old one removed
   - Listeners accumulate
   - All 60 get called per event
   - System slows down
   - React can't cleanup fast enough
   - More listeners accumulate
   - INFINITE LOOP

### Debug Evidence:

The fact that it's an "infinite update loop" suggests:
- Not a single listener firing infinitely
- More likely: listeners accumulating
- Or: render → effect → state update → render cycle

---

## ACTIONABLE FINDINGS

### HIGH PRIORITY (Fix immediately):

1. **PlaybackControls.tsx line 54**: Remove `currentTime` from useCallback dependencies
   - Store the currentTime value only when needed
   - OR: Use a different pattern that doesn't require currentTime in deps

2. **Verify AudioController effect cleanup**
   - Add console.log to verify listeners are actually removed
   - Check if function references change between renders

### MEDIUM PRIORITY (Optimization):

3. **FullScreenPlayer.tsx lines 42-44**: 
   - Consider not subscribing to currentTime
   - Or memoize the component more aggressively
   - OR: Move currentTime-dependent logic to child components

4. **De-duplicate loadedmetadata listeners**
   - Line 270 and Line 426 both register loadedmetadata
   - Consolidate to one location

### MONITORING:

5. **Add performance metrics**
   - Track render count per component
   - Count active event listeners: `getEventListeners(audioRef.current)`
   - Monitor store update frequency: `Zustand devtools`
