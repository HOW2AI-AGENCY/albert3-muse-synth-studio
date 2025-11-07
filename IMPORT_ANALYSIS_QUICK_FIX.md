# Import Analysis - Quick Fix Guide

## Quick Summary
- **Project Health:** 7.5/10 (GOOD)
- **Total Issues Found:** 5-7 critical/high-priority
- **Estimated Fix Time:** 3-4 hours for all issues
- **No Circular Dependencies:** ✓ Clean

---

## CRITICAL FIXES (Do These First - 15 minutes)

### Fix #1: Remove Unused React Imports (2 files)

#### File 1: `src/hooks/useReferenceAnalysis.ts`

**Line 30 - BEFORE:**
```typescript
import React from 'react';
```

**Line 30 - AFTER:**
```typescript
import { useState } from 'react';
```

**Then find and replace all occurrences:**
- `React.useState` → `useState`
- `React.useCallback` → `useCallback` (if used)
- `React.useEffect` → `useEffect` (if used)

---

#### File 2: `src/hooks/usePerformanceMonitor.ts`

**Lines 8-9 - BEFORE:**
```typescript
import { useEffect, useRef, useCallback } from 'react';
import React from 'react';
```

**Lines 8-9 - AFTER:**
```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
```

**Delete line 9 entirely.**

Then find and replace:
- `React.useState` → `useState`

---

### Fix #2: Fix Barrel Export Wildcard (5 minutes)

#### File: `src/hooks/index.ts`

**Lines 7-8 - BEFORE:**
```typescript
export * from './useNavigationTracking';
export * from './useUIInteractionTracking';
```

**Lines 7-8 - AFTER:**
```typescript
export { useNavigationTracking } from './useNavigationTracking';
export { useUIInteractionTracking } from './useUIInteractionTracking';
```

---

## HIGH PRIORITY ISSUES (2-3 hours)

### Issue #3: Toast Library Consolidation

**Problem:** 19 files use `sonner`, 19 files use `shadcn/ui` toasts

**Choice A: Standardize on Sonner (Recommended - more common)**

Find all files using `useToast` from hooks:
```bash
grep -l "useToast" src/hooks/*.ts src/components/**/*.tsx | head -20
```

Replace pattern:
```typescript
// BEFORE
import { useToast } from '@/hooks/use-toast';
const { toast } = useToast();
toast({ title: 'Error', description: 'Message' });

// AFTER
import { toast } from 'sonner';
toast.error('Message');
// or for simple messages:
toast('Message');
```

**Choice B: Standardize on shadcn/ui**

Replace all sonner imports with:
```typescript
import { useToast } from '@/hooks/use-toast';
const { toast } = useToast();
```

---

### Issue #4: Standardize Logger Imports

**Problem:** 55+ files use different patterns

**Standardize pattern (use this everywhere):**
```typescript
import { logger } from '@/utils/logger';

// Usage:
logger.info('Message', 'context', { data });
logger.error('Error', error, 'context', { data });
logger.warn('Warning', 'context', { data });
logger.debug('Debug', 'context', { data });
```

**Find all non-standard patterns:**
```bash
grep -r "import.*logInfo\|import.*logError\|import.*logWarn" src/
```

**Replace with standard:**
```typescript
// BEFORE
import { logInfo, logError, logWarn } from '@/utils/logger';
logInfo('message', 'context', { data });

// AFTER
import { logger } from '@/utils/logger';
logger.info('message', 'context', { data });
```

---

## MEDIUM PRIORITY (Next Sprint)

### Issue #5: Fix suboptimal React import in use-toast.ts

**File:** `src/hooks/use-toast.ts`

**Line 1 - BEFORE:**
```typescript
import * as React from "react";
```

**Line 1 - AFTER:**
```typescript
import { useContext, createContext } from 'react';
```

Then replace:
- `React.useContext` → `useContext`
- `React.createContext` → `createContext`

---

### Issue #6: Consider Splitting api.service.ts (531 lines)

**Suggestion:** Create specialized service files:

```
src/services/
├── api.service.ts (current - 531 lines)
├── track.service.ts (NEW - track operations)
├── lyrics.service.ts (NEW - lyrics operations)
└── balance.service.ts (NEW - provider balance)
```

**Priority:** Low - only if file becomes hard to maintain

---

## VERIFICATION CHECKLIST

After fixes, verify:

- [ ] No unused React imports (ESLint check)
- [ ] All toast imports consistent (grep test)
- [ ] All logger imports use standard pattern (grep test)
- [ ] No wildcard exports in hooks/index.ts
- [ ] Tests still pass
- [ ] Build completes without warnings

---

## Testing Commands

```bash
# Find remaining problematic imports
grep -r "import React from\|import \* as React" src/hooks src/services
grep -r "import { toast } from 'sonner'\|import { useToast }" src/hooks | sort | uniq -c
grep -r "import { logInfo\|import { logError\|import { logWarn" src/

# Run tests
npm test
npm run build
npm run lint
```

---

## Timeline Estimate

| Task | Time | Priority |
|------|------|----------|
| Fix unused React imports | 10 min | P1 |
| Fix barrel exports | 5 min | P1 |
| Toast consolidation | 2 hours | P1 |
| Logger standardization | 30 min | P2 |
| Fix use-toast.ts | 10 min | P2 |
| Split api.service.ts | 3 hours | P3 |
| **TOTAL** | **~6 hours** | - |

---

## Files Requiring Changes

### Phase 1 (15 min):
1. src/hooks/useReferenceAnalysis.ts
2. src/hooks/usePerformanceMonitor.ts
3. src/hooks/index.ts

### Phase 2 (2-3 hours):
4. 19 files using sonner toast OR 19 files using useToast
5. Logger pattern files (mixed patterns)
6. src/hooks/use-toast.ts

### Phase 3 (3+ hours):
7. src/services/api.service.ts (consider splitting)

---

## Notes

- All fixes are backward compatible
- No breaking changes for users of the library
- Fixes improve code consistency and maintainability
- Consider adding ESLint rules to prevent regression

---

*Last Updated: 2025-11-07*
*See IMPORT_ANALYSIS_REPORT.md for detailed analysis*
