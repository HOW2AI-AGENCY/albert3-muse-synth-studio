# Repository Inventory — Sprint 0 Baseline (Generated 2025-10-08)

## Overview
- **Repo**: albert3-muse-synth-studio
- **Audit Context**: Sprint 0 preparation following remote audit.
- **Collected By**: Automation agent (2025-10-08)

## Node & Package Management
- **package.json**
  - `name`: `vite_react_shadcn_ts`
  - Key scripts: `dev`, `build`, `build:dev`, `lint`, `preview`.
  - Primary runtime deps: React 18, Vite 5, Radix UI suite, Supabase JS SDK, TanStack Query, Vitest, Tailwind, Zod.
  - Tooling deps: ESLint 9, TypeScript 5.8, TailwindCSS 3.4, Supabase CLI, Vite React SWC plugin.
- **Lockfiles**
  - `package-lock.json` present (large file ~309 KB); Bun lockfile (`bun.lockb`, ~197 KB) also tracked.

## TypeScript Configuration
- **tsconfig.json** (root)
  - `noImplicitAny`, `noUnusedParameters`, `noUnusedLocals`, `strictNullChecks` all **disabled**.
  - `skipLibCheck`: `true`; `allowJs`: `true`.
  - Path alias: `@/*` → `src/*`.
- **tsconfig.app.json**
  - Target: `ES2020`; Module: `ESNext`; `strict`: `false`; `noEmit`: `true`.
  - Bundler resolution mode enabled; duplicates relaxed lint flags (unused locals/params allowed).
- **tsconfig.node.json**
  - Target: `ES2022`; `strict`: `true` for tooling scope; includes `vite.config.ts` only.

## Continuous Integration / Automation
- `.github/workflows/` directory **absent** — no CI workflows currently tracked.
- `.github/PULL_REQUEST_TEMPLATE.md` present (manual checklist only).

## Database & Migrations
- Supabase migration files located under `supabase/migrations/` (23 SQL scripts dated 2025-01 through 2025-10).
  - Example filenames: `20251008040615_create_generation_requests_table.sql`, `20251002150813_e48ccafe-db4b-4272-955a-01a25b25bcc7.sql`.
  - Indicates existing migration framework via Supabase CLI; requires validation for completeness vs. production state.
- No PL/pgSQL stored procedures outside migrations detected yet (SQL scripts are versioned).

## Infrastructure Artifacts
- **Docker**: No Dockerfiles found within repository root (checked up to depth 2).
- **Configuration**: Vite, Tailwind, PostCSS, ESLint configs present. No Kubernetes manifests identified.

## Supporting Documentation & Tools
- Extensive documentation under `docs/`, `project-management/`, and `supabase/functions/` directories.
- Supabase edge function implementations located in `supabase/functions/*` (TypeScript).

## Follow-Up Actions
1. Confirm whether additional CI configuration exists outside git (if yes, import into repo).
2. Validate Supabase migration completeness against live database.
3. Assess necessity of Bun lockfile vs. npm lock to avoid drift.
4. Proceed with Secret & Large Artifact Scan (report tracked separately).
