# Sprint 30: Audit & Critical Fixes

**Status**: 🟡 In Progress
**Dates**: 2025-11-19 - 2025-11-26 (Estimated)
**Goal**: Address critical stability and quality issues identified in the Audit Report (Nov 19).

## Objectives
1.  **Fix Critical Rendering Bug**: Resolve the blank screen issue on the `/auth` page.
2.  **Improve Type Safety**: Reduce `any` usage and enforce stricter types in critical paths.
3.  **Stabilize Test Suite**: Fix failing tests and ensure CI passes.

## Tasks

### 🔴 Critical (Must Fix)
- [ ] **BUG-001**: Fix `/auth` page rendering (Blank Screen).
    - *Context*: Users report a white screen. Suspect unhandled exception or missing provider.
- [ ] **TECH-001**: Fix Test Suite.
    - *Context*: Multiple tests failing, unhandled promise rejections.

### 🟡 High Priority
- [ ] **TECH-002**: Enforce `noImplicitAny` (or reduce `any` usage).
    - *Context*: `grep` shows hundreds of `any`. Target `src/api` and `src/hooks` first.

## Risks
- **Regression**: Fixes might break existing functionality if tests are not reliable.
- **Time Constraints**: Deep refactoring might take longer than a sprint.

## Deliverables
- Working `/auth` page.
- Passing `npm run test`.
- Reduced `any` count.
