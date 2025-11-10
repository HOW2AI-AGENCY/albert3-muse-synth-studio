# IMPROVEMENT PLAN - Application Logic Fixes
**Albert3 Muse Synth Studio**
**Date:** 2025-11-10
**Based on:** Application Logic Audit 2025-11-10
**Timeline:** 2-3 Sprints

---

## EXECUTIVE SUMMARY

This improvement plan addresses **14 critical issues** identified in the application logic audit, prioritized by impact and complexity. The plan is divided into 3 phases:

- **Phase 1 (P0 - Week 1-2):** Critical security and stability fixes
- **Phase 2 (P1 - Week 3-4):** Architecture improvements and race conditions
- **Phase 3 (P2 - Week 5-6):** Performance optimizations and polish

**Estimated Total Effort:** 15-20 developer days

---

## PHASE 1: CRITICAL FIXES (P0)

### Task 1.1: Fix Memory Leaks in Realtime Subscriptions
**Priority:** 🔴 P0 (CRITICAL)
**Issue ID:** P0-1
**Estimated Time:** 3-4 days
**Assignee:** Senior Developer

#### Problem
Multiple async cleanup patterns in realtime subscriptions causing memory leaks:
- `useTracks.ts:322-364`
- `useGenerateMusic.ts:130-179`
- `useTrackSync.ts:50-290`

#### Solution Steps

##### Step 1.1.1: Fix useTracks.ts cleanup
**File:** `src/hooks/useTracks.ts`

```typescript
// ❌ BEFORE (lines 322-364)
useEffect(() => {
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { ... }, handlePayload)
    .subscribe();

  return () => {
    supabase.removeChannel(channel).then(() => {
      logInfo('Channel removed');
    });
  };
}, [deps]);

// ✅ AFTER
useEffect(() => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { ... }, handlePayload)
    .subscribe();

  channelRef.current = channel;

  return () => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [deps]);
```

##### Step 1.1.2: Apply same fix to useGenerateMusic.ts and useTrackSync.ts

##### Step 1.1.3: Add cleanup verification
- Add console warning if channel still exists after cleanup
- Add memory profiling test

#### Acceptance Criteria
- [ ] No async `.then()` in cleanup functions
- [ ] Channel references set to `null` immediately
- [ ] Memory profiler shows stable memory usage after 10+ navigations
- [ ] No Supabase "channel not removed" warnings in console

#### Testing
```typescript
// Test: Memory leak verification
describe('Realtime subscription cleanup', () => {
  it('should remove channel on unmount', async () => {
    const { unmount } = render(<ComponentWithUseTracks />);
    const initialChannels = supabase.getChannels().length;

    unmount();
    await waitFor(() => {
      expect(supabase.getChannels().length).toBe(initialChannels - 1);
    });
  });
});
```

---

### Task 1.2: Consolidate Overlapping Subscriptions
**Priority:** 🔴 P0 (CRITICAL)
**Issue ID:** P0-2
**Estimated Time:** 4-5 days
**Assignee:** Senior Developer

#### Problem
4 different subscription patterns for same data:
- `useTracks.ts` - subscribes to all tracks
- `useGenerateMusic.ts` - subscribes to generating track
- `useTrackSync.ts` - subscribes to sync status
- `GenerationService.ts` - static subscription map

Result: **3-4 channels per track = memory leak + redundant processing**

#### Solution: Unified Subscription Manager

##### Step 1.2.1: Create centralized subscription manager
**New File:** `src/services/realtimeSubscriptionManager.ts`

```typescript
/**
 * Centralized Realtime Subscription Manager
 * Single source of truth for all Supabase realtime subscriptions
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

type Listener<T> = (data: T) => void;

interface Subscription<T> {
  channel: RealtimeChannel;
  listeners: Set<Listener<T>>;
  channelName: string;
}

class RealtimeSubscriptionManager {
  private static subscriptions = new Map<string, Subscription<any>>();

  /**
   * Subscribe to track updates
   * Multiple listeners can subscribe to same channel
   */
  static subscribeToTrack<T>(
    trackId: string,
    listener: Listener<T>
  ): () => void {
    const key = `track:${trackId}`;

    // Reuse existing channel if available
    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.listeners.add(listener);
      logger.info(`Added listener to existing channel`, 'RealtimeManager', { key, listenerCount: sub.listeners.size });

      return () => this.unsubscribe(key, listener);
    }

    // Create new channel
    const channelName = `track-updates-${trackId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const sub = this.subscriptions.get(key);
          if (sub) {
            // Notify all listeners
            sub.listeners.forEach((l) => {
              try {
                l(payload as T);
              } catch (error) {
                logger.error('Listener error', error, 'RealtimeManager', { key });
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Realtime channel active', 'RealtimeManager', { channelName });
        }
      });

    this.subscriptions.set(key, {
      channel,
      listeners: new Set([listener]),
      channelName,
    });

    logger.info('Created new realtime channel', 'RealtimeManager', { key });

    return () => this.unsubscribe(key, listener);
  }

  /**
   * Subscribe to all user tracks
   */
  static subscribeToUserTracks<T>(
    userId: string,
    projectId: string | null,
    listener: Listener<T>
  ): () => void {
    const key = `user:${userId}:project:${projectId ?? 'all'}`;

    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.listeners.add(listener);
      return () => this.unsubscribe(key, listener);
    }

    const channelName = `tracks-user-${userId}-project-${projectId ?? 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const sub = this.subscriptions.get(key);
          if (sub) {
            sub.listeners.forEach((l) => {
              try {
                l(payload as T);
              } catch (error) {
                logger.error('Listener error', error, 'RealtimeManager', { key });
              }
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set(key, {
      channel,
      listeners: new Set([listener]),
      channelName,
    });

    return () => this.unsubscribe(key, listener);
  }

  /**
   * Unsubscribe a listener
   * If no listeners remain, remove the channel
   */
  private static unsubscribe<T>(key: string, listener: Listener<T>): void {
    const sub = this.subscriptions.get(key);
    if (!sub) return;

    sub.listeners.delete(listener);
    logger.info('Removed listener', 'RealtimeManager', { key, remainingListeners: sub.listeners.size });

    // If no listeners remain, remove channel
    if (sub.listeners.size === 0) {
      void supabase.removeChannel(sub.channel);
      this.subscriptions.delete(key);
      logger.info('Removed realtime channel', 'RealtimeManager', { key });
    }
  }

  /**
   * Debug: Get active subscriptions
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Clear all subscriptions (for testing)
   */
  static clearAll(): void {
    this.subscriptions.forEach((sub) => {
      void supabase.removeChannel(sub.channel);
    });
    this.subscriptions.clear();
    logger.info('Cleared all subscriptions', 'RealtimeManager');
  }
}

export default RealtimeSubscriptionManager;
```

##### Step 1.2.2: Refactor useTracks.ts to use manager

```typescript
// In src/hooks/useTracks.ts
import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';

useEffect(() => {
  if (!userId) return;

  const handlePayload = (payload: any) => {
    // Existing logic
  };

  const unsubscribe = RealtimeSubscriptionManager.subscribeToUserTracks(
    userId,
    projectId,
    handlePayload
  );

  return unsubscribe;
}, [userId, projectId]);
```

##### Step 1.2.3: Refactor useGenerateMusic.ts

```typescript
// Remove GenerationService.subscribe()
// Use RealtimeSubscriptionManager.subscribeToTrack() instead
```

##### Step 1.2.4: Remove useTrackSync.ts duplicates

##### Step 1.2.5: Deprecate GenerationService subscriptions

#### Acceptance Criteria
- [ ] Only ONE channel per track/user combination
- [ ] Multiple listeners can share same channel
- [ ] Channel removed when last listener unsubscribes
- [ ] No redundant subscriptions in DevTools Network tab
- [ ] Memory usage reduced by 60-70%

---

### Task 1.3: Implement Server-Side Rate Limiting
**Priority:** 🔴 P0 (SECURITY)
**Issue ID:** P0-3
**Estimated Time:** 3 days
**Assignee:** Backend Developer

#### Problem
Rate limiting only on client side (can be bypassed via DevTools or direct API calls)

#### Solution: Edge Function Rate Limiting with Upstash

##### Step 1.3.1: Set up Upstash Redis
1. Create Upstash account
2. Add env vars to Supabase:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

##### Step 1.3.2: Create rate limiter utility
**New File:** `supabase/functions/_shared/rate-limit.ts`

```typescript
import { logger } from './logger.ts';

const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  GENERATION: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour
  PERSONA_CREATE: { maxRequests: 5, windowSeconds: 3600 }, // 5 per hour
  WEBHOOK: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
};

export async function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    logger.warn('Upstash not configured, skipping rate limit', 'RateLimit');
    return { allowed: true, remaining: 999, resetAt: Date.now() + 3600000 };
  }

  const config = RATE_LIMITS[action];
  const key = `ratelimit:${action}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  try {
    // Use Redis sorted set with timestamps
    // Remove old entries
    await fetch(`${UPSTASH_URL}/zremrangebyscore/${key}/0/${windowStart}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    // Count current requests
    const countRes = await fetch(`${UPSTASH_URL}/zcard/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const countData = await countRes.json();
    const currentCount = countData.result || 0;

    if (currentCount >= config.maxRequests) {
      // Get oldest timestamp to calculate reset time
      const oldestRes = await fetch(`${UPSTASH_URL}/zrange/${key}/0/0`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
      const oldestData = await oldestRes.json();
      const oldest = oldestData.result?.[0] ? parseInt(oldestData.result[0]) : now;
      const resetAt = oldest + config.windowSeconds * 1000;

      logger.warn('Rate limit exceeded', 'RateLimit', { userId, action, currentCount });
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    await fetch(`${UPSTASH_URL}/zadd/${key}/${now}/${now}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    // Set expiry on key
    await fetch(`${UPSTASH_URL}/expire/${key}/${config.windowSeconds}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    const remaining = config.maxRequests - currentCount - 1;
    const resetAt = now + config.windowSeconds * 1000;

    logger.info('Rate limit check passed', 'RateLimit', { userId, action, remaining });
    return { allowed: true, remaining, resetAt };
  } catch (error) {
    logger.error('Rate limit check failed', error, 'RateLimit');
    // Fail open in case of Redis errors
    return { allowed: true, remaining: 999, resetAt: Date.now() + 3600000 };
  }
}
```

##### Step 1.3.3: Add to generate-suno Edge Function

```typescript
// In supabase/functions/generate-suno/index.ts
import { checkRateLimit } from '../_shared/rate-limit.ts';

const rateLimit = await checkRateLimit(user.id, 'GENERATION');
if (!rateLimit.allowed) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    }
  );
}
```

##### Step 1.3.4: Update frontend to handle 429 responses

#### Acceptance Criteria
- [ ] Rate limiting enforced on server side
- [ ] Cannot bypass via DevTools
- [ ] Frontend shows retry-after timer
- [ ] Redis keys expire properly
- [ ] Fallback to "allow" if Redis unavailable

---

### Task 1.4: Enforce Webhook Signature Verification
**Priority:** 🔴 P0 (SECURITY)
**Issue ID:** P0-4
**Estimated Time:** 2 days
**Assignee:** Backend Developer

#### Problem
Webhooks accept requests without signature verification if secret not configured

#### Solution

##### Step 1.4.1: Update mureka-webhook/index.ts

```typescript
// ❌ BEFORE
const MUREKA_WEBHOOK_SECRET = Deno.env.get('MUREKA_WEBHOOK_SECRET');

if (MUREKA_WEBHOOK_SECRET) {
  // Verify
} else {
  logger.warn('Secret not configured - skipping');
  // CONTINUES!
}

// ✅ AFTER
const MUREKA_WEBHOOK_SECRET = Deno.env.get('MUREKA_WEBHOOK_SECRET');
const IS_PRODUCTION = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;

if (!MUREKA_WEBHOOK_SECRET) {
  if (IS_PRODUCTION) {
    logger.error('MUREKA_WEBHOOK_SECRET required in production', 'MurekaWebhook');
    return new Response(
      JSON.stringify({ success: false, error: 'Configuration error' }),
      { status: 500, headers: corsHeaders }
    );
  } else {
    logger.warn('MUREKA_WEBHOOK_SECRET not set (development mode)', 'MurekaWebhook');
  }
} else {
  // Verify signature (existing logic)
  const isValid = verifySignature(signature, body, MUREKA_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid signature' }),
      { status: 401, headers: corsHeaders }
    );
  }
}
```

##### Step 1.4.2: Apply same fix to suno-callback/index.ts

##### Step 1.4.3: Add monitoring alert for missing secrets

#### Acceptance Criteria
- [ ] Production deployment fails if secrets missing
- [ ] Development mode shows warning but continues
- [ ] Invalid signatures return 401
- [ ] Sentry alerts on configuration errors

---

## PHASE 2: ARCHITECTURE IMPROVEMENTS (P1)

### Task 2.1: Fix Version Loading Race Conditions
**Priority:** 🟡 P1
**Issue ID:** P1-1
**Estimated Time:** 2 days

#### Problem
Rapid track switches can cause stale version data to overwrite newer data

#### Solution: Request Deduplication

**File:** `src/stores/audioPlayerStore.ts`

```typescript
// Add request deduplication
private static _loadVersionsRequestMap = new Map<string, Promise<any>>();

loadVersions: async (trackId) => {
  const parentId = trackId; // Simplify

  // Check if request already in flight
  if (audioPlayerStore._loadVersionsRequestMap.has(parentId)) {
    logger.info('Version load already in progress, waiting', 'AudioPlayer', { parentId });
    return audioPlayerStore._loadVersionsRequestMap.get(parentId);
  }

  const state = get();
  if (state._loadVersionsAbortController) {
    state._loadVersionsAbortController.abort();
  }

  const abortController = new AbortController();
  set({ _loadVersionsAbortController: abortController });

  const requestPromise = (async () => {
    try {
      // Existing fetch logic
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('parent_track_id', parentId)
        .aborted(abortController.signal);

      // Check if still relevant
      const currentState = get();
      const currentParentId = currentState.currentTrack?.parentTrackId || currentState.currentTrack?.id;

      if (currentParentId !== parentId) {
        logger.info('Discarding stale version load', 'AudioPlayer', { parentId, currentParentId });
        return;
      }

      // Apply data
      set({ availableVersions: data });
    } finally {
      // Remove from request map
      audioPlayerStore._loadVersionsRequestMap.delete(parentId);
    }
  })();

  audioPlayerStore._loadVersionsRequestMap.set(parentId, requestPromise);
  return requestPromise;
}
```

#### Acceptance Criteria
- [ ] Rapid track switches don't cause stale data
- [ ] Request deduplication prevents duplicate fetches
- [ ] Proper cleanup on abort

---

### Task 2.2: Remove Polling + Realtime Overlap
**Priority:** 🟡 P1
**Issue ID:** P1-2
**Estimated Time:** 1 day

#### Solution
Use polling ONLY as fallback if realtime fails

```typescript
// In useGenerateMusic.ts
const REALTIME_TIMEOUT = 5000; // 5 seconds

useEffect(() => {
  if (!trackId) return;

  let timeoutId: number;
  let unsubscribe: (() => void) | null = null;

  // Try realtime first
  unsubscribe = RealtimeSubscriptionManager.subscribeToTrack(
    trackId,
    handleUpdate
  );

  // Fallback to polling after timeout
  timeoutId = setTimeout(() => {
    logger.warn('Realtime timeout, falling back to polling', 'GenerateMusic', { trackId });
    startPolling(trackId);
  }, REALTIME_TIMEOUT);

  return () => {
    clearTimeout(timeoutId);
    if (unsubscribe) unsubscribe();
    stopPolling();
  };
}, [trackId]);
```

---

### Task 2.3: Simplify Version Management
**Priority:** 🟡 P1
**Issue ID:** P1-4
**Estimated Time:** 3 days

#### Problem
Variant 0 stored in `tracks` table, variants 1+ in `track_versions` table. Confusing!

#### Solution: Store ALL versions in track_versions

##### Step 2.3.1: Add migration

**New File:** `supabase/migrations/20251110_store_all_versions_in_track_versions.sql`

```sql
-- Add primary_version_id to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS primary_version_id UUID REFERENCES track_versions(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_tracks_primary_version_id ON tracks(primary_version_id);

-- Migrate existing data: Move variant 0 to track_versions
INSERT INTO track_versions (
  id,
  parent_track_id,
  variant_index,
  audio_url,
  cover_url,
  duration,
  title,
  style_tags,
  lyrics,
  is_primary_variant,
  like_count,
  created_at
)
SELECT
  gen_random_uuid(),
  t.id,
  0,
  t.audio_url,
  t.cover_url,
  t.duration,
  t.title,
  t.style_tags,
  t.lyrics,
  true,
  t.like_count,
  t.created_at
FROM tracks t
WHERE t.audio_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM track_versions tv
    WHERE tv.parent_track_id = t.id AND tv.variant_index = 0
  );

-- Update tracks.primary_version_id to point to variant 0
UPDATE tracks t
SET primary_version_id = (
  SELECT tv.id
  FROM track_versions tv
  WHERE tv.parent_track_id = t.id
    AND tv.variant_index = 0
  LIMIT 1
);

-- Optional: Remove redundant fields from tracks table
-- (Keep for backward compatibility initially)
-- ALTER TABLE tracks DROP COLUMN audio_url;
-- ALTER TABLE tracks DROP COLUMN cover_url;
-- ALTER TABLE tracks DROP COLUMN duration;
```

##### Step 2.3.2: Update suno-callback to store ALL versions in track_versions

```typescript
// Store ALL variants in track_versions (including variant 0)
for (let i = 0; i < successfulTracks.length; i++) {
  const variantTrack = successfulTracks[i];

  await supabase.from('track_versions').upsert({
    parent_track_id: track.id,
    variant_index: i,
    audio_url: variantTrack.audioUrl,
    is_primary_variant: i === 0,
    // ... other fields
  });
}

// Update tracks.primary_version_id to variant 0
const { data: primaryVersion } = await supabase
  .from('track_versions')
  .select('id')
  .eq('parent_track_id', track.id)
  .eq('variant_index', 0)
  .single();

await supabase
  .from('tracks')
  .update({ primary_version_id: primaryVersion.id })
  .eq('id', track.id);
```

##### Step 2.3.3: Update frontend to fetch ALL versions from track_versions

```typescript
// In audioPlayerStore.ts - simplify loadVersions
loadVersions: async (trackId) => {
  const { data, error } = await supabase
    .from('track_versions')
    .select('*')
    .eq('parent_track_id', trackId)
    .order('variant_index', { ascending: true });

  if (error) {
    logger.error('Failed to load versions', error, 'AudioPlayer');
    return;
  }

  set({ availableVersions: data });
}
```

#### Acceptance Criteria
- [ ] ALL versions stored in track_versions table
- [ ] tracks.primary_version_id points to master version
- [ ] Frontend fetches all versions from single table
- [ ] No special case for variant 0
- [ ] Existing data migrated successfully

---

### Task 2.4: Standardize Error Response Format
**Priority:** 🟡 P1
**Issue ID:** P1-5
**Estimated Time:** 2 days

#### Solution: Create shared error response type

**File:** `supabase/functions/_shared/errors.ts`

```typescript
export interface APIError {
  success: false;
  error: string;
  code: ErrorCode;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTH_FAILED'
  | 'VALIDATION_FAILED'
  | 'INVALID_SIGNATURE'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  retryAfter?: number
): APIError {
  return {
    success: false,
    error: message,
    code,
    details,
    retryAfter,
  };
}
```

Update all Edge Functions to use this format.

---

## PHASE 3: PERFORMANCE OPTIMIZATIONS (P2)

### Task 3.1: Optimize DAW History Memory
**Priority:** 🟢 P2
**Issue ID:** P2-1
**Estimated Time:** 2 days

#### Solution: Implement structural sharing

Use immer patches or compress old history states.

---

### Task 3.2: Create Transient Error Utility
**Priority:** 🟢 P2
**Issue ID:** Network error inconsistency
**Estimated Time:** 1 day

**File:** `src/utils/networkErrors.ts`

```typescript
const TRANSIENT_ERROR_PATTERNS = [
  'ERR_NETWORK_CHANGED',
  'ERR_CONNECTION_RESET',
  'ETIMEDOUT',
  'ECONNRESET',
  'Failed to fetch',
  'ERR_ABORTED',
  'network',
];

export function isTransientError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return TRANSIENT_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}
```

---

## TESTING PLAN

### Phase 1 Tests
- [ ] Memory leak tests for subscriptions
- [ ] Rate limiting bypass attempts (security test)
- [ ] Webhook signature verification tests
- [ ] Subscription consolidation stress test

### Phase 2 Tests
- [ ] Race condition tests for version loading
- [ ] Version management integration tests
- [ ] Error format validation tests

### Phase 3 Tests
- [ ] DAW history memory benchmarks
- [ ] Network error utility unit tests

---

## ROLLOUT PLAN

### Week 1-2: P0 Fixes
1. Day 1-3: Fix memory leaks (1.1)
2. Day 4-6: Consolidate subscriptions (1.2)
3. Day 7-8: Rate limiting (1.3)
4. Day 9-10: Webhook security (1.4)

### Week 3-4: P1 Improvements
1. Day 11-12: Race conditions (2.1)
2. Day 13: Polling overlap (2.2)
3. Day 14-16: Version management (2.3)
4. Day 17-18: Error formats (2.4)

### Week 5-6: P2 Optimizations
1. Day 19-20: DAW history (3.1)
2. Day 21: Error utility (3.2)
3. Day 22-25: Testing and polish

---

## SUCCESS METRICS

### Phase 1
- Memory usage stable after 50+ navigations
- 0 duplicate subscriptions in DevTools
- 0 rate limiting bypasses in security tests
- 0 unauthorized webhook executions

### Phase 2
- 0 race condition errors in logs
- Version loading time < 200ms
- 100% consistent error formats

### Phase 3
- DAW history memory < 2MB
- 100% network error detection coverage

---

## RISKS & MITIGATION

### Risk 1: Breaking Changes in Realtime Manager
**Mitigation:** Feature flag + gradual rollout

### Risk 2: Migration Data Loss
**Mitigation:** Test migration on staging first, backup database

### Risk 3: Performance Regression
**Mitigation:** Benchmark before/after, rollback plan

---

**Generated:** 2025-11-10
**Next Review:** 2025-11-24 (after Phase 1)
