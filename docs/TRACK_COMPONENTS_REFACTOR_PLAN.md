# Track Components Refactor & Redesign Plan

**Date:** 2025-11-07
**Status:** Planning Phase
**Priority:** High

## Executive Summary

This document outlines a comprehensive refactor and redesign plan for track card components in Albert3 Muse Synth Studio. The goal is to improve functionality, unify context menus, add version support to TrackRow, and modernize the UI/UX.

## Current State Analysis

### 1. TrackCard Component ✅

**Location:** `/src/features/tracks/components/TrackCard.tsx`

**Structure:**
```
TrackCard (Main Container)
├── TrackCardCover (Artwork + Play Controls)
│   ├── LazyImage (with 300ms fade transitions)
│   ├── Vocal/Instrumental Badge
│   ├── Reference Audio Badge
│   ├── TrackVariantSelector (Collapsible version switcher)
│   └── Play/Pause Overlay
├── TrackCardInfo (Track Metadata)
│   ├── Title + Badges (Stems, Master Version)
│   ├── Prompt/Description
│   ├── Progress Bar (for processing/pending)
│   └── Duration + Like Count
└── TrackCardActions (Action Buttons)
    ├── Like Button (always visible)
    ├── Download/Share (if completed)
    └── TrackActionsMenu (dropdown)
```

**State Management:** `useTrackCardState` hook
- ✅ Version management via `useTrackVersions`
- ✅ Like functionality via `useTrackVersionLike` (applied to active version!)
- ✅ Audio player synchronization
- ✅ Version switching with player updates
- ✅ LocalStorage persistence for selected version

**Strengths:**
- ✅ Fully functional play/pause controls
- ✅ Version support with TrackVariantSelector
- ✅ Likes applied to active version (correct behavior)
- ✅ Download works for active version
- ✅ Comprehensive context menu
- ✅ Memoization for performance
- ✅ Accessibility (ARIA, keyboard navigation)
- ✅ Responsive design
- ✅ Smooth animations

**Context Menu (TrackCard):**
Uses: `/src/features/tracks/components/shared/TrackActionsMenu.tsx`
- **Always Visible:** Like, Download, Share
- **Dropdown Menu:**
  - Download MP3
  - Publish/Hide
  - AI Tools Section (AI Description)
  - Processing Section (Separate Stems)
  - Suno-specific (Extend Track, Create Cover, Add Vocal, Create Persona)
  - Mureka hint (limitations)

### 2. TrackRow Component ⚠️

**Location:** `/src/components/tracks/TrackRow.tsx`

**Structure:**
```
TrackRow (List Item)
├── Thumbnail (with play/pause overlay)
├── Track Info (Title, Meta, Status, Badges)
├── Stats (Plays, Likes, Comments)
├── Like Button
├── Publish Button (if ready and unpublished)
└── TrackActionsMenu (dropdown)
```

**CRITICAL ISSUES:**

1. ❌ **Different TrackActionsMenu**
   - Uses: `/src/components/tracks/TrackActionsMenu.tsx`
   - More generic, less track-specific
   - Doesn't match TrackCard menu

2. ❌ **No Version Support**
   - No TrackVariantSelector
   - Cannot switch between track versions
   - Cannot download specific versions

3. ❌ **Different Data Structure**
   - Uses `TrackRowProps` instead of `Track` type
   - Custom props: `thumbnailUrl`, `stats`, `badges`, `flags`
   - Not compatible with TrackCard data flow

4. ❌ **Different Like Behavior**
   - Uses `onLike/onUnlike` callbacks
   - Doesn't use `useTrackVersionLike` hook
   - Likes applied to whole track, not version

**Context Menu (TrackRow):**
Uses: `/src/components/tracks/TrackActionsMenu.tsx`
- **Groups:**
  - Creative (Remix/Edit, Create, Get Stems [Pro])
  - Organization (Add to Queue, Add to Playlist, Move to Workspace)
  - Publishing (Publish, Song Details, Visibility & Permissions)
  - Sharing (Share, Download)
  - Danger Zone (Report, Move to Trash)
- **Features:**
  - Pro feature support
  - Keyboard shortcuts
  - Permission-based filtering

### 3. Context Menu Comparison

| Feature | TrackCard Menu | TrackRow Menu |
|---------|----------------|---------------|
| Location | `/src/features/tracks/components/shared/` | `/src/components/tracks/` |
| Specificity | Track-specific | Generic/Universal |
| Version Support | ✅ Yes | ❌ No |
| Suno/Mureka Aware | ✅ Yes | ❌ No |
| Pro Features | ❌ No | ✅ Yes |
| Keyboard Shortcuts | ❌ No | ✅ Yes |
| Grouping | Flat | Categorized |
| AI Tools | ✅ Yes | ❌ No |
| Permissions | Basic | Advanced |

**Conclusion:** Need to merge both menus into a unified component.

## Issues Identified

### P0 - Critical Issues
1. **Context Menu Inconsistency** - Two different menus for the same actions
2. **TrackRow Missing Version Support** - Cannot select/play specific versions
3. **Like Functionality Mismatch** - TrackRow likes track, not version

### P1 - High Priority
4. **Data Structure Mismatch** - TrackRow uses different props structure
5. **No Version Download in TrackRow** - Cannot download specific versions
6. **Missing AI Tools in TrackRow** - No AI Description, Separate Stems shortcuts

### P2 - Medium Priority
7. **Design Inconsistency** - TrackCard and TrackRow styles differ
8. **Mobile Optimization** - TrackRow could use better mobile layout
9. **Animation Improvements** - Add smooth transitions to TrackRow

### P3 - Low Priority
10. **Documentation Gaps** - Component usage not fully documented
11. **Test Coverage** - Limited tests for version functionality

## Proposed Solution

### Phase 1: Unified TrackActionsMenu

**Goal:** Create a single, comprehensive TrackActionsMenu that works for both TrackCard and TrackRow.

**Approach:**
```typescript
// New unified menu location:
// /src/components/tracks/shared/TrackActionsMenu.tsx

interface UnifiedTrackActionsMenuProps {
  // Core track data
  trackId: string;
  trackStatus: string;
  trackMetadata?: Record<string, any>;

  // Version support
  currentVersionId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;

  // Display options
  variant?: 'full' | 'compact' | 'minimal';
  showQuickActions?: boolean; // Like, Download, Share buttons
  grouping?: 'flat' | 'categorized'; // Layout style

  // Feature flags
  enableProFeatures?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableAITools?: boolean;

  // Permissions
  canPublish?: boolean;
  canDelete?: boolean;
  canMove?: boolean;

  // State
  isPublic?: boolean;
  hasVocals?: boolean;
  isLiked?: boolean;

  // Actions (all optional)
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onTogglePublic?: () => void;
  onDescribeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;

  // Additional actions from universal menu
  onRemix?: (trackId: string) => void;
  onAddToQueue?: (trackId: string) => void;
  onAddToPlaylist?: (trackId: string) => void;
  onMoveToWorkspace?: (trackId: string) => void;
  onViewDetails?: (trackId: string) => void;
  onReport?: (trackId: string) => void;
}
```

**Features:**
- ✅ Merge all actions from both menus
- ✅ Support both flat and categorized layouts
- ✅ Provider-aware (Suno/Mureka)
- ✅ Pro features with upgrade tooltips
- ✅ Keyboard shortcuts
- ✅ Permission-based filtering
- ✅ Version-aware actions
- ✅ Responsive variants (full, compact, minimal)

### Phase 2: TrackRow Version Support

**Goal:** Add full version support to TrackRow component.

**Changes:**

1. **Add TrackVariantSelector**
   ```typescript
   // In TrackRow, add selector next to thumbnail
   <div className="relative flex-shrink-0">
     <div className="relative w-14 h-14">
       {/* Existing thumbnail */}
     </div>

     {/* NEW: Version selector badge */}
     <div className="absolute -top-1 -right-1 z-10">
       <TrackVariantSelector
         trackId={track.id}
         currentVersionIndex={selectedVersionIndex}
         onVersionChange={handleVersionChange}
         variant="mini" // Compact version for list view
       />
     </div>
   </div>
   ```

2. **Use useTrackCardState logic**
   ```typescript
   // Extract shared logic into useTrackState hook
   // Use in both TrackCard and TrackRow

   const {
     selectedVersionIndex,
     displayedVersion,
     isLiked,
     handleVersionChange,
     handleLikeClick,
     handleDownloadClick,
     // ...
   } = useTrackState(track);
   ```

3. **Update data structure**
   ```typescript
   // Convert TrackRow to use Track type
   interface TrackRowProps {
     track: Track; // Use domain type
     // Keep display options
     showMenu?: boolean;
     showStats?: boolean;
     showBadges?: boolean;
     // Player state
     isSelected?: boolean;
     isPlaying?: boolean;
     // Callbacks
     onPlay?: (trackId: string) => void;
     onPause?: (trackId: string) => void;
     onOpenInspector?: (trackId: string) => void;
     // ... other actions
   }
   ```

### Phase 3: Design Improvements

**Goal:** Modernize UI/UX and ensure consistency.

**TrackCard Improvements:**

1. **Enhanced Visual Hierarchy**
   - Larger play button on hover
   - More prominent version indicator
   - Better contrast for text
   - Subtle shadow effects

2. **Improved Animations**
   - Smooth scale on hover (already has lift)
   - Fade-in for newly loaded cards (already implemented)
   - Pulse effect for active track
   - Slide-in for context menu

3. **Better Accessibility**
   - Improved focus indicators
   - Better color contrast (WCAG AA)
   - Screen reader improvements
   - Keyboard navigation hints

**TrackRow Improvements:**

1. **Compact Version Indicator**
   ```
   Before: [Thumbnail] Title | Meta | Duration

   After:  [Thumbnail] Title | Meta | Duration
           [V1] [V2]  (mini version pills)
   ```

2. **Quick Action Bar**
   - Show actions on hover (desktop)
   - Always visible (mobile)
   - Smooth fade-in transition

3. **Better Mobile Layout**
   ```
   Mobile Stack:
   [Thumbnail + Play]
   Title + Version Selector
   Meta + Stats
   Actions (Like, Download, Menu)
   ```

### Phase 4: Responsive Design

**Breakpoints:** (from `src/config/breakpoints.config.ts`)
- `xs`: 320px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**TrackCard Responsive:**
```css
/* Mobile (xs-sm): */
- Smaller thumbnails
- Compact text
- Minimal variant="minimal"

/* Tablet (md): */
- Medium thumbnails
- variant="compact"

/* Desktop (lg+): */
- Full size
- variant="full"
- All features visible
```

**TrackRow Responsive:**
```css
/* Mobile (xs-sm): */
- Stack layout
- Hide stats
- Show essential actions only

/* Tablet (md): */
- Horizontal layout
- Show main stats
- Compact actions

/* Desktop (lg+): */
- Full horizontal layout
- All stats visible
- All actions visible
```

### Phase 5: Testing Strategy

**Unit Tests:**
```
tests/unit/components/
├── TrackCard.test.tsx
│   ├── renders correctly
│   ├── handles version switching
│   ├── handles play/pause
│   ├── handles likes on version
│   ├── handles download
│   └── handles context menu actions
├── TrackRow.test.tsx
│   ├── renders correctly
│   ├── handles version switching (NEW)
│   ├── handles play/pause
│   ├── handles likes on version (NEW)
│   ├── handles download version (NEW)
│   └── handles context menu actions
└── TrackActionsMenu.test.tsx (NEW)
    ├── renders all action groups
    ├── filters based on permissions
    ├── handles Pro features
    ├── handles keyboard shortcuts
    └── supports both layouts
```

**Integration Tests:**
```
tests/e2e/track-components.spec.ts
├── TrackCard version switching updates player
├── TrackRow version switching updates player
├── Like syncs between Card and Row
├── Context menu actions work
└── Responsive layout works
```

**Performance Tests:**
```
- Measure re-render count with React DevTools
- Check animation frame rate (should be 60fps)
- Test with 100+ tracks in list
- Verify memoization is working
```

## Implementation Plan

### Sprint 1 (Week 1): Unified Menu + TrackRow Versions
**Tasks:**
1. Create unified TrackActionsMenu component
2. Migrate TrackCard to use unified menu
3. Add version support to TrackRow
4. Extract shared logic into useTrackState hook
5. Write unit tests for new components

**Deliverables:**
- ✅ Unified TrackActionsMenu component
- ✅ TrackRow with version support
- ✅ Shared useTrackState hook
- ✅ Unit tests passing

### Sprint 2 (Week 2): Design Improvements
**Tasks:**
1. Implement TrackCard design improvements
2. Implement TrackRow design improvements
3. Add animations and transitions
4. Improve accessibility
5. Test on multiple devices

**Deliverables:**
- ✅ Modernized TrackCard design
- ✅ Modernized TrackRow design
- ✅ Smooth animations
- ✅ WCAG AA compliance

### Sprint 3 (Week 3): Testing + Documentation
**Tasks:**
1. Write comprehensive unit tests
2. Write integration tests
3. Conduct performance testing
4. Update documentation
5. Code review and refinements

**Deliverables:**
- ✅ 80%+ test coverage
- ✅ All E2E tests passing
- ✅ Performance benchmarks met
- ✅ Documentation updated

## Success Criteria

### Functionality
- ✅ TrackCard and TrackRow use same context menu
- ✅ TrackRow supports version selection
- ✅ Likes applied to active version in both components
- ✅ Download works for active version in both components
- ✅ Version switching syncs with audio player

### Design
- ✅ Consistent visual style between Card and Row
- ✅ Modern, clean UI/UX
- ✅ Smooth animations (60fps)
- ✅ Responsive on all screen sizes
- ✅ WCAG AA accessibility

### Performance
- ✅ No performance regression
- ✅ Memoization working correctly
- ✅ Fast initial render (<100ms per card)
- ✅ Smooth scrolling with 100+ tracks

### Quality
- ✅ 80%+ test coverage
- ✅ All E2E tests passing
- ✅ No TypeScript errors
- ✅ No console warnings
- ✅ Documentation complete

## Risk Assessment

### High Risk
1. **Breaking Changes** - Both components are widely used
   - Mitigation: Gradual rollout with feature flags

2. **Performance Regression** - Version queries could slow down lists
   - Mitigation: Proper memoization and query optimization

### Medium Risk
3. **Data Migration** - TrackRow uses different data structure
   - Mitigation: Create adapter layer if needed

4. **User Confusion** - New UI might confuse existing users
   - Mitigation: Add tooltips and onboarding hints

### Low Risk
5. **Test Complexity** - More tests to maintain
   - Mitigation: Good test organization and documentation

## Rollout Plan

### Phase 1: Development (Week 1-2)
- Implement on feature branch: `claude/refactor-track-card-component-011CUtyhsKwppaU6qUdx3WmW`
- Daily commits with clear messages
- Regular testing during development

### Phase 2: Internal Testing (Week 3)
- Deploy to staging environment
- Manual testing on all devices
- Performance profiling
- Bug fixes

### Phase 3: Beta Release (Week 4)
- Feature flag: `enable_new_track_components`
- A/B testing with 20% of users
- Collect feedback
- Monitor analytics

### Phase 4: Full Release (Week 5)
- Enable for all users
- Monitor error rates
- Quick hotfixes if needed
- Gather user feedback

## Maintenance Plan

### Short-term (1-3 months)
- Monitor error rates in Sentry
- Collect user feedback
- Fix bugs promptly
- Add small improvements

### Long-term (3-6 months)
- Evaluate analytics
- Plan further enhancements
- Refactor related components
- Update best practices docs

## Conclusion

This comprehensive refactor will:
1. ✅ Unify context menus across TrackCard and TrackRow
2. ✅ Add full version support to TrackRow
3. ✅ Modernize UI/UX with smooth animations
4. ✅ Ensure consistent behavior and styling
5. ✅ Improve accessibility and responsiveness
6. ✅ Maintain high performance
7. ✅ Provide comprehensive test coverage

**Estimated Effort:** 3 weeks (1 developer)
**Expected Impact:** High - Core user-facing components
**Risk Level:** Medium - With proper testing and gradual rollout

---

**Next Steps:**
1. Review and approve this plan
2. Create feature branch (already exists)
3. Begin Sprint 1 implementation
4. Regular check-ins and progress updates
