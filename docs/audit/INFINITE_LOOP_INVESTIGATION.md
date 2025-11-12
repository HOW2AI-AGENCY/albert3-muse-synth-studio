# COMPREHENSIVE INFINITE LOOP INVESTIGATION REPORT
# Audio Player "Maximum Update Depth Exceeded" Error

## Executive Summary
The "Maximum update depth exceeded" error typically indicates React is detecting a cycle where:
1. Component renders and calls setState
2. setState triggers re-render
3. Re-render calls setState again
4. This repeats until React's limit (50 re-renders)

## CRITICAL FINDINGS

### ISSUE #1: usePlayerVisibility Hook Circular Dependency [SEVERITY: CRITICAL]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerVisibility.ts` (lines 8-27)  
**Status**: ACTIVE BUG

```typescript
export const usePlayerVisibility = (currentTrack: any) => {
  const [isVisible, setIsVisible] = useState(false);  // Local state
  const setPlayerExpanded = useUIStateStore((state) => state.setPlayerExpanded);
  
  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);  // Updates local state
    } else {
      setIsVisible(false);
      setPlayerExpanded(false);
    }
  }, [currentTrack, setPlayerExpanded]);  // ← setPlayerExpanded in deps!

  return { isVisible, isExpanded: isPlayerExpanded, setIsExpanded };
};
```

**Usage in DesktopPlayerLayout.tsx** (line 25):
```typescript
const { isVisible } = usePlayerVisibility(track);
```

**And in render** (line 126):
```tsx
${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95...'}
```

**THE PROBLEM**:
1. When `track` prop changes in DesktopPlayerLayout
2. usePlayerVisibility is called
3. Its useEffect runs and calls `setIsVisible(true)`
4. This causes DesktopPlayerLayout to re-render (because isVisible is used in JSX)
5. DesktopPlayerLayout re-renders, but it's memoized
6. However, the internal hook call happens again
7. If track stayed the same, useEffect won't run again (but might)
8. However, if something else triggered usePlayerVisibility to be re-evaluated, we get a loop

**Root Cause**: `setPlayerExpanded` in the dependency array is suspicious. Zustand functions should be stable, but this might be causing the hook to run too often.

---

### ISSUE #2: Lyrics Components Ref Callback Recreation [SEVERITY: HIGH]
**Files**:
- `/home/user/albert3-muse-synth-studio/src/components/player/TimestampedLyricsDisplay.tsx` (line 166)
- `/home/user/albert3-muse-synth-studio/src/components/player/LyricsMobile.tsx` (line 286)
- `/home/user/albert3-muse-synth-studio/src/components/player/LyricsDisplay.tsx` (lines 79-85)

**Pattern in TimestampedLyricsDisplay.tsx**:
```typescript
const setActiveLineRef = useCallback((element: HTMLDivElement | null, index: number) => {
  if (index === activeLineIndex && element) {
    activeLineRef.current = element;
  }
}, [activeLineIndex]);  // ← activeLineIndex in deps

// Then in render:
{lines.map((line, index) => (
  <div
    key={index}
    ref={(el) => setActiveLineRef(el, index)}  // ← Ref callback on EVERY render
    ...
  >
```

**THE PROBLEM**:
1. currentTime updates 60 times/sec
2. activeLineIndex computed from currentTime changes
3. activeLineIndex in useCallback deps → callback recreated
4. When callback is recreated, ALL div elements get new ref callbacks
5. Ref callbacks fire immediately
6. Each ref callback checks if this is the active line
7. If DOM updates happen, scrollIntoView is triggered (line 113 in LyricsMobile)
8. DOM changes might trigger re-renders of parent components

**Additional Risk**: In LyricsDisplay.tsx, the `currentWordIndex` useMemo (line 33-37) is recreated when `currentTime` changes, and this is used in conditional rendering.

---

### ISSUE #3: High-Frequency Store Subscriptions [SEVERITY: HIGH]

**PlaybackControls.tsx** `/home/user/albert3-muse-synth-studio/src/components/player/desktop/PlaybackControls.tsx`:
```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);
```

**ProgressBar.tsx** `/home/user/albert3-muse-synth-studio/src/components/player/desktop/ProgressBar.tsx`:
```typescript
const currentTime = useAudioPlayerStore((state) => state.currentTime);
const duration = useAudioPlayerStore((state) => state.duration);
const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
```

**THE PROBLEM**:
- AudioController calls `updateCurrentTime` 60 times/sec (from audio 'timeupdate' event)
- This updates Zustand store
- PlaybackControls and ProgressBar subscribe internally
- These components re-render 60 times/sec
- Their callbacks are recreated 60 times/sec
- If these callbacks are passed to parent components, parent re-renders

**Issue in PlaybackControls.tsx lines 49-54**:
```typescript
const onPreviousClick = useCallback(() => {
  const result = handlePrevious(currentTime);
  ...
}, [handlePrevious, currentTime, seekTo]);  // ← currentTime causes recreation 60x/sec
```

---

### ISSUE #4: DesktopPlayerLayout Volume State Sync [SEVERITY: MEDIUM]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/desktop/DesktopPlayerLayout.tsx` (lines 43-95)

```typescript
useEffect(() => {
  const shouldBeMuted = volume === 0;
  if (isMutedRef.current !== shouldBeMuted) {
    setIsMuted(shouldBeMuted);  // ← Local state update!
  }
}, [volume]);
```

**THE PROBLEM**:
1. User drags volume slider
2. handleVolumeChange calls setVolume + setIsMuted
3. setVolume updates store
4. volume from store triggers useEffect (line 61-66)
5. useEffect calls setIsMuted (redundantly, since handleVolumeChange already did)
6. setIsMuted causes DesktopPlayerLayout to re-render
7. Could cause cascading re-renders if parent also re-renders

---

### ISSUE #5: AudioController Event Listener Cascade [SEVERITY: HIGH]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/AudioController.tsx` (lines 305-447)

```typescript
useEffect(() => {
  // ... many listeners registered:
  audio.addEventListener('timeupdate', handleTimeUpdate);      // 60x/sec
  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('progress', handleProgress);
  audio.addEventListener('error', handleError);
  
  return () => {
    // Cleanup
  };
}, [
  audioRef,
  currentTrack,
  updateCurrentTime,      // Store action
  updateDuration,         // Store action
  updateBufferingProgress,// Store action
  playNext,               // Store action
  pause,                  // Store action
  playTrack               // Store action
]);
```

**THE PROBLEM**:
1. handleTimeUpdate calls updateCurrentTime on EVERY timeupdate event (60x/sec)
2. updateCurrentTime updates Zustand store
3. This effect has many dependencies
4. If any of these dependencies change, listeners are re-registered
5. Multiple registration/deregistration cycles could cause issues

**Critical**: The `handleLoadedMetadataAndPlay` callback (line 271-281) calls `safePlay()` via setTimeout. If this runs multiple times due to listener re-registration, it could cause audio.play() to be called excessively.

**DUPLICATE LISTENERS BUG** (Line 283 & 426):
```typescript
// Line 283 - Added in track loading effect
audio.addEventListener('loadedmetadata', handleLoadedMetadataAndPlay);

// Line 426 - Also added in events effect
audio.addEventListener('loadedmetadata', handleLoadedMetadata);
```
TWO loadedmetadata listeners on the same audio element!

---

## RANKED LIKELIHOOD OF BEING THE ROOT CAUSE

### TIER 1: ALMOST CERTAINLY THE ISSUE
1. **ISSUE #1**: usePlayerVisibility circular dependency (setIsVisible + isVisible in render)
   - Most likely because it directly causes re-renders
   - The isVisible state is used in DesktopPlayerLayout className

2. **ISSUE #5**: AudioController event listener re-registration + duplicate listeners
   - The 60 FPS updateCurrentTime could trigger re-registrations
   - Multiple listeners re-registering could create cascade effects
   - **DUPLICATE 'loadedmetadata' listeners is a smoking gun**

### TIER 2: VERY LIKELY CONTRIBUTING
3. **ISSUE #2**: Ref callback recreation in lyrics components
   - 60 times/sec ref updates could trigger DOM layout thrashing
   - Could bubble up and cause parent re-renders

4. **ISSUE #3**: High-frequency store subscriptions
   - While components should be memoized, callback recreation still happens
   - If callbacks are passed to parents, could cause issues

5. **ISSUE #4**: Volume state sync in DesktopPlayerLayout
   - Double state updates on volume change
   - Could accumulate and cause issues

---

## COMPONENT FILE LIST WITH LINE COUNTS

| File | Lines | Highest Risk |
|------|-------|------|
| `/home/user/albert3-muse-synth-studio/src/components/player/AudioController.tsx` | 510 | CRITICAL |
| `/home/user/albert3-muse-synth-studio/src/components/player/FullScreenPlayer.tsx` | 439 | HIGH |
| `/home/user/albert3-muse-synth-studio/src/components/player/GlobalAudioPlayer.tsx` | 49 | CRITICAL |
| `/home/user/albert3-muse-synth-studio/src/components/player/LyricsDisplay.tsx` | 131 | HIGH |
| `/home/user/albert3-muse-synth-studio/src/components/player/LyricsMobile.tsx` | 372 | HIGH |
| `/home/user/albert3-muse-synth-studio/src/components/player/MiniPlayer.tsx` | 316 | MEDIUM |
| `/home/user/albert3-muse-synth-studio/src/components/player/PlayerQueue.tsx` | 206 | LOW |
| `/home/user/albert3-muse-synth-studio/src/components/player/TimestampedLyricsDisplay.tsx` | 231 | HIGH |
| `/home/user/albert3-muse-synth-studio/src/components/player/desktop/DesktopPlayerLayout.tsx` | 315 | CRITICAL |
| `/home/user/albert3-muse-synth-studio/src/components/player/desktop/PlaybackControls.tsx` | 262 | MEDIUM |
| `/home/user/albert3-muse-synth-studio/src/components/player/desktop/ProgressBar.tsx` | 85 | MEDIUM |
| `/home/user/albert3-muse-synth-studio/src/components/player/desktop/TrackInfo.tsx` | 84 | LOW |
| `/home/user/albert3-muse-synth-studio/src/components/player/desktop/VolumeControl.tsx` | 84 | LOW |
| `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerControls.ts` | 52 | LOW |
| `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerKeyboardShortcuts.ts` | 110 | LOW |
| `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerVisibility.ts` | 27 | CRITICAL |

---

## RECOMMENDED FIXES (IN ORDER)

### FIX #1: Remove Duplicate loadedmetadata Listeners [PRIORITY: P0]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/AudioController.tsx`

Remove line 283 OR remove the listener from line 426. Keep only ONE loadedmetadata listener.

**Code Change**:
```typescript
// REMOVE THIS (line 283):
audio.addEventListener('loadedmetadata', handleLoadedMetadataAndPlay);

// KEEP ONLY THIS (line 426):
audio.addEventListener('loadedmetadata', handleLoadedMetadata);
```

### FIX #2: Fix usePlayerVisibility Dependency Array [PRIORITY: P0]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerVisibility.ts`

Remove `setPlayerExpanded` from dependency array:

```typescript
useEffect(() => {
  if (currentTrack) {
    setIsVisible(true);
  } else {
    setIsVisible(false);
    setPlayerExpanded(false);
  }
}, [currentTrack]); // ← REMOVE setPlayerExpanded from deps
```

### FIX #3: Remove Duplicate Volume State Updates [PRIORITY: P1]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/desktop/DesktopPlayerLayout.tsx`

Remove the redundant `setIsMuted` call in `handleVolumeChange` since the useEffect will handle it:

```typescript
const handleVolumeChange = useCallback((value: number[]) => {
  const newVolume = value[0];
  setVolume(newVolume);

  if (newVolume > 0) {
    previousVolumeRef.current = newVolume;
  }

  // REMOVE this line - useEffect handles it
  // setIsMuted(newVolume === 0);
}, [setVolume]);
```

### FIX #4: Debounce currentTime Updates [PRIORITY: P1]
**File**: `/home/user/albert3-muse-synth-studio/src/components/player/AudioController.tsx`

Change updateCurrentTime to debounce instead of updating 60x/sec:

```typescript
const handleTimeUpdate = (() => {
  let timeoutId: number | null = null;
  let lastTime = 0;
  
  return () => {
    const now = audio.currentTime;
    if (Math.abs(now - lastTime) > 0.1) {  // Only update if > 100ms difference
      lastTime = now;
      updateCurrentTime(now);
    }
  };
})();
```

---

## FILES FOR IMMEDIATE REVIEW

1. `/home/user/albert3-muse-synth-studio/src/components/player/AudioController.tsx` - 510 lines
   - Lines 283, 309-310, 425-436 - CRITICAL
   
2. `/home/user/albert3-muse-synth-studio/src/components/player/hooks/usePlayerVisibility.ts` - 27 lines
   - Line 20 - CRITICAL

3. `/home/user/albert3-muse-synth-studio/src/components/player/desktop/DesktopPlayerLayout.tsx` - 315 lines
   - Lines 61-95, 284-295 - CRITICAL

4. `/home/user/albert3-muse-synth-studio/src/components/player/TimestampedLyricsDisplay.tsx` - 231 lines
   - Lines 95-99, 166 - HIGH

5. `/home/user/albert3-muse-synth-studio/src/components/player/LyricsMobile.tsx` - 372 lines
   - Lines 125-129, 286 - HIGH

6. `/home/user/albert3-muse-synth-studio/src/components/player/GlobalAudioPlayer.tsx` - 49 lines
   - Line 18 - CRITICAL

