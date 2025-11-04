# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Albert3 Muse Synth Studio** is a professional AI music generation platform that integrates with Suno AI and Mureka for music generation. It's a React SPA using Supabase as Backend-as-a-Service (BaaS) with Deno Edge Functions.

**Tech Stack:**
- Frontend: React 18.3, TypeScript 5.8, Vite 7.1
- UI: Tailwind CSS, shadcn/ui, Radix UI
- State: TanStack Query (React Query), Zustand
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Edge Functions: Deno runtime
- AI Providers: Suno AI, Mureka

## System Requirements

**Node.js Version:**
- **Minimum:** Node.js 20.19.0+ or 22.12.0+
- **Recommended:** Node.js 20.19.0 (LTS)
- **Why:** Vite 7.x requires Node.js 20.19+ for ESM-only distribution and native require(esm) support

**Using nvm (Node Version Manager):**
```bash
nvm use                   # Automatically uses version from .nvmrc (20.19.0)
nvm install               # Install the required version if not present
```

**Note:** The project will build with Node.js 18.x but will show a warning. For best compatibility and to avoid warnings, use Node.js 20.19+ as specified in `.nvmrc`.

## Development Commands

### Frontend
```bash
npm run dev              # Start dev server on http://127.0.0.1:8080
npm run build            # Production build
npm run build:dev        # Development build
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint
npm run preview          # Preview production build
```

### Testing
```bash
npm test                 # Run all unit tests (Vitest)
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests (Playwright)
```

**Test Structure:**
- Unit tests: `tests/unit/**/*.test.ts` (Vitest + jsdom)
- E2E tests: `tests/e2e/**/*.spec.ts` (Playwright)
- Component tests: `src/components/**/__tests__/*.test.tsx`

**Running Single Tests:**
```bash
npx vitest tests/unit/hooks/useTracks.test.ts        # Single unit test
npx playwright test tests/e2e/music-generation.spec.ts # Single E2E test
```

### Supabase Edge Functions
```bash
cd supabase/functions
deno task test           # Run Edge Function tests
```

**Edge Functions are in `supabase/functions/`:**
- Each function has its own directory (e.g., `generate-suno/`)
- Shared code is in `_shared/` directory
- Deploy script: `deploy-all-functions.bat`

## Architecture Patterns

### 1. Provider Pattern (Music Generation)

The app uses a **Provider Adapter Pattern** to support multiple AI providers (Suno, Mureka). This is implemented in `src/services/providers/`:

```
src/services/providers/
├── factory.ts           # ProviderFactory - creates provider adapters
├── adapters/
│   ├── suno.adapter.ts
│   └── mureka.adapter.ts
├── base.ts              # IProviderClient interface
└── types.ts
```

**Usage:**
```typescript
import { ProviderFactory } from '@/services/providers/factory';

const provider = ProviderFactory.getProvider('suno'); // or 'mureka'
const result = await provider.generateMusic(params);
```

The factory uses **singleton pattern** with caching - instances are reused.

### 2. Track Versioning System

Tracks have **multiple versions** (variants) stored separately:

**Database Schema:**
- `tracks` table: Main track metadata
- `track_versions` table: Individual variants of a track
- `track_stems` table: Separated audio stems

**Key Relationships:**
```sql
track_versions.parent_track_id → tracks.id
track_stems.track_id → tracks.id
```

**Usage Pattern:**
```typescript
import { useTrackVersions } from '@/hooks/useTrackVersions';

const { allVersions, masterVersion } = useTrackVersions(trackId);
```

### 3. State Management Strategy

**Server State (TanStack Query):**
- Tracks: `useTracks()` hook
- Infinite scroll with pagination: `useInfiniteQuery`
- Realtime updates via Supabase subscriptions
- IndexedDB caching via `trackCacheService`

**Client State (Zustand):**
- Audio player: `audioPlayerStore.ts`
- Music generation form: `useMusicGenerationStore.ts`
- Generation prefill: `useGenerationPrefillStore.ts`

**Context APIs:**
- Authentication: `AuthContext`
- Projects: `ProjectContext`
- Stem Mixer: `StemMixerContext`

### 4. Async Music Generation Flow

Music generation is **asynchronous** using webhooks:

```
User → Frontend → Edge Function → AI Provider
                          ↓
                    DB: status='processing'
                          ↓
    (AI processes for 30-60s)
                          ↓
AI Provider → Webhook → Edge Function → DB: status='completed'
                                            ↓
                                   Realtime Update → Frontend
```

**Key Functions:**
- `generate-suno/` or `generate-mureka/` - Initiates generation
- `suno-callback/` or `mureka-webhook/` - Receives completion webhook
- Frontend: `useTracks()` hook subscribes to realtime updates

## Critical Patterns & Best Practices

### 1. Logging (IMPORTANT)

**Always use centralized logger, never console.*:**
```typescript
import { logger } from '@/utils/logger';

// ✅ CORRECT
logger.info('Track generated', 'generate-music', { trackId, duration });
logger.error('Generation failed', error, 'generate-music', { userId });

// ❌ WRONG - DO NOT USE
console.log('Track generated');
console.error(error);
```

Logger automatically sends to Sentry in production. This is a **security requirement** from the latest audit (P1 priority).

### 2. Protected Files

**DO NOT modify these files without explicit approval:**

Files requiring approval (see `.protectedrc.json`):
- `src/config/breakpoints.config.ts`
- `src/types/domain/track.types.ts`
- `src/services/providers/types.ts`
- `supabase/functions/_shared/suno.ts`
- `supabase/functions/_shared/mureka.ts`
- All files matching `supabase/functions/generate-*/**`
- All migration files in `supabase/migrations/**`

These files are critical infrastructure and require tests + documentation for changes.

### 3. Edge Function Shared Modules

**Always use shared modules in Edge Functions:**
```typescript
// ✅ CORRECT
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSunoClient } from '../_shared/suno.ts';
import { logger } from '../_shared/logger.ts';
import { validateInput } from '../_shared/validation.ts';

// ❌ WRONG
const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
```

Key shared modules in `supabase/functions/_shared/`:
- `suno.ts` - Suno API client
- `mureka.ts` - Mureka API client
- `cors.ts` - CORS headers (localhost whitelist only)
- `logger.ts` - Structured logging
- `validation.ts` - Input validation
- `security.ts` - Rate limiting, security headers
- `retry.ts` - Retry logic with exponential backoff

### 4. Security Best Practices

From recent security audit (2025-11-04):

**CORS:**
```typescript
// Whitelist only, NO wildcard
const corsHeaders = createCorsHeaders(); // localhost only
```

**Authentication in Edge Functions:**
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Row Level Security (RLS):**
All database tables have RLS enabled. Use `has_role()` Security Definer function to check permissions without RLS recursion.

### 5. TypeScript Strict Mode

TypeScript is configured with **strict mode**:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedParameters": true,
  "noUnusedLocals": true,
  "strictNullChecks": true
}
```

**Always provide types, never use `any`:**
```typescript
// ✅ CORRECT
interface TrackProps {
  track: Track;
  onPlay: (id: string) => void;
}

// ❌ WRONG
const TrackCard = (props: any) => {}
```

### 6. Performance Patterns

**Memoization is critical:**
```typescript
import { memo, useCallback, useMemo } from 'react';

// Memoize expensive components
export const TrackCard = memo(({ track }) => {
  const handlePlay = useCallback(() => {
    playTrack(track.id);
  }, [track.id]);

  return <div onClick={handlePlay}>{track.title}</div>;
});

// Memoize expensive computations
const sortedTracks = useMemo(
  () => tracks.sort((a, b) => b.created_at - a.created_at),
  [tracks]
);
```

**Code Splitting:**
- Pages are lazy-loaded: `src/utils/lazyPages.tsx`
- Components are lazy-loaded: `src/utils/lazyImports.tsx`
- Manual chunks in `vite.config.ts` for vendor libs

**Virtualization for long lists:**
```typescript
import { VirtualizedList } from '@/components/ui/virtual-list';
// or
import { useVirtualizer } from '@tanstack/react-virtual';
```

## Path Aliases

The project uses `@/` as alias for `src/`:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
```

## Key Files & Directories

### Frontend Structure
```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components
│   ├── player/          # Audio player components
│   ├── tracks/          # Track management components
│   ├── generator/       # Music generation UI
│   ├── lyrics/          # Lyrics editor & library
│   └── workspace/       # Workspace layout
├── hooks/               # Custom React hooks
│   ├── useTracks.ts     # Main tracks query hook
│   ├── useGenerateMusic.ts
│   └── useTrackVersions.ts
├── pages/               # Route pages
│   └── workspace/       # Main workspace routes
├── services/            # API services
│   ├── providers/       # Provider adapters
│   └── api.service.ts   # Main API client
├── stores/              # Zustand stores
├── contexts/            # React contexts
├── utils/               # Utilities
│   └── logger.ts        # Centralized logger (IMPORTANT)
├── types/               # TypeScript types
└── integrations/
    └── supabase/        # Supabase client config
```

### Backend Structure
```
supabase/
├── functions/           # Deno Edge Functions
│   ├── _shared/        # Shared modules (ALWAYS use these)
│   ├── generate-suno/
│   ├── generate-mureka/
│   ├── suno-callback/
│   └── mureka-webhook/
└── migrations/          # Database migrations (PROTECTED)
```

## Database Schema Key Points

**Main Tables:**
- `profiles` - User profiles
- `user_roles` - Role-based access control
- `tracks` - Main track records
- `track_versions` - Track variants/versions
- `track_stems` - Separated audio stems
- `music_projects` - Project organization
- `suno_personas` - Suno AI personas
- `audio_library` - Reference audio library
- `lyrics_library` - Saved lyrics

**Critical Functions:**
- `has_role(user_id, role)` - Security Definer function for RLS

## Common Workflows

### Adding a New Feature

1. Check if it requires protected files (`.protectedrc.json`)
2. Use centralized `logger` instead of `console.*`
3. Add TypeScript types (no `any`)
4. Memoize components if they render frequently
5. Write tests (unit tests in `tests/unit/`, E2E if needed)
6. Update relevant documentation in `docs/`

### Working with Edge Functions

1. Create function in `supabase/functions/your-function/`
2. **Always import from `_shared/`** for common code
3. Add CORS headers: `import { createCorsHeaders } from '../_shared/cors.ts'`
4. Add authentication check (if needed)
5. Use structured logging: `import { logger } from '../_shared/logger.ts'`
6. Validate inputs: `import { validateInput } from '../_shared/validation.ts'`
7. Test locally with `npx supabase start`
8. Deploy with `deploy-all-functions.bat`

### Debugging Music Generation Issues

1. Check Edge Function logs in Supabase dashboard
2. Verify webhook is configured correctly (callback URL)
3. Check track status in database: `SELECT * FROM tracks WHERE id = '...'`
4. Check `metadata` JSONB field for API responses
5. Verify realtime subscription is active in browser DevTools
6. Check Sentry for any captured errors

## Documentation

Key documentation files in `docs/`:
- `ARCHITECTURE.md` - System architecture overview
- `BACKEND_ARCHITECTURE.md` - Edge Functions detailed guide
- `DATABASE_SCHEMA.md` - Complete database schema
- `DEVELOPER_GUIDE.md` - Development guidelines
- `SUNO_API_COMPLETE_REFERENCE.md` - Suno API integration details
- `audit/` - Latest security audit reports (2025-11-04)

## Environment Variables

**Frontend (.env):**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SENTRY_DSN=...
VITE_SENTRY_ENABLE_IN_DEV=...
```

**Edge Functions (Supabase secrets):**
- `SUNO_API_KEY`
- `MUREKA_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUNO_WEBHOOK_SECRET`

## Recent Changes (as of 2025-11-04)

Latest security audit addressed:
- Replaced 25+ `console.*` calls with centralized `logger`
- Updated dependencies: vite 7.1.12, supabase 2.56.0
- CORS restricted from `*` to localhost whitelist
- Added Content Security Policy (CSP) headers
- Security score improved: 8.0/10 → 9.0/10

See `docs/audit/2025-11-04_Implementation_Status.md` for full details.
