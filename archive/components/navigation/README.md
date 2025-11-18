# Archived Navigation Components

## MobileNavigation.tsx

**Date Archived:** 2025-11-18
**Reason:** Unused/dead code - never integrated into production
**Git History:** Preserved (use `git log --follow` to view history)

### Why Archived?

Alternative drawer-based mobile navigation implementation that was developed but **never integrated** into the production codebase.

Current production uses:
- `BottomTabBar.tsx` - iOS/Android style bottom navigation
- `MobileMoreMenu.tsx` - Overflow menu (Sheet-based)

### Useful Patterns Inside MobileNavigation.tsx

This component contains valuable implementation patterns that may be useful for future reference:

1. **Gesture Handling** - Swipe to open/close drawer functionality
2. **Haptic Feedback Integration** - Navigator.vibrate API usage
3. **Touch Optimization** - Proper touch target sizes and interactions
4. **Drawer Animations** - Smooth Framer Motion animations
5. **Accessibility Features** - ARIA labels, keyboard navigation

### Technical Details

- **Lines of Code:** 385
- **Dependencies:**
  - Framer Motion for animations
  - Custom hooks: `useHapticFeedback`
  - shadcn/ui Sheet component
- **Features:**
  - Touch gesture recognition (swipe left/right)
  - Haptic feedback on interactions
  - Smooth drawer open/close animations
  - Full keyboard accessibility

### Why Not Used?

The `BottomTabBar.tsx` approach was chosen for production because:
1. More familiar UX pattern (iOS/Android standard)
2. Always visible navigation (no need to open drawer)
3. Better performance (fewer animations)
4. Simpler state management
5. Better accessibility (always-visible navigation)

### Potential Future Use

If the team decides to implement a drawer-based navigation in the future (e.g., for tablets or desktop), this component provides a solid foundation with proven patterns.

### How to Restore

If needed, this component can be restored to active development:

```bash
# View file history
git log --follow archive/components/navigation/MobileNavigation.tsx

# Restore to original location
git mv archive/components/navigation/MobileNavigation.tsx src/components/navigation/MobileNavigation.tsx

# Or copy to new location
cp archive/components/navigation/MobileNavigation.tsx src/components/navigation/DrawerNavigation.tsx
```

### Related Documentation

- Mobile Navigation Refactoring Plan: `docs/audit/MOBILE_NAVIGATION_REFACTORING_PLAN.md`
- Comprehensive Audit Report: `docs/audit/AUDIT_REPORT_2025-11-18.md`
- Architecture Documentation: `docs/ARCHITECTURE.md`

---

**Note:** This archive preserves work that may be valuable for future reference or alternative implementations. Do not delete without team consensus.
