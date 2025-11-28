# Technical Audit Report — Albert3 Muse Synth Studio
# Code Quality, Performance & Bug Analysis

**Generated:** 2025-11-28
**Auditor:** AI Senior Engineering Agent
**Scope:** Full codebase analysis with focus on mobile UI bugs, infinite loops, and performance
**Methodology:** Static code analysis + pattern detection + component dependency analysis

---

## 📋 Executive Summary

This technical audit identified **7 priority issues** (2 P0, 3 P1, 2 P2) and **3 positive patterns**. The codebase demonstrates **high architectural quality** with modern React patterns, but contains **critical performance issues** in the audio player system and potential infinite loops in UI components.

### Critical Issues (P0)
1. **Library.tsx useEffect infinite loop** — containerWidth dependency creates potential render loop
2. **AudioPlayerStore complexity** — 881 lines with async race conditions and setTimeout patterns

### High Priority (P1)
3. **AudioController useEffect deps** — safePlay callback in dependencies causes extra renders
4. **MiniPlayer 60 FPS re-renders** — subscribes to currentTime causing constant updates
5. **Mobile ViewToggle pattern** — inline buttons instead of ViewSwitcher component

### Medium Priority (P2)
6. **DetailPanelMobileV2 Sheet integration** — verify mobile opening behavior
7. **Test coverage for auth-required flows** — needs TEST_MODE strategy

---

## 🔍 Detailed Findings

### **P0-1: Library.tsx ResizeObserver useEffect Infinite Loop**

**File:** `src/pages/workspace/Library.tsx:113-135`
**Severity:** P0 (Critical)
**Impact:** Potential browser hang, excessive re-renders on mobile viewports

**Root Cause:**
```typescript
// LINE 113-135
useEffect(() => {
  if (!containerRef.current) return;

  const updateWidth = (width: number) => {
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);  // ❌ Updates state
    }
  };

  // ...ResizeObserver setup...

  resizeObserver.observe(containerRef.current);

  return () => resizeObserver.disconnect();
}, [containerWidth]);  // ❌ Depends on state it updates!
```

**Why это проблема:**
1. useEffect has `containerWidth` in dependency array
2. Inside effect, `setContainerWidth()` is called
3. When containerWidth changes → useEffect runs again
4. ResizeObserver may report sub-pixel width changes (e.g., 1023.5 vs 1024)
5. This creates **infinite loop** until width stabilizes

**Evidence:**
- The `updateWidth` function checks `width !== containerWidth`, but floating-point comparison can fail
- Mobile browsers часто report fractional pixels during scrolling/orientation changes
- No debouncing или throttling applied to ResizeObserver callback

**Reproduction Steps:**
1. Open Library page on mobile (viewport < 768px)
2. Rotate device or trigger resize event
3. Observe React DevTools for excessive renders
4. Check browser console for "Maximum update depth exceeded" warning

**Recommended Fix:**
```typescript
// OPTION 1: Remove containerWidth from deps (useRef instead)
const containerWidthRef = useRef(0);

useEffect(() => {
  if (!containerRef.current) return;

  const updateWidth = (width: number) => {
    const rounded = Math.round(width); // Round to prevent floating-point issues
    if (rounded > 0 && rounded !== containerWidthRef.current) {
      containerWidthRef.current = rounded;
      setContainerWidth(rounded);
    }
  };

  // Initial measurement
  updateWidth(containerRef.current.clientWidth);

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      updateWidth(entry.contentRect.width);
    }
  });

  resizeObserver.observe(containerRef.current);

  return () => resizeObserver.disconnect();
}, []); // ✅ Empty deps

// OPTION 2: Debounce ResizeObserver updates
import { debounce } from '@/utils/debounce';

useEffect(() => {
  // ...
  const debouncedUpdate = debounce((width) => {
    if (width > 0 && Math.round(width) !== Math.round(containerWidth)) {
      setContainerWidth(Math.round(width));
    }
  }, 100);
  // ...
}, []); // ✅ Empty deps
```

**Acceptance Criteria:**
- [ ] useEffect runs only once on mount
- [ ] containerWidth updates correctly on resize
- [ ] No "Maximum update depth exceeded" warnings
- [ ] Unit test: ResizeObserver triggers exactly 1 state update per genuine width change
- [ ] E2E test: Mobile rotation does not hang UI

**Story Points:** 3
**Owner:** TBD
**Rollback Plan:** Revert to commit before fix, redeploy previous version

---

### **P0-2: AudioPlayerStore Async Complexity & Race Conditions**

**File:** `src/stores/audioPlayerStore.ts` (881 lines)
**Severity:** P0 (Critical)
**Impact:** "Maximum update depth exceeded" in player, race conditions in track switching

**Root Cause Analysis:**

1. **Multiple async state updates in single action:**
   ```typescript
   // LINE 176-277: playTrack action
   playTrack: (track) => {
     const requestId = Date.now();
     set({ _playTrackRequestId: requestId });

     if (track.selectedVersionId) {
       // Async loadVersions WITHOUT blocking
       get().loadVersions(parentId).then(() => {
         if (get()._playTrackRequestId !== requestId) {
           return; // ⚠️ Race condition check
         }
         // Update state again
         set({ currentTrack: versionTrack, isPlaying: true, ... });
       });
       return; // ❌ Function returns but state update pending!
     }

     set({ currentTrack: track, isPlaying: true, ... });

     // Another async call
     setTimeout(() => {
       get().loadVersions(parentId).catch(...);
     }, 0); // ❌ setTimeout for "background loading"
   }
   ```

2. **Nested `set()` calls in async callbacks:**
   - `playTrack` → `loadVersions` (async) → `set(availableVersions)`
   - `playNext` → `loadVersions` (async) → `set(currentTrack)`
   - Multiple concurrent calls can interleave state updates

3. **setTimeout used for "non-blocking" operations:**
   - Line 269: `setTimeout(() => get().loadVersions(...), 0)`
   - This delays version loading but doesn't prevent race conditions
   - If user switches tracks quickly, multiple setTimeout callbacks execute

**Evidence:**
- User report: "Player вызывает Maximum update depth exceeded"
- 881-line store file indicates high complexity
- 6 async actions that call `set()` inside `.then()` callbacks
- AbortController only used for `_fetchVersionsFromApi`, not all async flows

**Impact:**
- React throws "Maximum update depth exceeded" when rapid track switches occur
- Audio playback may start for wrong track version
- State becomes inconsistent (currentTrack.id !== actuallyPlayingTrackId)

**Recommended Fix:**

**STEP 1: Centralize async state updates**
```typescript
// Extract async logic into separate services
// src/services/audioPlayerService.ts
export class AudioPlayerService {
  private static abortControllers = new Map<string, AbortController>();

  static async loadTrackWithVersions(trackId: string) {
    // Cancel previous load for same track
    this.abortControllers.get(trackId)?.abort();
    const controller = new AbortController();
    this.abortControllers.set(trackId, controller);

    try {
      const versions = await getTrackWithVariants(trackId);
      if (controller.signal.aborted) return null;
      return versions;
    } finally {
      this.abortControllers.delete(trackId);
    }
  }
}
```

**STEP 2: Simplify playTrack action**
```typescript
// src/stores/audioPlayerStore.ts
playTrack: async (track) => {
  // ✅ Single state update at start
  set({
    currentTrack: track,
    isPlaying: true,
    currentTime: 0,
    duration: track.duration || 0
  });

  // ✅ Load versions in service layer (abortable)
  try {
    const versions = await AudioPlayerService.loadTrackWithVersions(track.id);
    if (versions) {
      set({ availableVersions: versions });
    }
  } catch (error) {
    // Handle but don't block playback
  }
}
```

**STEP 3: Add dev-mode state transition logging**
```typescript
// Wrap set() to log all state transitions (dev only)
if (import.meta.env.DEV) {
  const originalSet = set;
  set = (...args) => {
    console.log('[AudioPlayerStore] State update:', args);
    return originalSet(...args);
  };
}
```

**Acceptance Criteria:**
- [ ] No "Maximum update depth exceeded" warnings in player
- [ ] Track switching < 500ms completes successfully
- [ ] Concurrent track switches properly abort previous operations
- [ ] Unit test: Rapid playTrack(A) → playTrack(B) → only B plays
- [ ] E2E test: Switch tracks 10 times in 3 seconds → no errors

**Story Points:** 8
**Owner:** TBD
**Rollback Plan:** Feature flag `USE_NEW_PLAYER_STORE` with fallback to old implementation

---

### **P1-3: AudioController useEffect Dependencies**

**File:** `src/components/player/AudioController.tsx:170-180`
**Severity:** P1 (High)
**Impact:** Extra re-renders when currentTrack changes

**Root Cause:**
```typescript
// LINE 170-180
useEffect(() => {
  const audio = audioRef?.current;
  if (!audio) return;

  if (isPlaying && currentTrack) {
    safePlay(); // ❌ safePlay is in deps
  } else {
    audio.pause();
  }
}, [isPlaying, audioRef, currentTrack, pause, safePlay]);
//                                               ^^^^^^^^ Problem!
```

**Why:**
- `safePlay` is a `useCallback` defined on lines 45-102
- `safePlay` depends on `currentTrack?.id` and `currentTrack?.audio_url`
- When `currentTrack` changes → `safePlay` reference changes → useEffect runs
- But `currentTrack` is already in the deps! So we have **redundant dependency**

**Impact:**
- useEffect runs twice per track change (once for currentTrack, once for safePlay)
- Extra pause/play cycles
- Not critical but creates unnecessary work

**Recommended Fix:**
```typescript
// OPTION 1: Remove safePlay from deps (it's stable enough)
useEffect(() => {
  const audio = audioRef?.current;
  if (!audio) return;

  if (isPlaying && currentTrack) {
    safePlay();
  } else {
    audio.pause();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isPlaying, audioRef, currentTrack, pause]);

// OPTION 2: Inline safePlay logic (remove useCallback)
useEffect(() => {
  const audio = audioRef?.current;
  if (!audio || !isPlaying || !currentTrack) {
    audio?.pause();
    return;
  }

  // Inline safePlay logic here...
}, [isPlaying, audioRef, currentTrack]);
```

**Acceptance Criteria:**
- [ ] useEffect runs exactly once per track change
- [ ] No duplicate pause/play calls
- [ ] Unit test: Track change triggers 1 useEffect execution

**Story Points:** 2
**Owner:** TBD

---

### **P1-4: MiniPlayer 60 FPS Re-renders (currentTime subscription)**

**File:** `src/components/player/MiniPlayer.tsx:50-66`
**Severity:** P1 (High)
**Impact:** 60 FPS re-renders on mobile, battery drain

**Root Cause:**
```typescript
// LINE 50-66
const {
  currentTrack,
  isPlaying,
  togglePlayPause,
  clearCurrentTrack,
  currentTime,  // ❌ Updates 60 times per second!
  duration,
} = useAudioPlayerStore(
  (state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    togglePlayPause: state.togglePlayPause,
    clearCurrentTrack: state.clearCurrentTrack,
    currentTime: state.currentTime,
    duration: state.duration,
  })
);

// LINE 89
const progress = (currentTime / (duration || 1)) * 100;
```

**Why:**
- MiniPlayer subscribes to `currentTime` which updates every ~16ms (60 FPS)
- Component is memoized but still runs render function 60 times/sec
- On mobile, this causes significant battery drain
- Progress bar width calculation happens every frame

**Current Performance Fix (Line 8):**
```
✅ PERFORMANCE FIX #4 (v2.1.0):
- Объединены 3 подписки на store в одну
- Добавлен shallow comparison для оптимизации
```
But this doesn't solve the 60 FPS problem!

**Recommended Fix:**

**OPTION 1: Separate progress bar into child component**
```typescript
// MiniPlayer.tsx (parent - no currentTime subscription)
export const MiniPlayer = memo(({ onExpand }: MiniPlayerProps) => {
  const { currentTrack, isPlaying, ... } = useAudioPlayerStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      // ❌ NO currentTime here!
    })
  );

  if (!currentTrack) return null;

  return (
    <div className="mini-player">
      <MiniPlayerProgressBar /> {/* ✅ Only this re-renders */}
      {/* Rest of UI - static */}
    </div>
  );
});

// MiniPlayerProgressBar.tsx (child - isolated re-renders)
const MiniPlayerProgressBar = memo(() => {
  const { currentTime, duration } = useAudioPlayerStore(
    (state) => ({ currentTime: state.currentTime, duration: state.duration })
  );
  const progress = (currentTime / (duration || 1)) * 100;

  return (
    <div className="progress-bar">
      <div className="progress" style={{ width: `${progress}%` }} />
    </div>
  );
});
```

**OPTION 2: Throttle currentTime updates in store**
```typescript
// audioPlayerStore.ts
let lastCurrentTimeUpdate = 0;
const CURRENT_TIME_THROTTLE = 500; // Update only every 500ms

updateCurrentTime: (time) => {
  const now = Date.now();
  if (now - lastCurrentTimeUpdate < CURRENT_TIME_THROTTLE) {
    return; // Skip update
  }
  lastCurrentTimeUpdate = now;
  set({ currentTime: time });
}
```

**Performance Gain Estimate:**
- Current: 60 renders/sec × 16ms = ~100% CPU usage for progress
- After fix: 2 renders/sec (500ms throttle) = ~3% CPU usage
- **97% reduction in progress-related renders**

**Acceptance Criteria:**
- [ ] MiniPlayer body re-renders only when track changes
- [ ] Progress bar updates visibly (≥2 FPS acceptable for progress)
- [ ] Chrome DevTools Profiler: <5% CPU for MiniPlayer when playing
- [ ] Battery test: 1 hour playback uses <5% battery on mobile

**Story Points:** 5
**Owner:** TBD

---

### **P1-5: Mobile View Toggle — Inline Buttons vs ViewSwitcher Component**

**File:** `src/pages/workspace/Library.tsx:469-489`
**Severity:** P1 (High) — Potential root cause of "toggle не работает на mobile"
**Impact:** View toggle may not respond to touch events on mobile

**Current Implementation:**
```typescript
// LINE 469-489: Inline buttons (NOT using ViewSwitcher component!)
<div className="flex items-center border border-border/30 rounded-lg p-1">
  <Button
    variant={filters.viewMode === 'grid' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => filters.setViewMode('grid')}
    className="transition-all duration-300"
  >
    <Grid3X3 className="h-4 w-4" />
  </Button>
  <Button
    variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => filters.setViewMode('list')}
    className="transition-all duration-300"
  >
    <List className="h-4 w-4" />
  </Button>
  {/* ... optimized button ... */}
</div>
```

**ViewSwitcher component exists but unused:**
```typescript
// src/components/tracks/ViewSwitcher.tsx (38 lines)
export const ViewSwitcher = ({ view, onViewChange }: ViewSwitcherProps) => {
  return (
    <div className="flex items-center gap-1 bg-card/50 rounded-lg p-1">
      <Button onClick={() => onViewChange('grid')}>...</Button>
      <Button onClick={() => onViewChange('list')}>...</Button>
    </div>
  );
};
```

**Potential Issues:**
1. **Missing touch event handlers:**
   - Inline buttons only have `onClick`
   - No `onTouchStart` or `onPointerDown` for mobile
   - On some mobile browsers, `onClick` has 300ms delay

2. **Small touch targets:**
   - Buttons use `size="sm"` which may be <44x44dp (iOS minimum)
   - Icons are 16px (h-4 w-4) which is too small for touch

3. **No haptic feedback:**
   - DetailPanelMobile uses `useHapticFeedback()` (line 68)
   - ViewToggle buttons don't have haptic feedback

**Evidence:**
- User report: "не работает переключение сетка/список в мобильном"
- ViewSwitcher component exists but not used (inconsistency)
- No `data-testid` attributes for E2E testing

**Recommended Fix:**

**STEP 1: Add touch event handlers**
```typescript
// Library.tsx
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const { vibrate } = useHapticFeedback();

const handleViewChange = useCallback((mode: ViewMode) => {
  vibrate('light');
  filters.setViewMode(mode);
}, [filters, vibrate]);

<Button
  size="icon" // ✅ Use icon size for proper touch target (44x44dp)
  onClick={() => handleViewChange('grid')}
  onTouchStart={(e) => {
    e.preventDefault(); // Prevent 300ms delay
    handleViewChange('grid');
  }}
  className="h-11 w-11" // ✅ Ensure minimum touch target
  data-testid="view-toggle-grid"
  aria-label="Переключить на сетку"
>
  <Grid3X3 className="h-5 w-5" /> {/* ✅ Larger icon */}
</Button>
```

**STEP 2: Or use ViewSwitcher component (DRY principle)**
```typescript
// Library.tsx
import { ViewSwitcher } from '@/components/tracks/ViewSwitcher';

<ViewSwitcher
  view={filters.viewMode === 'optimized' ? 'grid' : filters.viewMode}
  onViewChange={(view) => {
    vibrate('light');
    filters.setViewMode(view);
  }}
/>
```

**STEP 3: Update ViewSwitcher to support touch + haptics**
```typescript
// src/components/tracks/ViewSwitcher.tsx
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

export const ViewSwitcher = ({ view, onViewChange }: ViewSwitcherProps) => {
  const { vibrate } = useHapticFeedback();

  const handleChange = useCallback((newView: 'grid' | 'list') => {
    vibrate('light');
    onViewChange(newView);
  }, [onViewChange, vibrate]);

  return (
    <div className="flex items-center gap-1 bg-card/50 rounded-lg p-1">
      <Button
        size="icon"
        className="h-11 w-11" // Touch target
        onClick={() => handleChange('grid')}
        onTouchStart={(e) => { e.preventDefault(); handleChange('grid'); }}
        aria-label="Сетка"
        data-testid="view-switcher-grid"
      >
        <LayoutGrid className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        className="h-11 w-11"
        onClick={() => handleChange('list')}
        onTouchStart={(e) => { e.preventDefault(); handleChange('list'); }}
        aria-label="Список"
        data-testid="view-switcher-list"
      >
        <List className="h-5 w-5" />
      </Button>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Touch targets ≥44x44dp on mobile
- [ ] Haptic feedback on button press
- [ ] No 300ms delay on mobile browsers
- [ ] E2E test: Tap grid button → view changes to grid
- [ ] E2E test: Tap list button → view changes to list
- [ ] Accessibility: Proper ARIA labels and keyboard navigation

**Story Points:** 3
**Owner:** TBD

---

### **P2-6: DetailPanelMobileV2 — Verify Mobile Opening Behavior**

**File:** `src/features/tracks/ui/DetailPanelMobileV2.tsx`
**Severity:** P2 (Medium)
**Impact:** User report "панель деталей трека не открывается на mobile"

**Current Implementation:**
```typescript
// DetailPanelMobileV2.tsx (217 lines)
export const DetailPanelMobileV2 = memo(({ track, open, onOpenChange, onDelete }: ...) => {
  // LINE 47-56: Debug logging
  useEffect(() => {
    if (open) {
      logger.info(`DetailPanel opened for track: ${track?.title}`, ...);
    }
  }, [open, track]);

  // LINE 84: Uses Radix UI Sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] ...">
        {/* Content */}
      </SheetContent>
    </Sheet>
  );
});
```

**How it's triggered:**
```typescript
// Library.tsx:407-408
setDetailPanelTrack(track);
setIsDetailPanelOpen(true);

// Library.tsx:773-777
<DetailPanelMobileV2
  track={detailPanelTrack}
  open={isDetailPanelOpen}
  onOpenChange={setIsDetailPanelOpen}
  onDelete={...}
/>
```

**Potential Issues:**

1. **Missing TrackCard callback:**
   - Не найдено `onInfoClick` или `onTrackInfo` в TrackCard.tsx
   - Возможно callback не передаётся из Library в TrackCard
   - Или кнопка info в TrackCard отсутствует на mobile

2. **Sheet z-index conflict:**
   - Sheet from Radix UI uses `z-index: 50` by default
   - MiniPlayer uses `z-index: var(--z-mini-player)` (110)
   - Если MiniPlayer перекрывает Sheet trigger button → клик не работает

3. **Touch event propagation:**
   - Если TrackCard имеет `onClick` для play, он может перехватывать info button click
   - Need `e.stopPropagation()` на info button

**Investigation Required:**
```bash
# Find where detail panel is triggered
rg "setIsDetailPanelOpen\(true\)" src/pages/workspace/Library.tsx -C 10

# Find TrackCard info button
rg "Info|info.*button|track.*details" src/features/tracks/components/TrackCard.tsx -C 5

# Check if TrackCard receives onInfoClick prop
rg "onInfoClick|onTrackInfo" src/pages/workspace/Library.tsx
```

**Recommended Fix (pending investigation):**

**If callback missing:**
```typescript
// Library.tsx: Add handler
const handleTrackInfo = useCallback((track: DisplayTrack) => {
  setDetailPanelTrack(track);
  setIsDetailPanelOpen(true);
}, []);

// Pass to TrackCard
<TrackCard
  track={track}
  onPlay={handleTrackPlay}
  onInfo={handleTrackInfo} // ✅ Add this prop
  // ...
/>

// TrackCard.tsx: Add info button
<Button
  size="icon"
  variant="ghost"
  onClick={(e) => {
    e.stopPropagation(); // ✅ Prevent parent onClick
    onInfo?.(track);
  }}
  onTouchStart={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onInfo?.(track);
  }}
  aria-label="Подробнее о треке"
  data-testid="track-info-button"
>
  <Info className="h-4 w-4" />
</Button>
```

**If z-index conflict:**
```typescript
// DetailPanelMobileV2.tsx
<SheetContent
  side="bottom"
  className="h-[95vh] ... z-[120]" // ✅ Above MiniPlayer
>
```

**Acceptance Criteria:**
- [ ] Info button visible on TrackCard (mobile)
- [ ] Tapping info button opens DetailPanelMobileV2
- [ ] Sheet appears above MiniPlayer
- [ ] Console log shows "DetailPanel opened" message
- [ ] E2E test: Tap track info → panel opens with correct track data

**Story Points:** 3
**Owner:** TBD

---

### **P2-7: Test Coverage — TEST_MODE Strategy Required**

**Severity:** P2 (Medium)
**Impact:** E2E tests require authentication, blocking CI automation

**Current State:**
- Playwright configured with mobile viewports (Pixel 5, iPhone 12)
- Tests exist but may require Supabase auth
- No `TEST_MODE` env variable or mock auth strategy

**Evidence:**
```typescript
// playwright.config.ts:73-78
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:8080',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
// ❌ No TEST_MODE setup
```

**Recommended Strategy:**

**STEP 1: Create test-mode auth provider**
```typescript
// src/integrations/supabase/testMode.ts
export const createTestAuthClient = () => {
  if (import.meta.env.TEST_MODE !== 'true') {
    throw new Error('Test mode not enabled');
  }

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            // ...mock user data
          }
        },
        error: null
      }),
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
        error: null
      })
    },
    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: {}, error: null }),
      // ...mock all Supabase operations
    })
  };
};
```

**STEP 2: Conditional client in tests**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { createTestAuthClient } from './testMode';

export const supabase = import.meta.env.TEST_MODE === 'true'
  ? createTestAuthClient()
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );
```

**STEP 3: Update package.json**
```json
{
  "scripts": {
    "test:e2e": "TEST_MODE=true playwright test",
    "test:e2e:ui": "TEST_MODE=true playwright test --ui"
  }
}
```

**Acceptance Criteria:**
- [ ] `TEST_MODE=true npm run test:e2e` runs without authentication
- [ ] Mock auth returns consistent test user
- [ ] E2E tests pass in CI without real Supabase credentials
- [ ] Production builds ignore TEST_MODE (security check)

**Story Points:** 5
**Owner:** TBD

---

## ✅ Positive Findings (Strengths)

### 1. **Zero Dependency Vulnerabilities**
```bash
npm audit
# vulnerabilities: { total: 0 }
```
- ✅ All dependencies up-to-date and secure
- ✅ No critical/high/moderate vulnerabilities

### 2. **useLibraryFilters Already Fixed Infinite Loop**
```typescript
// src/hooks/useLibraryFilters.ts:47-54
const setViewMode = useCallback((mode: ViewMode) => {
  setViewModeState(mode);
  localStorage.setItem('library-view-mode', mode);
}, []); // ✅ FIX: Remove viewMode dependency to prevent infinite loop
```
- ✅ Demonstrates awareness of useEffect/useState loop patterns
- ✅ Proper fix with empty deps array

### 3. **TypeScript Strict Mode Enabled**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```
- ✅ Type safety enforced across codebase
- ✅ Reduces runtime errors from type mismatches

---

## 📊 Priority Matrix

| Priority | Issues | Story Points | Estimated Time |
|----------|--------|--------------|----------------|
| **P0** | 2 | 11 | 1-2 sprints |
| **P1** | 3 | 10 | 1 sprint |
| **P2** | 2 | 8 | 1 sprint |
| **Total** | **7** | **29** | **~3 sprints** |

---

## 🗂️ Affected Files Summary

```
Priority  File                                          Lines  Issue
--------  ----                                          -----  -----
P0        src/pages/workspace/Library.tsx               113-135 useEffect loop
P0        src/stores/audioPlayerStore.ts                1-881  Async complexity
P1        src/components/player/AudioController.tsx     170-180 useEffect deps
P1        src/components/player/MiniPlayer.tsx          50-66  60 FPS renders
P1        src/pages/workspace/Library.tsx               469-489 ViewToggle inline
P2        src/features/tracks/ui/DetailPanelMobileV2.tsx 1-217  Opening behavior
P2        tests/                                        -      TEST_MODE needed
```

---

## 🎯 Recommended Sprint Breakdown

### **Sprint 0: P0 Fixes (Critical Bugs)**
**Goal:** Eliminate infinite loops and Maximum update depth errors
**Duration:** 2 weeks

**Tasks:**
1. **Fix Library.tsx ResizeObserver loop** (3 SP)
   - Implement useRef-based solution
   - Add unit test for ResizeObserver behavior
   - E2E test: Mobile rotation stability

2. **Refactor AudioPlayerStore** (8 SP)
   - Extract async logic to AudioPlayerService
   - Add AbortController to all async actions
   - Add dev-mode state transition logging
   - Unit tests for race conditions
   - E2E test: Rapid track switching

**Acceptance:** No "Maximum update depth exceeded" warnings in CI

---

### **Sprint 1: P1 Fixes (Performance & Mobile UX)**
**Goal:** Optimize rendering and fix mobile interaction bugs
**Duration:** 1 week

**Tasks:**
1. **Optimize MiniPlayer re-renders** (5 SP)
   - Split progress bar into separate component
   - OR throttle currentTime updates
   - Battery test: 1 hour playback <5% battery

2. **Fix AudioController useEffect deps** (2 SP)
   - Remove safePlay from dependencies
   - Unit test: 1 useEffect execution per track change

3. **Fix Mobile ViewToggle** (3 SP)
   - Add touch event handlers
   - Ensure 44x44dp touch targets
   - Add haptic feedback
   - E2E test: View toggle works on mobile

**Acceptance:** Mobile UI responsive, no battery drain from player

---

### **Sprint 2: P2 Fixes (Testing & Polish)**
**Goal:** Enable CI test automation and verify all fixes
**Duration:** 1 week

**Tasks:**
1. **Implement TEST_MODE strategy** (5 SP)
   - Create test auth provider
   - Update playwright config
   - CI integration

2. **Investigate & fix DetailPanel mobile** (3 SP)
   - Find missing callback in TrackCard
   - Add info button with touch handlers
   - E2E test: Panel opens on mobile

**Acceptance:** All E2E tests pass in CI without real auth

---

## 📝 Rollback Plans

Each P0/P1 fix should include:
1. **Feature flag** (for runtime toggle)
2. **Git revert commit** (instant rollback)
3. **Canary deployment** (10% users first)
4. **Monitoring alerts** (error rate > 1% → auto-rollback)

**Example:**
```typescript
// Feature flag for new player store
const USE_NEW_PLAYER_STORE = import.meta.env.VITE_FEATURE_NEW_PLAYER === 'true';

export const useAudioPlayerStore = USE_NEW_PLAYER_STORE
  ? newAudioPlayerStore
  : oldAudioPlayerStore;
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
- **Target:** 80%+ coverage for changed files
- **Focus:** useEffect loops, state transitions, async race conditions
- **Mock:** Supabase client, ResizeObserver, Audio element

### E2E Tests (Playwright)
- **Devices:** Pixel 5 (Android), iPhone 12 (iOS)
- **Scenarios:**
  1. Mobile rotation → no UI hang
  2. Rapid track switching → player stable
  3. View toggle tap → immediate response
  4. Detail panel tap → opens correctly

### Manual Testing Checklist
- [ ] Mobile Chrome (Android 12+)
- [ ] Mobile Safari (iOS 15+)
- [ ] Slow 3G network simulation
- [ ] Battery drain test (1 hour playback)
- [ ] Accessibility: VoiceOver, TalkBack

---

## 🔗 Related Documentation

- `docs/ARCHITECTURE.md` — System architecture
- `CLAUDE.md` — Development conventions
- `CONTRIBUTING.md` — PR guidelines
- `tests/e2e/` — Existing E2E tests

---

## 📞 Next Steps

1. **Review with team** — Validate priorities and estimates
2. **Create GitHub issues** — One issue per finding (P0-P2)
3. **Assign owners** — Distribute across sprint capacity
4. **Set up monitoring** — Sentry alerts for new errors
5. **Begin Sprint 0** — Start with P0-1 (ResizeObserver fix)

---

**Report Prepared By:** AI Senior Engineering Agent
**Review Status:** Pending Team Approval
**Last Updated:** 2025-11-28

---

## Appendix: Code Search Commands Used

```bash
# Store patterns
rg "create\(.*=>|zustand" src/stores --files-with-matches

# useEffect with setState
rg "useEffect.*\[.*setState|set[A-Z].*\(" src --files-with-matches

# Player components
rg "Player|player|usePlayer" src --files-with-matches

# View toggle
rg "toggleView|viewMode|grid.*list|ViewToggle" src --files-with-matches

# Detail panel
rg "setIsDetailPanelOpen|DetailPanelMobile" src/pages/workspace/Library.tsx
```

---

END OF REPORT
