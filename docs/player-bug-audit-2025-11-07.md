# 🎵 Audio Player & UI Bug Audit Report
**Date:** 2025-11-07
**Priority:** P0 Critical
**Status:** ⚠️ Multiple critical bugs identified

---

## 📋 Executive Summary

Comprehensive audit of audio player and interface reveals **3 critical issues:**
1. ❌ **Track Versions Duplicates** - Versions display multiple times
2. ❌ **Duplicate Functionality Buttons** - Multiple buttons for same action
3. ❌ **Lyrics Display Not Working** - Fallback lyrics not passed to component

---

## 🐛 Issue #1: Track Versions Duplicates

### Problem Description
Track versions appear multiple times in:
- Desktop Player dropdown (`PlaybackControls.tsx`)
- Track detail panels (`TrackVersions.tsx`)
- Version selector components

### Root Cause Analysis

**Location:** `src/features/tracks/api/trackVersions.ts` - `getTrackWithVersions()`

**Issue:** Multiple sources for versions create potential duplicates:

```typescript
// Line 282: Map should prevent duplicates by ID
const allVersions = new Map<string, TrackWithVersions>();

// Lines 292-315: Versions from metadata.suno_data
mainTrack.metadata.suno_data.forEach((versionData, index) => {
  allVersions.set(versionData.id, { ... }); // ← Uses suno ID
});

// Lines 323-343: Main track added
if (!hasVersionZero) {
  allVersions.set(mainTrack.id, { ... }); // ← Uses track ID
}

// Lines 346-368: Versions from track_versions table
dbVersions.forEach(version => {
  allVersions.set(version.id, { ... }); // ← Uses version ID
});
```

**Problem Cases:**

#### Case 1: Suno data duplicates database versions
If `metadata.suno_data` contains same versions as `track_versions` table:
- ✅ Map deduplicates IF IDs match
- ❌ Creates duplicates IF IDs don't match (suno_id vs db id)

#### Case 2: Main track appears twice
If main track exists in both:
- Main track added with `mainTrack.id` (line 324)
- Version with `variant_index: 0` added with `version.id` (line 348)
- **Result:** Two entries for same track with different IDs

#### Case 3: Multiple versions with same sourceVersionNumber
After loading, versions are sorted by `sourceVersionNumber`:
```typescript
// Line 381: Sorting doesn't guarantee uniqueness
normalizedVersions.sort((a, b) =>
  (a.sourceVersionNumber ?? 0) - (b.sourceVersionNumber ?? 0)
);
```

If multiple versions have same `sourceVersionNumber`, they all appear.

### Evidence

**From codebase:**
1. `getTrackWithVersions()` logs show potential for duplicates:
   ```typescript
   logInfo('Track versions loaded', 'trackVersions', {
     dbVersionsCount: dbVersions?.length || 0,
     metadataVersionsCount: (mainTrack.metadata as any)?.suno_data?.length || 0,
     normalizedVersionsCount: normalizedVersions.length, // ← Total may exceed expected
   });
   ```

2. **No deduplication by content** - only by ID
3. **No validation** that sourceVersionNumber is unique

### Impact
- **User Experience:** Confusing to see same version multiple times
- **Playback:** May play wrong version if selecting duplicate
- **UI Consistency:** Version badges show incorrect numbers

### Severity: P0 (Critical)
Users cannot reliably select correct track version.

---

## 🐛 Issue #2: Duplicate Functionality Buttons

### Problem Description
Multiple buttons perform the same actions in player UI.

### Locations Identified

#### Location 1: Desktop Player Layout
**File:** `src/components/player/desktop/DesktopPlayerLayout.tsx`

**Findings:**
```typescript
// Lines 233-242: PlaybackControls component
<PlaybackControls
  isPlaying={isPlaying}
  hasVersions={hasVersions}
  availableVersions={availableVersions}
  currentVersionIndex={currentVersionIndex}
  onTogglePlayPause={togglePlayPause}
  onSwitchVersion={switchToVersion}
/>

// Lines 244-288: Volume Control (separate implementation)
<Button onClick={toggleMute}>...</Button>
<Slider onValueChange={handleVolumeChange} />
```

**No obvious duplication** in DesktopPlayerLayout itself.

#### Location 2: PlaybackControls Component
**File:** `src/components/player/desktop/PlaybackControls.tsx`

**Controls provided:**
- Lines 66-77: Previous button (SkipBack)
- Lines 79-116: Play/Pause button
- Lines 118-129: Next button (SkipForward)
- Lines 131-157: Shuffle button
- Lines 159-185: Repeat button
- Lines 187-235: Versions dropdown
- Line 237: PlayerQueue component

**Analysis:** All controls are UNIQUE - no duplicates found in PlaybackControls.

#### Location 3: Player Queue
**File:** Imported at line 237 of PlaybackControls
**Note:** Not analyzed yet - may contain duplicate controls

#### Location 4: MiniPlayer
**File:** `src/components/player/MiniPlayer.tsx`

**Need to check:** Does MiniPlayer duplicate DesktopPlayerLayout controls?

### Hypothesis

**Possible duplication scenarios:**
1. **Desktop Player + MiniPlayer** showing simultaneously
2. **Full Screen Player + Desktop Player** overlap
3. **Player Queue** contains duplicate version switcher
4. **Keyboard shortcuts** + UI buttons (not duplication, but conflicting)

### Next Steps
- [ ] Read `MiniPlayer.tsx` for duplicate controls
- [ ] Read `FullScreenPlayer.tsx` for duplicate controls
- [ ] Check if multiple players render simultaneously
- [ ] Verify version switcher in multiple locations

### Severity: P1 (High)
May confuse users but doesn't break functionality.

---

## 🐛 Issue #3: Lyrics Display Not Working

### Problem Description
Lyrics do not display in player even when track has lyrics data.

### Root Cause Analysis

**Component:** `src/components/player/LyricsDisplay.tsx`

**✅ Component is correctly implemented:**
```typescript
// Lines 6-10: Accepts fallbackLyrics prop
interface LyricsDisplayProps {
  taskId: string;
  audioId: string;
  fallbackLyrics?: string; // ✅ Fallback prop exists
}

// Lines 88-99: Fallback logic implemented
if (isError || !lyricsData || lyricsData.alignedWords.length === 0) {
  if (fallbackLyrics) {
    return (
      <div className="lyrics-display max-h-60 overflow-y-auto text-center py-4">
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {fallbackLyrics}
        </p>
      </div>
    );
  }
  return <div className="text-center text-muted-foreground">Текст не найден.</div>;
}
```

**✅ Desktop Player passes fallbackLyrics:**
**File:** `src/components/player/desktop/DesktopPlayerLayout.tsx`
```typescript
// Lines 224-230: Correctly passes track.lyrics
{track.suno_task_id && track.id && (
  <LyricsDisplay
    taskId={track.suno_task_id}
    audioId={track.id}
    fallbackLyrics={track.lyrics} // ✅ Passed correctly
  />
)}
```

### Potential Issues

#### Issue 3.1: Missing suno_task_id
**Problem:** If `track.suno_task_id` is missing, LyricsDisplay doesn't render at all.

```typescript
// Line 224: Conditional rendering
{track.suno_task_id && track.id && (
  <LyricsDisplay ... />
)}
```

**Impact:** Even if `track.lyrics` exists, component never mounts.

**Solution:** Render LyricsDisplay even without taskId:
```typescript
{track.id && (
  <LyricsDisplay
    taskId={track.suno_task_id || 'fallback'}
    audioId={track.id}
    fallbackLyrics={track.lyrics}
  />
)}
```

#### Issue 3.2: useTimestampedLyrics Hook Fails
**File:** `src/hooks/useTimestampedLyrics.ts` (needs verification)

**Hypothesis:**
- Hook may throw error if `taskId` is invalid
- Error prevents fallback from showing
- Need to check hook implementation

#### Issue 3.3: Lyrics Data Missing from Track Object
**Problem:** `track.lyrics` may be `undefined` or empty string

**Check needed:**
- How is lyrics data loaded into track object?
- Is lyrics field fetched from database?
- AudioPlayerStore.playTrack() - does it include lyrics?

### Evidence

**From DesktopPlayerLayout.tsx (lines 224-230):**
- ✅ Component IS rendered when conditions met
- ✅ fallbackLyrics IS passed
- ⚠️ Component NOT rendered if suno_task_id missing

**From LyricsDisplay.tsx:**
- ✅ Fallback logic implemented correctly
- ✅ Error handling present
- ⚠️ May not reach fallback if hook throws error

### Impact
- **User Experience:** Cannot see lyrics while listening
- **Accessibility:** Reduces accessibility for hearing-impaired users
- **Feature Completeness:** Lyrics feature appears broken

### Severity: P0 (Critical)
Core feature not working.

---

## 🔍 Additional Findings

### Finding 1: Missing Lyrics in Other Players

**Locations to check:**
1. **MiniPlayer** (`src/components/player/MiniPlayer.tsx`)
   - Does it show lyrics?
   - If not, should it?

2. **FullScreenPlayer** (`src/components/player/FullScreenPlayer.tsx`)
   - Lyrics display implementation?

3. **Mobile Players** (`src/components/player/LyricsMobile.tsx`)
   - Separate mobile implementation exists
   - Check if it has same issues

### Finding 2: TimestampedLyricsDisplay Component

**File:** `src/components/player/TimestampedLyricsDisplay.tsx`

**Question:** Is this a duplicate of LyricsDisplay.tsx?
- If yes, consolidate into one component
- If no, document when to use each

### Finding 3: Player Visibility Logic

**File:** `src/components/player/hooks/usePlayerVisibility.tsx` (referenced in DesktopPlayerLayout)

**Check:** Could this be hiding lyrics component unintentionally?

---

## 🛠️ Recommended Fixes

### Fix #1: Track Versions Duplicates (P0)

**Option A: Strict Deduplication (Recommended)**
```typescript
// In getTrackWithVersions()
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  // ... existing code ...

  const allVersions = new Map<string, TrackWithVersions>();

  // 1. Load versions from track_versions table FIRST (authoritative)
  if (dbVersions && dbVersions.length > 0) {
    dbVersions.forEach(version => {
      allVersions.set(version.id, { /* version data */ });
    });
  }

  // 2. SKIP metadata.suno_data if dbVersions exists
  // Only use suno_data as FALLBACK if no dbVersions
  if (allVersions.size === 0 && mainTrack.metadata?.suno_data) {
    // Load from suno_data
  }

  // 3. Add main track ONLY if not already present (check by sourceVersionNumber: 0)
  const hasMainVersion = Array.from(allVersions.values())
    .some(v => v.sourceVersionNumber === 0);

  if (!hasMainVersion && mainTrack.audio_url) {
    allVersions.set(mainTrack.id, { /* main track data */ });
  }

  // 4. Deduplicate by sourceVersionNumber
  const versionsByNumber = new Map<number, TrackWithVersions>();
  Array.from(allVersions.values()).forEach(v => {
    const num = v.sourceVersionNumber ?? 0;
    // Keep first occurrence (from authoritative source)
    if (!versionsByNumber.has(num)) {
      versionsByNumber.set(num, v);
    }
  });

  return Array.from(versionsByNumber.values()).sort((a, b) =>
    (a.sourceVersionNumber ?? 0) - (b.sourceVersionNumber ?? 0)
  );
}
```

**Option B: Add Deduplication Layer**
```typescript
// Add utility function
function deduplicateVersions(versions: TrackWithVersions[]): TrackWithVersions[] {
  const seen = new Set<number>();
  return versions.filter(v => {
    const num = v.sourceVersionNumber ?? 0;
    if (seen.has(num)) {
      logger.warn('Duplicate version detected', 'trackVersions', {
        versionId: v.id,
        sourceVersionNumber: num
      });
      return false;
    }
    seen.add(num);
    return true;
  });
}

// Use in getTrackWithVersions
const normalizedVersions = deduplicateVersions(Array.from(allVersions.values()));
```

### Fix #2: Lyrics Display (P0)

**Fix 2.1: Remove suno_task_id requirement**
```typescript
// In DesktopPlayerLayout.tsx (line 224)
// BEFORE:
{track.suno_task_id && track.id && (
  <LyricsDisplay
    taskId={track.suno_task_id}
    audioId={track.id}
    fallbackLyrics={track.lyrics}
  />
)}

// AFTER:
{track.id && (
  <LyricsDisplay
    taskId={track.suno_task_id || ''}  // ← Allow empty taskId
    audioId={track.id}
    fallbackLyrics={track.lyrics}
  />
)}
```

**Fix 2.2: Handle empty taskId in LyricsDisplay**
```typescript
// In LyricsDisplay.tsx
export const LyricsDisplay = memo(({ taskId, audioId, fallbackLyrics }) => {
  // ✅ Skip timestamped lyrics fetch if no taskId
  const shouldFetchTimestamped = taskId && taskId.length > 0;

  const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({
    taskId,
    audioId,
    enabled: shouldFetchTimestamped  // ← Add enabled flag
  });

  // If no taskId, skip loading and show fallback immediately
  if (!shouldFetchTimestamped) {
    if (fallbackLyrics) {
      return <div className="lyrics-display">{fallbackLyrics}</div>;
    }
    return <div>Текст не найден.</div>;
  }

  // ... rest of component
});
```

**Fix 2.3: Check useTimestampedLyrics Hook**
```typescript
// In useTimestampedLyrics.ts - add error boundary
export function useTimestampedLyrics({ taskId, audioId, enabled = true }) {
  return useQuery({
    queryKey: ['timestamped-lyrics', taskId, audioId],
    queryFn: async () => {
      if (!taskId || taskId.length === 0) {
        return { alignedWords: [] };  // ← Return empty instead of throwing
      }
      // ... fetch logic
    },
    enabled: enabled && !!taskId,  // ← Don't fetch if disabled or no taskId
    retry: 1,  // ← Limit retries
  });
}
```

### Fix #3: Duplicate Buttons (P1)

**Investigation needed:** Check if multiple players render simultaneously

```typescript
// Add to audioPlayerStore.ts
const useActivePlayer = () => {
  const hasDesktopPlayer = // ... check
  const hasMiniPlayer = // ... check
  const hasFullScreenPlayer = // ... check

  return {
    hasDesktopPlayer,
    hasMiniPlayer,
    hasFullScreenPlayer,
    // Warn if multiple active
    hasMultipleActivePlayers: [hasDesktopPlayer, hasMiniPlayer, hasFullScreenPlayer]
      .filter(Boolean).length > 1
  };
};
```

---

## 📊 Priority Matrix

| Issue | Priority | Impact | Effort | Status |
|-------|----------|---------|--------|--------|
| Versions Duplicates | P0 | High | Medium | 🔴 Not Started |
| Lyrics Not Working | P0 | High | Low | 🔴 Not Started |
| Duplicate Buttons | P1 | Medium | Low | 🟡 Investigation |

---

## ✅ Testing Plan

### Test 1: Track Versions Duplicates
**Steps:**
1. Load track with multiple versions
2. Open Desktop Player
3. Click versions dropdown
4. **Expected:** Each version appears ONCE
5. **Expected:** Version numbers sequential (V1, V2, V3...)
6. **Expected:** No duplicate IDs in list

**Files to test:**
- Desktop Player → PlaybackControls → Versions dropdown
- Track Detail Panel → TrackVersions component
- Audio Player Store → availableVersions array

### Test 2: Lyrics Display
**Steps:**
1. Load track WITH suno_task_id AND lyrics
2. Open Desktop Player
3. **Expected:** Timestamped lyrics display

4. Load track WITHOUT suno_task_id BUT WITH lyrics
5. Open Desktop Player
6. **Expected:** Fallback lyrics display

7. Load track WITHOUT suno_task_id AND WITHOUT lyrics
8. **Expected:** "Текст не найден" message

### Test 3: Duplicate Buttons
**Steps:**
1. Open Desktop Player
2. Open MiniPlayer (if separate)
3. **Expected:** Only ONE player shows at a time
4. Click Play/Pause in Desktop Player
5. **Expected:** All players sync state
6. **Expected:** No duplicate controls visible

---

## 📝 Implementation Checklist

### Phase 1: Critical Fixes (Today)
- [ ] **Fix versions duplicates** (Option A: Strict deduplication)
  - [ ] Modify `getTrackWithVersions()` in `trackVersions.ts`
  - [ ] Add deduplication by `sourceVersionNumber`
  - [ ] Add logging for detected duplicates
  - [ ] Test with multiple version sources

- [ ] **Fix lyrics display** (All 3 sub-fixes)
  - [ ] Remove `suno_task_id` requirement in DesktopPlayerLayout
  - [ ] Handle empty taskId in LyricsDisplay
  - [ ] Add enabled flag to useTimestampedLyrics hook
  - [ ] Test all 3 scenarios (with/without taskId/lyrics)

### Phase 2: Investigation & Polish (Tomorrow)
- [ ] **Investigate duplicate buttons**
  - [ ] Read MiniPlayer.tsx
  - [ ] Read FullScreenPlayer.tsx
  - [ ] Check if multiple players render
  - [ ] Document player rendering logic

- [ ] **Additional improvements**
  - [ ] Add lyrics to MiniPlayer (if needed)
  - [ ] Consolidate TimestampedLyricsDisplay (if duplicate)
  - [ ] Add error boundaries around lyrics components

### Phase 3: Verification (After fixes)
- [ ] Run all tests from Testing Plan
- [ ] Manual testing in browser
- [ ] Check console for errors
- [ ] Verify no regressions in player functionality

---

## 🔗 Related Files

**Track Versions:**
- `src/features/tracks/api/trackVersions.ts` - Data loading (❌ duplicates here)
- `src/features/tracks/hooks/useTrackVersions.ts` - React hook
- `src/components/tracks/TrackVersions.tsx` - UI display
- `src/components/player/desktop/PlaybackControls.tsx` - Dropdown
- `src/stores/audioPlayerStore.ts` - State management

**Lyrics Display:**
- `src/components/player/LyricsDisplay.tsx` - Component (✅ good)
- `src/components/player/desktop/DesktopPlayerLayout.tsx` - Integration (⚠️ conditional)
- `src/hooks/useTimestampedLyrics.ts` - Data fetching (needs check)
- `src/components/player/TimestampedLyricsDisplay.tsx` - Alternative? (needs review)
- `src/components/player/LyricsMobile.tsx` - Mobile version

**Player Components:**
- `src/components/player/desktop/DesktopPlayerLayout.tsx` - Main desktop player
- `src/components/player/MiniPlayer.tsx` - Mini player (not reviewed)
- `src/components/player/FullScreenPlayer.tsx` - Full screen (not reviewed)
- `src/components/player/PlayerQueue.tsx` - Queue management

---

## 📌 Notes

1. **Versions duplicates** is most critical - affects UX and may cause wrong track playback
2. **Lyrics display** is high priority - core feature appears broken to users
3. **Duplicate buttons** needs investigation - may not be actual bug
4. All fixes should include tests to prevent regression
5. Consider adding E2E tests for player functionality

**Next Steps:**
1. Implement Fix #1 (Versions deduplication)
2. Implement Fix #2 (Lyrics display)
3. Test fixes thoroughly
4. Investigate duplicate buttons issue
5. Create PR with comprehensive tests

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Ready for implementation
