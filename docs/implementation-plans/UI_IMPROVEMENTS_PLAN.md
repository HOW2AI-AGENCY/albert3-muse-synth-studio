# UI Improvements Implementation Plan

**Date:** 2025-11-07
**Based on:** UI Component Audit Report (2025-11-07)
**Status:** Ready to Implement
**Estimated Time:** 32 hours (4 days)

---

## Overview

This plan addresses 8 critical UI issues identified in the comprehensive audit. Implementation is broken into 3 phases prioritized by user impact and complexity.

---

## Phase 1: Critical Fixes (P0) - 10 hours

### 1.1 Add Delete Functionality to TrackActionsMenu (2h)

**File:** `src/features/tracks/components/shared/TrackActionsMenu.tsx`

**Issue:** Delete action defined in interface but not implemented (line 93: `void onDelete`).

**Implementation:**

```typescript
// After line 277 (end of dropdown menu content), add:

{/* Delete Section */}
<DropdownMenuSeparator />
<DropdownMenuItem
  onClick={(e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(trackId);
    }
  }}
  className="text-destructive focus:text-destructive focus:bg-destructive/10"
>
  <Trash2 className="w-4 h-4 mr-2" />
  Удалить трек
</DropdownMenuItem>
```

**Additional Changes:**
- Remove line 93: `void onDelete;`
- Import Trash2 icon: `import { Trash2 } from '@/utils/iconImports';`
- Ensure parent components pass onDelete prop correctly

**Testing:**
- [ ] Delete button appears in menu
- [ ] Clicking delete calls onDelete callback
- [ ] Confirmation dialog appears (if implemented in parent)
- [ ] Track is deleted from database
- [ ] UI updates to remove deleted track

---

### 1.2 Add Lyrics Display to TrackDetailsPanel (4h)

**File:** `src/features/tracks/ui/TrackDetailsPanel.tsx`

**Issue:** No lyrics display in track details panel.

**Implementation:**

**Step 1: Add lyrics prop to interface**

```typescript
// Line 10: Add to track interface
interface TrackDetailsPanelProps {
  track: {
    title: string;
    cover_url?: string;
    created_at?: string;
    genre?: string | null;
    mood?: string | null;
    style_tags?: string[] | null;
    status?: string;
    metadata?: Record<string, unknown> | null;
    duration_seconds?: number | null;
    duration?: number | null;
    lyrics?: string | null; // ✅ ADD THIS
  };
  activeVersion?: {
    id: string;
    variant_index: number;
    duration?: number | null;
    created_at?: string | null;
    is_preferred_variant?: boolean;
    is_primary_variant?: boolean;
    lyrics?: string | null; // ✅ ADD THIS
  } | null;
}
```

**Step 2: Add state and handlers**

```typescript
// After line 77, add:
const [showLyrics, setShowLyrics] = useState(false);
const lyrics = activeVersion?.lyrics ?? track.lyrics ?? null;

const handleCopyLyrics = useCallback(() => {
  if (!lyrics) return;
  navigator.clipboard.writeText(lyrics);
  // Show toast notification
}, [lyrics]);

const handleEditLyrics = useCallback(() => {
  // Open lyrics editor dialog
  // This will need to be passed as prop or use context
}, []);
```

**Step 3: Add lyrics section in CardContent**

```typescript
// After line 201 (style tags section), add:

{/* Lyrics Section */}
{lyrics && (
  <>
    <Separator className="my-3" />
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Текст песни</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLyrics(!showLyrics)}
          className="h-7 px-2"
        >
          {showLyrics ? (
            <><ChevronUp className="w-3 h-3 mr-1" /> Свернуть</>
          ) : (
            <><ChevronDown className="w-3 h-3 mr-1" /> Развернуть</>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
              <ScrollArea className="h-[300px] w-full">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans p-4">
                  {lyrics}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 p-2 border-t border-border/40 bg-background/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLyrics}
                  className="flex-1 h-8 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Копировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditLyrics}
                  className="flex-1 h-8 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Редактировать
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </>
)}
```

**Step 4: Add imports**

```typescript
import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Copy, Edit2 } from '@/utils/iconImports';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
```

**Testing:**
- [ ] Lyrics section appears if track has lyrics
- [ ] Click "Развернуть" to expand lyrics
- [ ] Lyrics display with proper formatting
- [ ] "Копировать" button copies lyrics to clipboard
- [ ] "Редактировать" button opens lyrics editor
- [ ] Animation is smooth
- [ ] Section is hidden if no lyrics

---

### 1.3 Add Stems Display to TrackDetailsPanel (4h)

**File:** `src/features/tracks/ui/TrackDetailsPanel.tsx`

**Issue:** No stems display in track details panel.

**Implementation:**

**Step 1: Add stems data fetching**

Create new hook: `src/features/tracks/hooks/useTrackStems.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackStem {
  id: string;
  track_id: string;
  version_id: string | null;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  metadata?: Record<string, any> | null;
}

export const useTrackStems = (trackId: string | null, versionId?: string | null) => {
  const [stems, setStems] = useState<TrackStem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trackId) {
      setStems([]);
      return;
    }

    const loadStems = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', trackId);

        if (versionId) {
          query = query.eq('version_id', versionId);
        } else {
          query = query.is('version_id', null);
        }

        const { data, error } = await query;

        if (error) throw error;
        setStems(data || []);
      } catch (error) {
        console.error('Error loading stems:', error);
        setStems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadStems();
  }, [trackId, versionId]);

  return { stems, isLoading };
};
```

**Step 2: Update TrackDetailsPanel interface**

```typescript
// Line 10: Add to track interface
interface TrackDetailsPanelProps {
  track: {
    // ... existing props
    has_stems?: boolean; // ✅ ADD THIS
  };
  // ... rest
}
```

**Step 3: Add stems section to component**

```typescript
// Import the hook at top
import { useTrackStems } from '@/features/tracks/hooks/useTrackStems';

// In component body, after line 77:
const { stems, isLoading: stemsLoading } = useTrackStems(
  track.id,
  activeVersion?.id ?? null
);

const [activeStemId, setActiveStemId] = useState<string | null>(null);

const handlePlayStem = useCallback((stem: TrackStem) => {
  // Play stem audio using audio player
  // This will need integration with audio player store
  setActiveStemId(stem.id);
}, []);

const handleDownloadStem = useCallback((stem: TrackStem) => {
  const link = document.createElement('a');
  link.href = stem.audio_url;
  link.download = `${track.title}_${stem.stem_type}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}, [track.title]);

// In JSX, after lyrics section:

{/* Stems Section */}
{(track.has_stems || stems.length > 0) && (
  <>
    <Separator className="my-3" />
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Split className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Стемы</h3>
        {stems.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {stems.length}
          </Badge>
        )}
        {stemsLoading && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {stems.length > 0 ? (
        <div className="space-y-2">
          {stems.map((stem) => (
            <div
              key={stem.id}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg transition-all",
                "hover:bg-muted/30 hover:border-primary/30",
                activeStemId === stem.id && "bg-primary/5 border-primary/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StemTypeIcon type={stem.stem_type} className="w-4 h-4" />
                  <span className="text-sm font-medium capitalize">
                    {stem.stem_type.replace('_', ' ')}
                  </span>
                </div>
                {/* Waveform could go here */}
                <div className="h-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePlayStem(stem)}
                className={cn(
                  "h-8 w-8",
                  activeStemId === stem.id && "text-primary"
                )}
              >
                {activeStemId === stem.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownloadStem(stem)}
                className="h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg text-center">
          Стемы не разделены
        </div>
      )}
    </div>
  </>
)}
```

**Step 4: Add StemTypeIcon component**

```typescript
// Helper component for stem icons
const StemTypeIcon = ({ type, className }: { type: string; className?: string }) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    vocals: Mic,
    instrumental: Music,
    drums: Drum,
    bass: Waves,
    other: AudioWaveform,
  };

  const Icon = icons[type] || AudioWaveform;
  return <Icon className={className} />;
};
```

**Step 5: Add imports**

```typescript
import { Split, Play, Pause, Download, Mic, Drum, Waves, AudioWaveform, Loader2 } from '@/utils/iconImports';
```

**Testing:**
- [ ] Stems section appears if track has stems
- [ ] All stems are listed with correct names
- [ ] Play button plays individual stem
- [ ] Download button downloads stem file
- [ ] Active stem is highlighted
- [ ] Empty state shows if no stems

---

## Phase 2: High Priority (P1) - 12 hours

### 2.1 Add Version Indicators to TrackListItem (3h)

**File:** `src/features/tracks/components/TrackListItem.tsx`

**Issue:** No version indicators in list view.

**Implementation:**

**Step 1: Update Track interface**

```typescript
// Lines 10-22: Update interface
interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  style_tags?: string[];
  like_count?: number;
  created_at?: string;
  has_vocals?: boolean;
  version_number?: number; // ✅ ADD
  is_master_version?: boolean; // ✅ ADD
  parent_track_id?: string; // ✅ ADD
}
```

**Step 2: Add version badge in title area**

```typescript
// After line 117, modify title section:
<div className="flex-1 min-w-0">
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
    <div className="flex items-center gap-2">
      <p className={cn("font-medium text-sm truncate", isCurrentTrack && "text-primary")}>
        {track.title}
      </p>

      {/* Version Badge */}
      {track.version_number && track.version_number > 1 && (
        <Badge
          variant="outline"
          className="text-[10px] h-4 px-1 font-mono shrink-0"
        >
          V{track.version_number}
        </Badge>
      )}

      {/* Master Version Star */}
      {track.is_master_version && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>Мастер-версия</TooltipContent>
        </Tooltip>
      )}
    </div>

    {isCurrentTrack && isPlaying && <Headphones className="h-4 w-4 text-primary flex-shrink-0" />}
  </div>
  {/* ... rest of code */}
</div>
```

**Step 3: Add imports**

```typescript
import { Star } from '@/utils/iconImports';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
```

**Testing:**
- [ ] Version badge appears for versions > 1
- [ ] V2, V3, etc. displayed correctly
- [ ] Master version star appears
- [ ] Star has tooltip
- [ ] Badges don't break layout
- [ ] Works on mobile and desktop

---

### 2.2 Add Version Indicators to TrackRow (3h)

**File:** `src/components/tracks/TrackRow.tsx`

**Similar implementation to TrackListItem**

Add version badges in title section (lines 196-206) similar to Track ListItem implementation above.

---

### 2.3 Improve TrackDetailsPanel Design - Compact (6h)

**File:** `src/features/tracks/ui/TrackDetailsPanel.tsx`

**Changes:**

1. **Reduce spacing:**
```typescript
// Line 102: Change
<CardContent className="space-y-3"> {/* Was space-y-5 */}
```

2. **Smaller cover:**
```typescript
// Line 106: Change
<div className="sm:w-24 sm:flex-shrink-0"> {/* Was sm:w-32 */}
```

3. **Compact metadata grid:**
```typescript
// Line 158: Change
<div className="grid gap-2 grid-cols-2 text-xs"> {/* Was grid-cols-3, gap-3, text-sm */}
```

4. **Remove duplicate duration:**
```typescript
// Remove duration from metadata grid (lines 171-177) if shown in quick stats
```

5. **Add collapsible sections:**
```typescript
// Wrap metadata, lyrics, stems in Collapsible components
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
```

6. **Add glassmorphism:**
```typescript
// Line 88: Update Card className
<Card className="border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/60 backdrop-blur-md">
```

---

## Phase 3: UX Improvements (P2) - 10 hours

### 3.1 Improve Interactive Lyrics Edit Mode (4h)

**File:** `src/components/lyrics/LyricsGeneratorDialog.tsx`

**Changes:**

1. **Keep edit mode open after applying:**
```typescript
// Line 167: Remove setIsEditMode(false)
// Keep mode open to allow multiple iterations
```

2. **Add undo functionality:**
```typescript
const [lyricsHistory, setLyricsHistory] = useState<string[]>([]);

const handleUndo = () => {
  if (lyricsHistory.length > 0) {
    const previous = lyricsHistory[lyricsHistory.length - 1];
    setGeneratedLyrics(previous);
    setLyricsHistory(prev => prev.slice(0, -1));
  }
};
```

3. **Add quick edit suggestions:**
```typescript
const quickEdits = [
  { label: 'Сделать энергичнее', prompt: 'Сделай текст более энергичным и динамичным' },
  { label: 'Добавить рифмы', prompt: 'Улучши рифмы, сделай их более выраженными' },
  { label: 'Упростить язык', prompt: 'Упрости язык, сделай текст более понятным' },
];

// Render as quick buttons
{quickEdits.map((edit) => (
  <Button
    key={edit.label}
    variant="outline"
    size="sm"
    onClick={() => setEditPrompt(edit.prompt)}
  >
    {edit.label}
  </Button>
))}
```

4. **Add edit history panel:**
```typescript
<ScrollArea className="h-[100px] border rounded p-2">
  <div className="space-y-1 text-xs">
    {editHistory.map((edit, i) => (
      <div key={i} className="flex items-center gap-2">
        <ArrowRight className="w-3 h-3" />
        <span>{edit}</span>
      </div>
    ))}
  </div>
</ScrollArea>
```

---

### 3.2 Add Collapsible Sections (3h)

Apply to TrackDetailsPanel for metadata, lyrics, and stems sections.

---

### 3.3 Add Missing Context Menu Items (3h)

**File:** `src/features/tracks/components/shared/TrackActionsMenu.tsx`

Add:
- Edit/Rename track
- Move to project
- Duplicate/Copy track
- Export as WAV/FLAC

---

## Testing Strategy

### Unit Tests
- [ ] TrackActionsMenu delete callback
- [ ] useTrackStems hook
- [ ] TrackDetailsPanel lyrics rendering
- [ ] Version badge rendering in list views

### Integration Tests
- [ ] Delete track flow end-to-end
- [ ] Lyrics display and edit
- [ ] Stems playback and download
- [ ] Version indicators across all views

### Manual Testing
- [ ] Mobile responsiveness
- [ ] Touch interactions
- [ ] Animations smooth
- [ ] Empty states
- [ ] Loading states
- [ ] Error states

---

## Rollout Plan

### Week 1
- **Day 1-2:** Phase 1 critical fixes
- **Day 3:** Testing and bug fixes

### Week 2
- **Day 4-5:** Phase 2 high priority
- **Day 6-7:** Phase 3 UX improvements
- **Day 8:** Final testing and documentation

---

## Dependencies

### New Dependencies
None - all using existing UI libraries

### Modified Files
- `src/features/tracks/components/shared/TrackActionsMenu.tsx`
- `src/features/tracks/ui/TrackDetailsPanel.tsx`
- `src/features/tracks/components/TrackListItem.tsx`
- `src/components/tracks/TrackRow.tsx`
- `src/components/lyrics/LyricsGeneratorDialog.tsx`

### New Files
- `src/features/tracks/hooks/useTrackStems.ts`

---

## Success Metrics

- [ ] All 8 audit issues resolved
- [ ] No new TypeScript errors
- [ ] All tests passing
- [ ] User can delete tracks from menu
- [ ] User can view lyrics in details panel
- [ ] User can see/play stems in details panel
- [ ] Version indicators visible in all track views
- [ ] Design is more compact and professional
- [ ] Interactive lyrics editing improved

---

**Plan Status:** Ready to Execute
**Next Steps:** Begin Phase 1 implementation
**Review Date:** After Phase 1 completion
