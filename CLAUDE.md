# CLAUDE.md - AI Assistant Guide for Albert3 Muse Synth Studio

**Document Version:** 1.0.0
**Last Updated:** 2025-11-14
**Status:** Active

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Development Conventions](#development-conventions)
6. [State Management Patterns](#state-management-patterns)
7. [API Integration Patterns](#api-integration-patterns)
8. [Testing Guidelines](#testing-guidelines)
9. [Common Development Workflows](#common-development-workflows)
10. [Git Workflow](#git-workflow)
11. [Performance Considerations](#performance-considerations)
12. [Security Guidelines](#security-guidelines)
13. [Tips for AI Assistants](#tips-for-ai-assistants)

---

## Project Overview

**Albert3 Muse Synth Studio** is a professional AI music generation platform built as a modern Single Page Application (SPA). The platform enables musicians, producers, and content creators to generate, edit, and manage music compositions using AI services like Suno AI and Replicate.

### Key Features
- Dual AI provider integration (Suno AI for generation, Replicate for analysis)
- Track versioning system with multiple variants
- Audio stem separation and mixing
- Real-time analytics and monitoring
- Project-based organization (albums/collections)
- Mobile-optimized responsive design

### Project Statistics
- **Lines of Code:** ~27,603
- **TypeScript/React Files:** 678
- **React Components:** 120+
- **Custom Hooks:** 85+
- **Edge Functions:** 25+
- **Database Migrations:** 50+
- **Test Coverage Target:** 80%+

---

## Repository Structure

```
albert3-muse-synth-studio/
├── src/                           # Frontend application (React + TypeScript)
│   ├── components/                # React components (feature-based organization)
│   │   ├── ui/                   # shadcn/ui base components (35+ components)
│   │   ├── player/               # Audio player components
│   │   ├── tracks/               # Track management UI
│   │   ├── workspace/            # Workspace-specific components
│   │   ├── lyrics/               # Lyrics editor and generation
│   │   ├── mobile/               # Mobile-optimized components
│   │   └── [feature]/            # Other feature components
│   ├── pages/                    # Route-level components
│   │   └── workspace/            # Protected workspace routes
│   ├── hooks/                    # Custom React hooks (85+ hooks)
│   ├── services/                 # Business logic and API layer
│   ├── stores/                   # Zustand state management
│   ├── contexts/                 # React Context providers
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── integrations/             # Third-party integrations (Supabase, etc.)
│   ├── config/                   # Configuration files
│   └── styles/                   # Global styles
│
├── supabase/                     # Backend infrastructure
│   ├── functions/                # Edge Functions (Deno runtime)
│   │   ├── _shared/             # Shared utilities across functions
│   │   ├── generate-suno/       # Suno music generation
│   │   ├── generate-mureka/     # Mureka music generation
│   │   ├── suno-callback/       # Suno webhook handler
│   │   ├── analyze-audio/       # Replicate audio analysis
│   │   └── [other-functions]/   # Additional Edge Functions
│   ├── migrations/               # SQL database migrations
│   └── seed/                     # Database seed data
│
├── docs/                         # Comprehensive documentation (80+ files)
│   ├── ARCHITECTURE.md           # System architecture
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture diagrams
│   ├── user-guide/               # User documentation
│   └── audit/                    # Audit reports
│
├── project-management/           # Project tracking and planning
│   ├── sprints/                  # Sprint planning
│   ├── backlog/                  # Product backlog
│   ├── tasks/                    # Task management
│   └── reports/                  # Sprint reports
│
├── tests/                        # Testing infrastructure
│   ├── e2e/                      # Playwright E2E tests
│   └── unit/                     # Vitest unit tests
│
├── scripts/                      # Build and utility scripts
│   ├── performance/              # Performance monitoring
│   └── docs/                     # Documentation validation
│
├── reports/                      # Performance and security reports
├── public/                       # Static assets
├── .github/workflows/            # CI/CD workflows
├── .husky/                       # Git hooks
└── archive/                      # Historical documentation
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.8.3 | Type-safe JavaScript |
| **Vite** | 7.1.12 | Build tool and dev server |
| **React Router** | 6.30.1 | Client-side routing |
| **TanStack Query** | 5.90.2 | Server state management |
| **Zustand** | 5.0.8 | Client state management |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS |
| **shadcn/ui** | Latest | UI component library (Radix UI) |
| **Framer Motion** | 12.23.24 | Animation library |
| **React Hook Form** | 7.61.1 | Form management |
| **Zod** | 4.1.12 | Schema validation |

### Backend (Supabase)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | 2.54.11 | Backend-as-a-Service |
| **PostgreSQL** | Latest | Relational database |
| **Deno** | Latest | Edge Functions runtime |
| **Row Level Security** | - | Database security |
| **Supabase Storage** | - | File storage |
| **Supabase Realtime** | - | Real-time subscriptions |

### External Services
- **Suno AI** - Music generation
- **Mureka** - Alternative music generation provider
- **Replicate** - Audio analysis and processing
- **Sentry** - Error tracking and monitoring
- **Telegram** - Authentication integration

### Testing
- **Vitest** 4.0.8 - Unit testing
- **Playwright** 1.56.1 - E2E testing
- **Testing Library** - React component testing
- **jsdom** - DOM simulation

### Development Tools
- **ESLint** 9.32.0 - Linting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **rollup-plugin-visualizer** - Bundle analysis

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ UI Components│  │ State Mgmt   │  │   Routing    │     │
│  │  (shadcn/ui) │  │ Query+Zustand│  │ React Router │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend Layer (Supabase)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Edge Functions│  │  PostgreSQL  │  │  Auth + RLS  │     │
│  │    (Deno)    │  │   Database   │  │  + Storage   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   External AI Services                       │
│     ┌──────────┐      ┌──────────┐      ┌──────────┐      │
│     │ Suno AI  │      │  Mureka  │      │Replicate │      │
│     └──────────┘      └──────────┘      └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture Pattern: Feature-Based + Layered Hybrid

**Principles:**
1. **Separation of Concerns**: UI, business logic, and data access are separate
2. **Dependency Injection**: Use factories and interfaces (Repository pattern)
3. **Composition over Inheritance**: Hooks and Higher-Order Components
4. **Type Safety**: Everything is strictly typed
5. **Immutability**: React Query handles cache updates

**Key Patterns:**
- **Repository Pattern** (`src/repositories/`) - Abstraction over data access
- **Provider Pattern** (`src/services/providers/`) - Multiple AI providers with unified interface
- **Factory Pattern** - Singleton instances for providers
- **Service Layer** (`src/services/`) - Business logic encapsulation
- **Custom Hooks** - Reusable stateful logic

### Routing Structure

```
/ (Root)
├── /auth                    # Authentication pages
├── /workspace/*             # Protected workspace area
│   ├── /dashboard           # Dashboard overview
│   ├── /generate            # Music generation
│   ├── /library             # Track library
│   ├── /analytics           # Analytics dashboard
│   ├── /settings            # User settings
│   ├── /projects            # Project management
│   ├── /lyrics              # Lyrics editor
│   └── [10+ more routes]
└── /public                  # Public pages
```

**Route Characteristics:**
- Lazy-loaded for code splitting
- Protected routes with authentication guards
- Nested layouts (WorkspaceLayout)
- Error boundaries per route
- Suspense fallbacks with loading states

---

## Development Conventions

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase | `TrackCard.tsx`, `AudioPlayer.tsx` |
| **Hooks** | useCamelCase | `useTracks.ts`, `useAudioPlayer.ts` |
| **Services** | camelCase.service.ts | `api.service.ts`, `lyrics.service.ts` |
| **Types** | camelCase.ts/.types.ts | `track.ts`, `track-metadata.types.ts` |
| **Utils** | camelCase.ts | `logger.ts`, `formatters.ts` |
| **Stores** | camelCase.ts | `audioPlayerStore.ts`, `dawStore.ts` |
| **Tests** | *.test.tsx/ts | `TrackCard.test.tsx` |

### Import Conventions

**Always use absolute imports with `@/` prefix:**

```typescript
// ✅ GOOD - Absolute imports
import { Button } from "@/components/ui/button";
import { useTracks } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/types/track.types";

// ❌ BAD - Relative imports
import { Button } from "../../components/ui/button";
import { useTracks } from "../hooks/useTracks";
```

**Import Order:**
1. React and third-party libraries
2. Absolute imports from `@/`
3. Type imports
4. Relative imports (if necessary)
5. Styles

### TypeScript Strict Mode

The codebase uses **TypeScript strict mode** with these rules:
- `strict: true`
- `noImplicitAny: true`
- `noUnusedParameters: true`
- `noUnusedLocals: true`
- `strictNullChecks: true`

**Never use `any` without justification.** Use proper typing or `unknown` instead.

### Component Structure Best Practices

```typescript
// TrackCard.tsx
import { memo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import type { Track } from '@/types/track.types';

interface TrackCardProps {
  track: Track;
  onPlay: (id: string) => void;
  isPlaying?: boolean;
}

/**
 * TrackCard component displays a single track with playback controls
 * @component
 */
export const TrackCard = memo<TrackCardProps>(({
  track,
  onPlay,
  isPlaying = false
}) => {
  const handlePlay = useCallback(() => {
    onPlay(track.id);
  }, [track.id, onPlay]);

  return (
    <Card onClick={handlePlay} className="track-card">
      <h3>{track.title}</h3>
      {/* Component content */}
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';
```

**Key Points:**
1. Use `memo` for performance optimization
2. Use `useCallback` for event handlers
3. Provide TypeScript interfaces for props
4. Add JSDoc comments for complex components
5. Set `displayName` for debugging

### Naming Conventions for Variables and Functions

```typescript
// ✅ GOOD
const trackDuration = 120;
const isPlaying = false;
const hasError = false;

function playTrack(trackId: string): void { }
function generateMusic(prompt: string): Promise<Track> { }

const API_BASE_URL = 'https://api.example.com';
const MAX_RETRIES = 3;

// ❌ BAD
const TrackDuration = 120;  // Should be camelCase for variables
const is_playing = false;   // Use camelCase, not snake_case
function PlayTrack() { }    // Functions should be camelCase
```

---

## State Management Patterns

The codebase uses a **multi-layered state management strategy**:

### 1. TanStack Query (React Query) - Server State

**Purpose:** Manage server-side data, caching, and synchronization

**Configuration:**
```typescript
// Desktop: 5-minute cache, 3 retries
// Mobile: 2-minute cache, 2 retries
```

**Common Patterns:**

```typescript
// Query Example - Fetch data
const { data: tracks, isLoading, error } = useQuery({
  queryKey: ['tracks', userId],
  queryFn: () => ApiService.fetchTracks(userId),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});

// Mutation Example - Modify data
const generateMutation = useMutation({
  mutationFn: (params) => ApiService.generateMusic(params),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tracks'] });
  },
});

// Infinite Query Example - Pagination
const {
  data,
  fetchNextPage,
  hasNextPage,
} = useInfiniteQuery({
  queryKey: ['tracks', 'infinite'],
  queryFn: ({ pageParam = 0 }) => ApiService.fetchTracksPage(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**Key Features:**
- Automatic caching and revalidation
- Optimistic updates
- Automatic retry with exponential backoff
- Background refetching
- Query invalidation

### 2. Zustand - Client State

**Purpose:** Global client-side state for UI and application logic

**Store Examples:**

```typescript
// audioPlayerStore.ts - Audio player state
interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  setCurrentTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
}

// dawStore.ts - DAW functionality
// uiStateStore.ts - UI preferences
```

**Usage Pattern:**
```typescript
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

const { currentTrack, play, pause } = useAudioPlayerStore();
```

### 3. React Context - Feature-Specific State

**Purpose:** Scoped state for specific features or providers

**Context Examples:**
- `AudioPlayerProvider` - Audio playback context
- `AuthContext` - Authentication state
- `ProjectContext` - Project management
- `StemMixerContext` - Audio stem mixing

**Usage Pattern:**
```typescript
// Provider
<AudioPlayerProvider>
  <App />
</AudioPlayerProvider>

// Consumer
const { playTrack, pauseTrack } = useAudioPlayback();
```

### 4. Local Component State - useState/useReducer

**Purpose:** Component-specific ephemeral state

```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState(initialData);
```

### State Management Decision Tree

```
Is this server data?
  └─ YES → Use TanStack Query
  └─ NO → Is it global UI state?
      └─ YES → Use Zustand
      └─ NO → Is it feature-scoped?
          └─ YES → Use Context
          └─ NO → Use local useState
```

---

## API Integration Patterns

### Service Layer Pattern

**Location:** `src/services/api.service.ts`

**Key Features:**
- Centralized API calls
- Type-safe with generics
- Automatic retry logic
- Error handling
- Request tracking (Sentry)
- Performance monitoring (KPI timers)

**Example:**
```typescript
// api.service.ts
export class ApiService {
  static async fetchTracks(userId: string): Promise<Track[]> {
    const timerId = startKpiTimer('api.fetchTracks');

    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      endKpiTimer(timerId);
      return data.map(mapTrackRowToTrack);
    } catch (error) {
      logError('Failed to fetch tracks', { userId, error });
      throw error;
    }
  }
}
```

### Custom Hooks Pattern

**Location:** `src/hooks/`

**85+ custom hooks** encapsulate business logic and API interactions.

**Example: `useTracks.ts`**

Key features:
- Integrates TanStack Query
- Supabase Realtime subscriptions
- IndexedDB caching
- Pagination support
- Polling for processing tracks
- Automatic stuck track detection

```typescript
export const useTracks = (refreshTrigger?: number, options: UseTracksOptions = {}) => {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['tracks', userId, projectId],
    queryFn: ({ pageParam }) => fetchTracksPage(pageParam),
    // ... configuration
  });

  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel('tracks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, handleChange)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return { tracks, isLoading, error, loadMore: fetchNextPage, hasMore: hasNextPage };
};
```

### Repository Pattern

**Location:** `src/repositories/`

**Purpose:** Abstract data access layer for testing and flexibility

```typescript
// ITrackRepository interface
interface ITrackRepository {
  fetchTracks(userId: string): Promise<Track[]>;
  createTrack(track: Partial<Track>): Promise<Track>;
  updateTrack(id: string, updates: Partial<Track>): Promise<Track>;
  deleteTrack(id: string): Promise<void>;
}

// SupabaseTrackRepository - Production
// MockTrackRepository - Testing
```

**Usage:**
```typescript
// Inject repository via context or props
const repository = new SupabaseTrackRepository();
const tracks = await repository.fetchTracks(userId);
```

### Provider Pattern for AI Services

**Location:** `src/services/providers/`

**Purpose:** Unified interface for multiple AI music generation providers

```typescript
// IProviderClient interface
interface IProviderClient {
  generateMusic(params: GenerationParams): Promise<GenerationResult>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  cancelTask(taskId: string): Promise<void>;
}

// Implementations
- SunoAdapter
- MurekaAdapter
- MinimaxAdapter

// Factory
const provider = ProviderFactory.getProvider('suno');
const result = await provider.generateMusic(params);
```

### Edge Functions Integration

**Pattern:** Frontend Hook → Edge Function → External API

**Example: Music Generation Flow**

1. **Frontend Hook** (`useGenerateMusic.ts`):
```typescript
const generateMutation = useMutation({
  mutationFn: async (params) => {
    const { data, error } = await supabase.functions.invoke('generate-suno', {
      body: params
    });
    if (error) throw error;
    return data;
  },
});
```

2. **Edge Function** (`supabase/functions/generate-suno/index.ts`):
```typescript
Deno.serve(async (req) => {
  const { prompt, style } = await req.json();

  // Call Suno API
  const response = await fetch('https://api.suno.ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, style }),
  });

  return new Response(JSON.stringify(result));
});
```

3. **Webhook Handler** (`supabase/functions/suno-callback/index.ts`):
```typescript
Deno.serve(async (req) => {
  const result = await req.json();

  // Update database with completed track
  await supabase.from('tracks').update({
    status: 'completed',
    audio_url: result.url
  });
});
```

### Error Handling Pattern

**Centralized error handling:**

```typescript
// services/api/errors.ts
export const handlePostgrestError = (error: PostgrestError): never => {
  logError('Postgrest error', { error });
  trackAPIRequest('database', 'error', error.message);
  throw new Error(`Database error: ${error.message}`);
};

// Usage in hooks
try {
  const result = await ApiService.fetchTracks(userId);
} catch (error) {
  handlePostgrestError(error);
  toast({
    title: "Error",
    description: "Failed to fetch tracks",
    variant: "destructive",
  });
}
```

### Retry Pattern

**Location:** `src/utils/retryWithBackoff.ts`

```typescript
// Automatic retry with exponential backoff
const result = await retryWithBackoff(
  () => ApiService.fetchTracks(userId),
  RETRY_CONFIGS.CRITICAL_OPERATION
);
```

**Retry Configs:**
- `CRITICAL_OPERATION`: 5 attempts, 1s → 32s backoff
- `NORMAL_OPERATION`: 3 attempts, 500ms → 2s backoff
- `QUICK_OPERATION`: 2 attempts, 200ms → 400ms backoff

---

## Testing Guidelines

### Test Coverage Requirements

**Minimum Coverage: 80%**
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

**Run Tests:**
```bash
npm test              # Run all tests
npm test -- --coverage # With coverage report
npm run test:e2e       # E2E tests
```

### Unit Testing with Vitest

**Location:** `__tests__` directories or `*.test.ts` files

**Setup:** `tests/setup.ts` provides:
- Mock Supabase client
- Mock React Router
- Mock window APIs (matchMedia, IntersectionObserver)
- Mock AuthContext
- Mock toast notifications

**Example Test:**

```typescript
// TrackCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TrackCard } from './TrackCard';

describe('TrackCard', () => {
  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    status: 'completed',
  };

  it('renders track information', () => {
    render(<TrackCard track={mockTrack} onPlay={vi.fn()} />);

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('calls onPlay when clicked', async () => {
    const onPlay = vi.fn();
    render(<TrackCard track={mockTrack} onPlay={onPlay} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onPlay).toHaveBeenCalledWith('1');
  });

  it('shows loading state for processing tracks', () => {
    const processingTrack = { ...mockTrack, status: 'processing' };
    render(<TrackCard track={processingTrack} onPlay={vi.fn()} />);

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });
});
```

### E2E Testing with Playwright

**Location:** `tests/e2e/`

**Example:**

```typescript
// tests/e2e/generation/music-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Music Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace/generate');
  });

  test('should generate music from prompt', async ({ page }) => {
    // Fill form
    await page.fill('[data-testid="prompt-input"]', 'upbeat electronic music');
    await page.click('[data-testid="generate-button"]');

    // Wait for generation to start
    await expect(page.locator('[data-testid="status"]')).toContainText('Processing');

    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="status"]'))
      .toContainText('Completed', { timeout: 120000 });
  });
});
```

### Testing Best Practices

1. **Test User Behavior, Not Implementation**
   - Test what users see and do
   - Avoid testing internal state

2. **Use Data Test IDs**
   - Add `data-testid` attributes for reliable selectors
   - Avoid CSS selectors that may change

3. **Mock External Dependencies**
   - Mock Supabase calls
   - Mock AI provider APIs
   - Use test fixtures

4. **Write Readable Tests**
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - One assertion per test when possible

5. **Test Error States**
   - Test loading states
   - Test error handling
   - Test edge cases

---

## Common Development Workflows

### Adding a New Feature

1. **Create Feature Branch**
```bash
git checkout -b feature/ISSUE-123-new-feature
```

2. **Plan the Implementation**
   - Read existing documentation
   - Identify affected components/services
   - Consider state management needs
   - Plan test coverage

3. **Implement the Feature**
   - Follow file naming conventions
   - Use absolute imports
   - Add TypeScript types
   - Write unit tests
   - Update documentation

4. **Test Locally**
```bash
npm run dev          # Start dev server
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
npm run typecheck    # Check types
npm run lint         # Lint code
```

5. **Create Pull Request**
   - Use conventional commit messages
   - Link related issues
   - Add screenshots for UI changes
   - Request code review

### Adding a New Component

**Location:** `src/components/[feature]/ComponentName.tsx`

**Steps:**

1. **Create Component File:**
```typescript
// src/components/tracks/TrackCard.tsx
import { memo } from 'react';
import { Card } from '@/components/ui/card';
import type { Track } from '@/types/track.types';

interface TrackCardProps {
  track: Track;
  onPlay: (id: string) => void;
}

export const TrackCard = memo<TrackCardProps>(({ track, onPlay }) => {
  return (
    <Card>
      <h3>{track.title}</h3>
      {/* Component content */}
    </Card>
  );
});

TrackCard.displayName = 'TrackCard';
```

2. **Create Test File:**
```typescript
// src/components/tracks/__tests__/TrackCard.test.tsx
import { render, screen } from '@testing-library/react';
import { TrackCard } from '../TrackCard';

describe('TrackCard', () => {
  it('renders track title', () => {
    const track = { id: '1', title: 'Test' };
    render(<TrackCard track={track} onPlay={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

3. **Create Barrel Export (Optional):**
```typescript
// src/components/tracks/index.ts
export { TrackCard } from './TrackCard';
export { TrackList } from './TrackList';
```

4. **Use the Component:**
```typescript
import { TrackCard } from '@/components/tracks/TrackCard';
// or
import { TrackCard } from '@/components/tracks';
```

### Adding a New Hook

**Location:** `src/hooks/useFeatureName.ts`

**Pattern:**

```typescript
// src/hooks/useTrackActions.ts
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api.service';

export const useTrackActions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (trackId: string) => ApiService.deleteTrack(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast({
        title: "Success",
        description: "Track deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTrack = useCallback((trackId: string) => {
    deleteMutation.mutate(trackId);
  }, [deleteMutation]);

  return {
    deleteTrack,
    isDeleting: deleteMutation.isPending,
  };
};
```

### Adding a New Edge Function

**Location:** `supabase/functions/function-name/`

**Steps:**

1. **Create Function Directory:**
```bash
mkdir supabase/functions/my-function
```

2. **Create `index.ts`:**
```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request
    const { param1, param2 } = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Perform operation
    const result = await performOperation(param1, param2);

    // Return response
    return new Response(
      JSON.stringify(result),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

3. **Deploy Function:**
```bash
# Unix/Linux/Mac
./supabase/functions/deploy-all-functions.sh

# Windows
.\supabase\functions\deploy-all-functions.bat
```

### Adding a New Route

**Location:** `src/pages/[route-name]/`

**Steps:**

1. **Create Page Component:**
```typescript
// src/pages/NewFeaturePage.tsx
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const NewFeaturePage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="container mx-auto py-8">
        <h1>New Feature</h1>
        {/* Page content */}
      </div>
    </Suspense>
  );
};
```

2. **Add Route to Router:**
```typescript
// src/router.tsx
import { lazy } from 'react';

const NewFeaturePage = lazy(() =>
  import('@/pages/NewFeaturePage').then(m => ({ default: m.NewFeaturePage }))
);

// In routes array:
{
  path: '/workspace/new-feature',
  element: <NewFeaturePage />,
}
```

3. **Add Navigation Link:**
```typescript
// Update navigation component
<NavLink to="/workspace/new-feature">
  New Feature
</NavLink>
```

---

## Git Workflow

### Branch Strategy

```
main                      # Production-ready code
├── develop               # Integration branch
├── feature/ISSUE-123-*   # New features
├── bugfix/ISSUE-456-*    # Bug fixes
├── hotfix/*             # Critical production fixes
└── refactor/*           # Code refactoring
```

### Commit Convention

**Format:** `<type>(<scope>): <description>`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Test additions/changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `style` - Code style changes (formatting)
- `chore` - Maintenance tasks

**Examples:**
```bash
feat(tracks): add version switching functionality
fix(player): resolve audio playback stuttering issue
docs(api): update generation endpoint documentation
test(hooks): add tests for useTracks hook
refactor(services): extract API retry logic
perf(library): optimize track list rendering
```

### Pull Request Process

1. **Create Branch:**
```bash
git checkout -b feature/ISSUE-123-feature-name
```

2. **Make Changes with Conventional Commits:**
```bash
git add .
git commit -m "feat(feature): add new functionality"
```

3. **Push to Remote:**
```bash
git push -u origin feature/ISSUE-123-feature-name
```

4. **Open Pull Request:**
   - Use PR template
   - Link related issues
   - Add description and screenshots
   - Ensure CI passes
   - Request review (minimum 1 approval required)

5. **Address Review Feedback:**
```bash
git add .
git commit -m "refactor: address PR feedback"
git push
```

6. **Merge and Clean Up:**
   - Squash and merge (preferred) or merge commit
   - Delete branch after merge

### Branch Protection Rules

**Protected Branches:** `main`, `develop`

**Requirements:**
- Pull request required (no direct pushes)
- Minimum 1 approval from reviewers
- Status checks must pass:
  - `npm run typecheck` - TypeScript validation
  - `npm run lint` - ESLint
  - `npm test` - Unit tests with coverage
  - Edge Functions tests (if applicable)
- Linear history (no merge commits)
- Conventional Commits enforced in PR titles

### Git Hooks (Husky + lint-staged)

**Pre-commit Hook:**
- Runs ESLint on staged files
- Formats code with Prettier (if configured)
- Validates commit message format

**Pre-push Hook:**
- Runs TypeScript type checking
- Runs all tests

---

## Performance Considerations

### Code Splitting

**Route-based code splitting** with React.lazy:

```typescript
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
```

**Manual chunk splitting** in `vite.config.ts`:
```typescript
manualChunks: {
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  'vendor-charts': ['recharts'],
  'vendor-motion': ['framer-motion'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-query': ['@tanstack/react-query'],
}
```

### Component Optimization

1. **Use `memo` for expensive components:**
```typescript
export const ExpensiveComponent = memo(({ data }) => {
  // Rendering logic
});
```

2. **Use `useCallback` for event handlers:**
```typescript
const handleClick = useCallback(() => {
  performAction(id);
}, [id]);
```

3. **Use `useMemo` for expensive calculations:**
```typescript
const sortedTracks = useMemo(() => {
  return tracks.sort((a, b) => a.title.localeCompare(b.title));
}, [tracks]);
```

### Virtual Scrolling

For large lists, use `@tanstack/react-virtual`:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: tracks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});
```

### Image Optimization

**Lazy loading images:**
```typescript
import { useImageLazyLoad } from '@/hooks/useImageLazyLoad';

const { ref, isLoaded } = useImageLazyLoad();

<img ref={ref} src={isLoaded ? track.cover_url : placeholder} />
```

### Caching Strategy

**React Query configuration:**
- **Desktop:** 5-minute cache, 3 retries
- **Mobile:** 2-minute cache, 2 retries
- **Stale time:** Prevents unnecessary refetches
- **Garbage collection:** Removes unused cache after 10 minutes

**IndexedDB caching:**
```typescript
// Track cache service for offline support
trackCacheService.cacheTrack(track);
const cachedTrack = await trackCacheService.getTrack(trackId);
```

### Bundle Size Monitoring

**Run bundle analysis:**
```bash
npm run build:analyze
```

Opens `stats.html` with bundle visualization showing:
- Chunk sizes (gzip + brotli)
- Module dependencies
- Bundle composition

**Chunk size warning limit:** 800KB

---

## Security Guidelines

### Authentication

**Supabase Auth with JWT:**
- Row Level Security (RLS) enforced on all tables
- JWT tokens auto-included in Edge Function calls
- Auth state managed via `AuthContext`

**Protected Routes:**
```typescript
// Route protection with authentication guard
<ProtectedRoute>
  <WorkspacePage />
</ProtectedRoute>
```

### Environment Variables

**Never commit secrets to Git.**

**Location:** `.env` (gitignored)

**Required Variables:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_APP_VERSION=2.6.2
```

**Environment validation:** `src/config/env.ts` with Zod schemas

### Content Security Policy (CSP)

**Production CSP headers** (configured in `vite.config.ts`):
```typescript
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self' https://cdn.sentry.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "img-src 'self' https: data: blob:",
  "frame-ancestors 'none'",
].join('; ')
```

**Development:** CSP disabled for Lovable Cloud preview compatibility

### Input Validation

**Use Zod for schema validation:**

```typescript
import { z } from 'zod';

const TrackSchema = z.object({
  title: z.string().min(1).max(100),
  prompt: z.string().min(10).max(1000),
  style: z.enum(['pop', 'rock', 'jazz', 'electronic']),
});

// Validate input
const result = TrackSchema.safeParse(input);
if (!result.success) {
  throw new Error(result.error.message);
}
```

### Sanitization

**Use DOMPurify for user-generated content:**

```typescript
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userContent);
```

### SQL Injection Prevention

**Always use parameterized queries:**

```typescript
// ✅ GOOD - Parameterized query
const { data } = await supabase
  .from('tracks')
  .select('*')
  .eq('user_id', userId);

// ❌ BAD - String concatenation
const query = `SELECT * FROM tracks WHERE user_id = '${userId}'`;
```

### XSS Prevention

1. React automatically escapes content
2. Use DOMPurify for `dangerouslySetInnerHTML`
3. Validate all user inputs
4. Implement CSP headers

---

## Tips for AI Assistants

### General Principles

1. **Always use existing patterns**
   - Study the codebase before adding new patterns
   - Follow established conventions
   - Reuse existing hooks and services

2. **Maintain type safety**
   - Never use `any` without justification
   - Add proper TypeScript interfaces
   - Use strict mode conventions

3. **Write tests first**
   - Maintain 80%+ coverage
   - Test user behavior, not implementation
   - Include error cases

4. **Update documentation**
   - Keep CLAUDE.md in sync
   - Update relevant docs in `docs/`
   - Add JSDoc comments for complex logic

5. **Follow the architecture**
   - Don't bypass service layer
   - Use repository pattern for data access
   - Respect separation of concerns

### When Adding New Features

**Checklist:**
- [ ] Identify affected components/services
- [ ] Create feature branch with conventional naming
- [ ] Implement with existing patterns (hooks, services, etc.)
- [ ] Add TypeScript types in `src/types/`
- [ ] Write unit tests (aim for 80%+ coverage)
- [ ] Test error states and edge cases
- [ ] Update relevant documentation
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`
- [ ] Create PR with conventional commit messages
- [ ] Add screenshots/GIFs for UI changes

### When Debugging Issues

**Steps:**
1. Check browser console for errors
2. Check Sentry logs (if configured)
3. Check Supabase Edge Function logs
4. Check database RLS policies
5. Verify environment variables
6. Check React Query dev tools
7. Check Zustand dev tools

**Common Issues:**
- **401 Unauthorized:** Check JWT token, verify RLS policies
- **CORS errors:** Check Supabase CORS configuration
- **Hydration errors:** Check SSR/client mismatch
- **Bundle too large:** Run `npm run build:analyze`

### When Reviewing Code

**Focus Areas:**
1. **Type Safety:** Proper TypeScript usage
2. **Performance:** Unnecessary re-renders, large bundles
3. **Security:** Input validation, XSS prevention, SQL injection
4. **Testing:** Adequate test coverage
5. **Accessibility:** ARIA labels, keyboard navigation
6. **Documentation:** Clear comments, updated docs

### Common Pitfalls to Avoid

1. **❌ Don't use relative imports**
   ```typescript
   // Bad
   import { Button } from '../../components/ui/button';
   // Good
   import { Button } from '@/components/ui/button';
   ```

2. **❌ Don't bypass the service layer**
   ```typescript
   // Bad
   const { data } = await supabase.from('tracks').select('*');
   // Good
   const tracks = await ApiService.fetchTracks(userId);
   ```

3. **❌ Don't create new state management without justification**
   - Use React Query for server state
   - Use Zustand for global client state
   - Use Context for feature-scoped state

4. **❌ Don't commit without tests**
   - Maintain 80%+ coverage
   - Test new functionality

5. **❌ Don't ignore TypeScript errors**
   - Fix type errors, don't use `@ts-ignore`
   - Add proper types

6. **❌ Don't create files without following conventions**
   - Follow file naming conventions
   - Place files in correct directories

### Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run typecheck          # Check TypeScript
npm run lint               # Run ESLint
npm run lint:workspace     # Lint workspace-specific code

# Building
npm run build              # Production build
npm run build:dev          # Development build
npm run build:analyze      # Build with bundle analysis
npm run bundle:check       # Check bundle size

# Testing
npm test                   # Run unit tests
npm test -- --coverage     # With coverage
npm run test:e2e           # E2E tests
npm run docs:validate      # Validate documentation

# Database
npm run db:seed            # Reset and seed database

# Preview
npm run preview            # Preview production build
```

### Key Files to Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file - AI assistant guide |
| `CONTRIBUTING.md` | Contribution guidelines |
| `README.md` | Project overview |
| `docs/ARCHITECTURE.md` | System architecture |
| `package.json` | Dependencies and scripts |
| `vite.config.ts` | Build configuration |
| `tsconfig.json` | TypeScript configuration |
| `src/router.tsx` | Route definitions |
| `src/services/api.service.ts` | API service layer |
| `tests/setup.ts` | Test configuration |

### Documentation Structure

```
docs/
├── README.md              # Documentation hub
├── ARCHITECTURE.md        # System architecture
├── api/                   # API documentation
├── architecture/          # Architecture diagrams
├── user-guide/            # User documentation
├── audit/                 # Audit reports
└── maintenance/           # Maintenance guides
```

### Need Help?

1. **Check Documentation:**
   - Start with `docs/README.md`
   - Read `ARCHITECTURE.md` for system design
   - Check `CONTRIBUTING.md` for contribution guidelines

2. **Search Codebase:**
   - Use existing patterns as templates
   - Look for similar implementations
   - Check test files for usage examples

3. **Review Recent Changes:**
   - Check recent commits for context
   - Read pull request descriptions
   - Review closed issues

4. **Ask Questions:**
   - Tag specific files/lines in questions
   - Provide context and what you've tried
   - Reference relevant documentation

---

## Conclusion

This guide provides a comprehensive overview of the Albert3 Muse Synth Studio codebase for AI assistants. Always refer to this document when working on the project to ensure consistency and adherence to established patterns.

**Key Takeaways:**
- Use absolute imports with `@/` prefix
- Follow TypeScript strict mode
- Leverage existing hooks (85+) and services
- Maintain 80%+ test coverage
- Respect the architecture (service layer, repositories, providers)
- Follow mobile-first design principles
- Use React Query for server state, Zustand for client state
- Write conventional commit messages
- Update documentation with code changes

**Version History:**
- v1.0.0 (2025-11-14) - Initial comprehensive guide

---

**Last Updated:** 2025-11-14
**Maintained By:** HOW2AI-AGENCY Development Team
**Questions?** Check `docs/README.md` or create an issue
