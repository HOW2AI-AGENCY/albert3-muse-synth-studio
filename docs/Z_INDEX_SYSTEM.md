# Z-Index Hierarchy System

> Centralized z-index management for Albert3 Muse Synth Studio

**Version:** 1.0.0  
**Date:** 2025-02-01  
**Status:** ✅ Active

---

## 🎯 Purpose

This document defines the complete z-index hierarchy for the application to prevent stacking context conflicts and ensure predictable layering behavior.

---

## 📊 Complete Z-Index Map

### Layer Definitions

| Layer | Z-Index | CSS Variable | Components | Viewport | Usage |
|-------|---------|--------------|------------|----------|-------|
| **Base Content** | 1 | - | All default content | All | Default stacking context |
| **Sidebar** | 40 | `--z-sidebar` | MinimalSidebar | Desktop (lg+) | Left navigation panel |
| **Bottom Navigation** | 40 | `--z-bottom-tab-bar` | BottomTabBar | Mobile/Tablet (<lg) | Bottom tab navigation |
| **FAB Button** | 50 | `--z-fab` | Generate FAB | Mobile (<lg) | Floating action button |
| **Mini Player** | 60 | `--z-mini-player` | MiniPlayer | Mobile (<lg) | Audio player controls |
| **Dropdown** | 1000 | `--z-dropdown` | Select, Dropdown | All | Standard dropdown menus |
| **Sticky** | 1020 | `--z-sticky` | Sticky headers | All | Position: sticky elements |
| **Fixed** | 1030 | `--z-fixed` | Fixed elements | All | Position: fixed (non-modal) |
| **Modal Backdrop** | 1040 | `--z-modal-backdrop` | Dialog backdrop | All | Modal background overlay |
| **Modal** | 1050 | `--z-modal` | Dialog, Sheet | All | Modal content |
| **Fullscreen Player** | 1050 | `--z-fullscreen-player` | FullScreenPlayer | All | Audio player overlay |
| **Popover** | 1060 | `--z-popover` | Popover, Context Menu | All | Contextual popup menus |
| **Tooltip** | 1070 | `--z-tooltip` | Tooltip | All | Informational tooltips |
| **Toast** | 1080 | `--z-toast` | Sonner notifications | All | Toast notifications |
| **Emergency** | 2147483647 | `--z-maximum` | Critical overrides | All | Maximum possible value |

---

## 🏗️ Visual Hierarchy

```
┌────────────────────────────────────────────────────┐
│ TOAST LAYER (1080)                                 │ ← Feedback (highest priority)
│  └─ Sonner notifications                           │
├────────────────────────────────────────────────────┤
│ TOOLTIP LAYER (1070)                               │ ← Information
│  └─ Tooltips, help text                            │
├────────────────────────────────────────────────────┤
│ POPOVER LAYER (1060)                               │ ← Contextual actions
│  └─ Popovers, context menus, date pickers          │
├────────────────────────────────────────────────────┤
│ MODAL LAYER (1050)                                 │ ← Focused interactions
│  ├─ Dialogs, Sheets                                │
│  └─ FullScreenPlayer                               │
├────────────────────────────────────────────────────┤
│ MODAL BACKDROP (1040)                              │ ← Dimming overlay
│  └─ Semi-transparent background                    │
├────────────────────────────────────────────────────┤
│ FIXED LAYER (1030)                                 │ ← Persistent elements
│  └─ Fixed headers, banners                         │
├────────────────────────────────────────────────────┤
│ STICKY LAYER (1020)                                │ ← Scrollable headers
│  └─ Sticky table headers, section headers          │
├────────────────────────────────────────────────────┤
│ DROPDOWN LAYER (1000)                              │ ← Standard overlays
│  └─ Select dropdowns, combo boxes                  │
├────────────────────────────────────────────────────┤
│ MINI PLAYER LAYER (60) [MOBILE ONLY]              │ ← Audio controls
│  └─ MiniPlayer component                           │
├────────────────────────────────────────────────────┤
│ FAB LAYER (50) [MOBILE ONLY]                      │ ← Primary action
│  └─ Floating Action Button (Generate)              │
├────────────────────────────────────────────────────┤
│ NAVIGATION LAYER (40)                              │ ← App navigation
│  ├─ MinimalSidebar (Desktop)                       │
│  └─ BottomTabBar (Mobile)                          │
├────────────────────────────────────────────────────┤
│ BASE LAYER (1)                                     │ ← Main content
│  └─ All default page content                       │
└────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation

### CSS Variables (design-tokens.css)

```css
:root {
  /* Application-specific layers */
  --z-sidebar: 40;
  --z-bottom-tab-bar: 40;
  --z-fab: 50;
  --z-mini-player: 60;
  
  /* Standard overlay layers */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-fullscreen-player: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
  --z-maximum: 2147483647;
}
```

### Tailwind Config (tailwind.config.ts)

```typescript
zIndex: {
  'sidebar': 'var(--z-sidebar)',
  'bottom-tab-bar': 'var(--z-bottom-tab-bar)',
  'fab': 'var(--z-fab)',
  'mini-player': 'var(--z-mini-player)',
  'dropdown': 'var(--z-dropdown)',
  'sticky': 'var(--z-sticky)',
  'fixed': 'var(--z-fixed)',
  'modal-backdrop': 'var(--z-modal-backdrop)',
  'modal': 'var(--z-modal)',
  'fullscreen-player': 'var(--z-fullscreen-player)',
  'popover': 'var(--z-popover)',
  'tooltip': 'var(--z-tooltip)',
  'toast': 'var(--z-toast)',
  'maximum': 'var(--z-maximum)',
}
```

---

## 💻 Usage Examples

### Recommended: Inline Styles with CSS Variables

```tsx
// ✅ BEST PRACTICE: Inline style with CSS variable
<nav 
  className="fixed bottom-0 left-0 right-0"
  style={{ zIndex: 'var(--z-bottom-tab-bar)' }}
>
  {/* BottomTabBar content */}
</nav>

<div 
  className="fixed right-6 bottom-20"
  style={{ zIndex: 'var(--z-fab)' }}
>
  <Button>{/* FAB */}</Button>
</div>
```

### Alternative: Tailwind Classes

```tsx
// ✅ ALTERNATIVE: Tailwind class (references same variable)
<nav className="fixed bottom-0 z-[var(--z-bottom-tab-bar)]">

// ⚠️ WARNING: Requires Tailwind JIT to be enabled
<div className="fixed z-fab">
```

### Avoid: Hardcoded Values

```tsx
// ❌ WRONG: Hardcoded z-index (will conflict)
<nav className="fixed bottom-0 z-40">
<div className="fixed z-50">
```

---

## 🎨 Component-Specific Guidelines

### Navigation Components

#### MinimalSidebar (Desktop)
```tsx
<aside
  className="fixed left-0 top-0 h-full lg:flex"
  style={{ zIndex: 'var(--z-sidebar)' }}
>
```

#### BottomTabBar (Mobile)
```tsx
<nav
  className="fixed bottom-0 left-0 right-0 lg:hidden"
  style={{ zIndex: 'var(--z-bottom-tab-bar)' }}
>
```

**Note:** Both use `z-index: 40` because they never appear simultaneously (desktop vs mobile).

---

### Player Components

#### MiniPlayer (Mobile)
```tsx
<motion.div
  className="fixed bottom-0 left-0 right-0 lg:hidden"
  style={{
    zIndex: 'var(--z-mini-player)',
    paddingBottom: 'calc(var(--bottom-tab-bar-height) + env(safe-area-inset-bottom))'
  }}
>
```

#### FullScreenPlayer (All Devices)
```tsx
<Dialog>
  <DialogContent 
    className="max-w-4xl h-[90vh]"
    style={{ zIndex: 'var(--z-fullscreen-player)' }}
  >
```

**Note:** MiniPlayer (60) is above BottomTabBar (40) on mobile. FullScreenPlayer (1050) is modal-level.

---

### Overlay Components

#### Dropdown Menu
```tsx
<DropdownMenuContent 
  className="w-48"
  style={{ zIndex: 'var(--z-dropdown)' }}
>
```

#### Popover (Date Picker, etc.)
```tsx
<PopoverContent 
  className="w-auto p-0"
  style={{ zIndex: 'var(--z-popover)' }}
>
```

#### Tooltip
```tsx
<TooltipContent 
  style={{ zIndex: 'var(--z-tooltip)' }}
>
```

**Note:** Tooltips should be above popovers, which should be above dropdowns.

---

### Modal Components

#### Dialog (Radix UI)
```tsx
// Backdrop
<DialogPrimitive.Overlay 
  className="fixed inset-0 bg-black/50"
  style={{ zIndex: 'var(--z-modal-backdrop)' }}
/>

// Content
<DialogPrimitive.Content
  className="fixed left-1/2 top-1/2"
  style={{ zIndex: 'var(--z-modal)' }}
>
```

#### Sheet (Bottom Drawer)
```tsx
<Sheet>
  <SheetContent 
    side="bottom"
    style={{ zIndex: 'var(--z-modal)' }}
  >
```

---

### Floating Action Button (Mobile)

```tsx
<Button
  className="fixed right-6 rounded-full shadow-lg"
  style={{ 
    bottom: 'calc(var(--bottom-tab-bar-height) + 1rem)',
    zIndex: 'var(--z-fab)'
  }}
>
  <Plus className="h-6 w-6" />
</Button>
```

**Note:** FAB (50) sits above BottomTabBar (40) but below MiniPlayer (60).

---

## ⚠️ Common Pitfalls

### ❌ Problem: Modal Content Hidden Behind Overlay

```tsx
// WRONG: Backdrop and content have same z-index
<div className="fixed inset-0 bg-black/50 z-modal">
  <div className="z-modal">{/* Content */}</div>
</div>

// CORRECT: Backdrop (1040) below content (1050)
<div 
  className="fixed inset-0 bg-black/50"
  style={{ zIndex: 'var(--z-modal-backdrop)' }}
>
  <div style={{ zIndex: 'var(--z-modal)' }}>
    {/* Content */}
  </div>
</div>
```

---

### ❌ Problem: Tooltip Hidden Behind Modal

```tsx
// WRONG: Tooltip inside modal without higher z-index
<Dialog>
  <Tooltip>
    <TooltipContent>{/* Hidden! */}</TooltipContent>
  </Tooltip>
</Dialog>

// CORRECT: Tooltip has explicit higher z-index
<Dialog>
  <Tooltip>
    <TooltipContent style={{ zIndex: 'var(--z-tooltip)' }}>
      {/* Visible! */}
    </TooltipContent>
  </Tooltip>
</Dialog>
```

---

### ❌ Problem: Dropdown Cut Off by Overflow

```tsx
// WRONG: Dropdown inside overflow-hidden container
<div className="overflow-hidden">
  <DropdownMenu>
    <DropdownMenuContent>{/* Cut off! */}</DropdownMenuContent>
  </DropdownMenu>
</div>

// CORRECT: Use Portal to escape overflow context
<div className="overflow-hidden">
  <DropdownMenu>
    <Portal>
      <DropdownMenuContent style={{ zIndex: 'var(--z-dropdown)' }}>
        {/* Visible! */}
      </DropdownMenuContent>
    </Portal>
  </DropdownMenu>
</div>
```

---

## 🧪 Testing Checklist

- [ ] **Sidebar (Desktop):** Appears above content, below modals
- [ ] **BottomTabBar (Mobile):** Appears above content, below MiniPlayer
- [ ] **FAB (Mobile):** Appears above BottomTabBar, below MiniPlayer
- [ ] **MiniPlayer (Mobile):** Appears above BottomTabBar + FAB, below modals
- [ ] **Dropdown:** Opens above content, below modals
- [ ] **Popover:** Opens above dropdowns, below modals
- [ ] **Tooltip:** Appears above popovers, below toasts
- [ ] **Modal:** Appears above all non-toast elements
- [ ] **Toast:** Appears above everything (highest priority)
- [ ] **No z-index conflicts:** All layers stack correctly
- [ ] **Responsive:** Layers adapt correctly on mobile/desktop

---

## 📝 Change Log

### v1.0.0 (2025-02-01)
- ✅ Initial centralized z-index system
- ✅ Added application-specific layers (sidebar, bottom-tab-bar, fab, mini-player)
- ✅ Synchronized with design-tokens.css
- ✅ Updated all components to use CSS variables

---

## 🔗 Related Documentation

- [DESIGN_SYSTEM_V3.md](./DESIGN_SYSTEM_V3.md) - Complete design system
- [MOBILE_OPTIMIZATION.md](./MOBILE_OPTIMIZATION.md) - Mobile patterns
- [UI_UX_DESIGN_SYSTEM.md](./UI_UX_DESIGN_SYSTEM.md) - Component guidelines

---

**Maintainers:** Albert3 Development Team  
**Last Updated:** 2025-02-01
