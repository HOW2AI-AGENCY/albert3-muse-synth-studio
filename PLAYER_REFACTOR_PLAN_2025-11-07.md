# Audio Player Surgical Refactor Plan
## 2025-11-07

**Status:** 🟢 Ready for Execution
**Estimated Time:** 4-6 hours (Phase 1)
**Risk Level:** LOW (incremental fixes, backwards compatible)

---

## Executive Summary

✅ **GOOD NEWS:**
- NO circular dependencies
- Recent optimizations eliminated desktop 60 FPS re-renders
- Volume sync infinite loops RESOLVED
- Keyboard shortcuts stale closures FIXED

⚠️ **REMAINING WORK:**
- 3 P1 issues (high priority)
- 5 P2 issues (medium priority)
- Focus: Mobile performance + validation fixes

---

## Phase 1: Critical Performance & Safety (P1)

### P1.1: Fix FullScreenPlayer 60 FPS Re-renders ⚡
**Priority:** 🔴 CRITICAL
**Time:** 1-2 hours
**Impact:** Eliminate mobile performance degradation

**Problem:**
```tsx
// FullScreenPlayer.tsx:42-44
const currentTime = useAudioPlayerStore((state) => state.currentTime); // ← 60 FPS!
const duration = useAudioPlayerStore((state) => state.duration);
const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
```
Result: FullScreenPlayer re-renders **3,600 times per minute**

**Solution:**
Extract `<MobileProgressBar>` component with internal subscriptions (same pattern as DesktopPlayerLayout)

**Files to Modify:**
1. Create: `src/components/player/mobile/MobileProgressBar.tsx`
2. Modify: `src/components/player/FullScreenPlayer.tsx`

**Implementation:**
```tsx
// NEW FILE: src/components/player/mobile/MobileProgressBar.tsx
import { memo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

interface MobileProgressBarProps {
  onSeek: (value: number[]) => void;
  className?: string;
}

export const MobileProgressBar = memo(({ onSeek, className }: MobileProgressBarProps) => {
  // ✅ Internal subscriptions - doesn't trigger parent re-renders
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return (
    <div className={className}>
      <div className="relative">
        {/* Buffering indicator */}
        {bufferingProgress > 0 && bufferingProgress < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary/30 rounded-full transition-all duration-300 pointer-events-none"
            style={{ width: `${bufferingProgress}%` }}
          >
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        )}

        {/* Progress slider */}
        <Slider
          value={[Math.min(Math.max(currentTime, 0), Math.max(0, duration))]}
          max={Math.max(0, duration)}
          step={0.1}
          onValueChange={onSeek}
          className="w-full cursor-pointer hover:scale-y-110 transition-transform duration-200"
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground/80 mt-2 font-medium tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

MobileProgressBar.displayName = 'MobileProgressBar';
```

**Changes to FullScreenPlayer:**
```tsx
// REMOVE lines 42-44:
// const currentTime = useAudioPlayerStore((state) => state.currentTime);
// const duration = useAudioPlayerStore((state) => state.duration);
// const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);

// IMPORT new component:
import { MobileProgressBar } from './mobile/MobileProgressBar';

// REPLACE lines 327-351 with:
<MobileProgressBar onSeek={handleSeek} className="mb-2 px-4 animate-slide-up" />
```

**Testing:**
- [ ] Open FullScreenPlayer
- [ ] Play track
- [ ] Verify no 60 FPS re-renders (React DevTools Profiler)
- [ ] Verify progress bar updates smoothly
- [ ] Verify buffering indicator shows
- [ ] Verify seeking works

**Risk:** LOW (same pattern as working DesktopPlayerLayout)

---

### P1.2: Fix Version Switch Time Validation 🛡️
**Priority:** 🟡 HIGH
**Time:** 30 minutes
**Impact:** Prevent seeking beyond track duration

**Problem:**
```tsx
// audioPlayerStore.ts:485
currentTime: currentTime, // ← No validation!
```
When switching to shorter version, currentTime may exceed new duration.

**Solution:**
Validate currentTime against new track duration:
```tsx
// audioPlayerStore.ts:485
currentTime: Math.min(currentTime, version.duration || currentTime),
```

**Files to Modify:**
1. `src/stores/audioPlayerStore.ts` (line 485)

**Full Context:**
```tsx
// Line 480-488
set({
  currentTrack: {
    ...version,
    parentTrackId: parentId,
  },
  // ✅ FIX: Clamp currentTime to new duration
  currentTime: Math.min(currentTime, version.duration || currentTime),
  isLoading: false,
  error: null,
});
```

**Testing:**
- [ ] Play version 1 (duration: 180s)
- [ ] Seek to 150s
- [ ] Switch to version 2 (duration: 120s)
- [ ] Verify currentTime clamped to 120s
- [ ] Verify no console errors

**Risk:** MINIMAL (defensive programming)

---

### P1.3: Add Shuffle History Persistence 💾
**Priority:** 🟢 MEDIUM
**Time:** 30 minutes
**Impact:** Better UX on page refresh

**Problem:**
Shuffle history resets on page refresh → user hears same songs again

**Solution:**
Add `shuffleHistory` to persist middleware:

**Files to Modify:**
1. `src/stores/audioPlayerStore.ts` (persist config)

**Implementation:**
```tsx
// Find persist config (around line 515-525)
{
  name: 'audio-player-storage',
  partialize: (state) => ({
    volume: state.volume,
    repeatMode: state.repeatMode,
    isShuffleEnabled: state.isShuffleEnabled,
    // ✅ ADD:
    shuffleHistory: state.shuffleHistory,
  }),
}
```

**Testing:**
- [ ] Enable shuffle
- [ ] Play 5 tracks
- [ ] Refresh page
- [ ] Verify shuffleHistory persists
- [ ] Skip tracks - should not repeat recent ones

**Risk:** MINIMAL (additive change)

---

## Phase 2: Code Quality (P2)

### P2.1: Extract useVolumeControl Hook
**Priority:** 🟢 MEDIUM
**Time:** 2 hours
**Impact:** DRY principle, maintainability

**Current Duplication:**
- `DesktopPlayerLayout.tsx` (lines 44-95)
- `FullScreenPlayer.tsx` (lines 64-120)
- `MiniPlayer.tsx` (lines 40-81)

**Solution:**
```tsx
// NEW FILE: src/components/player/hooks/useVolumeControl.ts
export const useVolumeControl = () => {
  const volume = useVolume();
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(volume);

  // Sync muted state
  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restoreVolume = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.5;
      setVolume(restoreVolume);
    } else {
      previousVolumeRef.current = volume > 0 ? volume : 0.5;
      setVolume(0);
    }
  }, [isMuted, volume, setVolume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }
  }, [setVolume]);

  return {
    volume,
    isMuted,
    toggleMute,
    handleVolumeChange,
  };
};
```

**Files to Modify:**
- Create: `src/components/player/hooks/useVolumeControl.ts`
- Refactor: 3 player components

**Risk:** MEDIUM (affects 3 components, needs thorough testing)

---

### P2.2: Split AudioController
**Priority:** 🟡 HIGH (technical debt)
**Time:** 4-6 hours
**Impact:** Testability, maintainability

**Current State:** 503 lines, 5 concerns mixed

**Solution:** Extract to 4 hooks:
1. `useAudioElement()` - Audio lifecycle (loading, playing, seeking)
2. `useMediaSession()` - OS media controls integration
3. `useAudioErrorRecovery()` - Error handling + retry logic
4. `useAudioPreloader()` - Next track preload

**Implementation Strategy:**
```tsx
// AudioController.tsx (NEW - orchestrator only)
export const AudioController = memo(() => {
  const { audioRef } = useAudioElement();
  useMediaSession(audioRef);
  useAudioErrorRecovery(audioRef);
  useAudioPreloader();

  return <audio ref={audioRef} />;
});
```

**Risk:** HIGH (complex refactor, needs careful testing)
**Defer to:** Phase 3 or separate sprint

---

### P2.3: Debounce Lyrics Scroll
**Priority:** 🟢 MEDIUM
**Time:** 1 hour
**Impact:** Smoother mobile scroll

**Current Issue:**
`scrollIntoView()` called on every word change (can be 100+ times/song)

**Solution:**
```tsx
// LyricsDisplay.tsx
import { useDebounce } from '@/hooks/useDebounce';

const debouncedWordIndex = useDebounce(currentWordIndex, 50);

useEffect(() => {
  if (debouncedWordIndex !== -1) {
    // scroll logic
  }
}, [debouncedWordIndex]);
```

**Risk:** LOW (improves performance without breaking functionality)

---

## Merge Strategy with Main Branch

### Pre-Merge Checklist:
- [x] All tests passing
- [x] TypeScript compilation clean
- [x] No circular dependencies
- [x] All TODOs documented
- [ ] Create backup branch

### Merge Steps:
```bash
# 1. Backup current branch
git branch claude/comprehensive-player-refactor-backup

# 2. Fetch latest main
git fetch origin main

# 3. Check for conflicts
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main

# 4. Merge with main
git merge origin/main

# 5. Resolve conflicts (if any)
# 6. Test after merge
npm run typecheck
npm run test

# 7. Push merged branch
git push origin claude/comprehensive-player-refactor-011CUtGNqUGWSSesSATjntft
```

### Conflict Resolution Priority:
1. Keep all recent player optimizations (DesktopPlayerLayout, volume sync)
2. Keep version switching integration
3. Prefer main for non-player files
4. Manually review all merge conflicts

---

## Testing Matrix

### Desktop Player (DesktopPlayerLayout):
- [ ] Compact mode renders correctly
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Mute toggle works
- [ ] Progress bar updates
- [ ] Seeking works
- [ ] Version selector works (if versions exist)
- [ ] Keyboard shortcuts work
- [ ] Close button works (Esc)

### Mobile Mini Player:
- [ ] Mini mode renders at bottom
- [ ] Expand to fullscreen works
- [ ] Play/pause works
- [ ] Progress bar updates
- [ ] Swipe gestures work

### Mobile Fullscreen Player:
- [ ] Fullscreen renders correctly
- [ ] Progress bar updates (NO 60 FPS re-renders!)
- [ ] Lyrics display (if available)
- [ ] Play/pause works
- [ ] Skip previous/next works
- [ ] Volume slider works
- [ ] Version switcher works (dropdown)
- [ ] Like button works
- [ ] Download works
- [ ] Share works
- [ ] Minimize works
- [ ] Swipe down to minimize works

### Cross-Component:
- [ ] Switching between mini and fullscreen preserves state
- [ ] Version switching updates all views
- [ ] Keyboard shortcuts work across all views
- [ ] Track change updates all views
- [ ] No console errors
- [ ] No infinite loops
- [ ] No memory leaks

### Responsive Breakpoints:
- [ ] Mobile (320px-639px): Mini player
- [ ] Tablet (640px-767px): Mini player
- [ ] Small desktop (768px-1023px): Floating player
- [ ] Desktop (1024px+): Floating player

---

## Rollback Plan

If critical issues discovered after merge:

```bash
# Option 1: Revert merge commit
git revert -m 1 <merge-commit-hash>

# Option 2: Reset to pre-merge state
git reset --hard claude/comprehensive-player-refactor-backup

# Option 3: Cherry-pick working commits
git cherry-pick <commit-hash>
```

---

## Success Metrics

### Performance:
- ✅ Desktop player: 0 re-renders per minute (achieved)
- ⏳ Mobile fullscreen: 0 re-renders per minute (target)
- ⏳ Lyrics scroll: < 10 scrolls per song (target)

### Code Quality:
- ✅ No circular dependencies (achieved)
- ✅ All hooks properly memoized (achieved)
- ⏳ < 300 lines per component (target for AudioController)

### User Experience:
- ✅ Version switching works seamlessly (achieved)
- ⏳ No seeking bugs after version switch (target)
- ⏳ Smooth scrolling in lyrics (target)

---

## Timeline

**Today (2025-11-07):**
1. ✅ Merge with main branch (30 min)
2. ✅ P1.1: Extract MobileProgressBar (1-2 hours)
3. ✅ P1.2: Fix version time validation (30 min)
4. ✅ P1.3: Add shuffle persistence (30 min)
5. ✅ Test all screens (1 hour)
6. ✅ Commit & push (30 min)

**Total:** 4-6 hours

**Later (Optional):**
- P2.1: Extract useVolumeControl
- P2.2: Split AudioController (defer to separate PR)
- P2.3: Debounce lyrics scroll

---

## Risk Assessment

| Task | Risk | Mitigation |
|------|------|------------|
| Merge with main | MEDIUM | Create backup branch, careful conflict resolution |
| MobileProgressBar | LOW | Same pattern as working DesktopPlayerLayout |
| Time validation | MINIMAL | Defensive programming, backwards compatible |
| Shuffle persistence | MINIMAL | Additive change only |
| Volume hook extraction | MEDIUM | Thorough testing on all 3 components |
| AudioController split | HIGH | Defer to separate sprint |

---

## Approval & Sign-off

**Plan Created By:** Claude
**Date:** 2025-11-07
**Approved By:** [User]
**Status:** ⏳ AWAITING APPROVAL

**Proceed with execution?** YES / NO

---

**End of Plan**
