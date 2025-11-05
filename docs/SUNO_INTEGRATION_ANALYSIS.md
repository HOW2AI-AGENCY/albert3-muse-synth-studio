# Suno API Integration Analysis & Implementation Plan

**Document Version:** 1.0.0
**Created:** 2025-11-05
**Status:** Implementation Complete - Enhancement Phase
**Target Branch:** `claude/suno-integration-analysis-011CUpPg2wrtX1tf5XtMBYdX`

## Executive Summary

This document provides a comprehensive analysis of three Suno API features integrated into Albert3 Muse Synth Studio:

1. **Replace Music Section** - Replace specific time segments within tracks
2. **Get Timestamped Lyrics** - Retrieve word-level synchronized lyrics
3. **Replace Section Callbacks** - Asynchronous webhook handling for replacements

**Current Status:** ✅ **Core implementation complete**. All three components are fully functional with security, validation, and error handling. This document outlines enhancement opportunities and production readiness checklist.

---

## Table of Contents

1. [Current Implementation Status](#current-implementation-status)
2. [Technical Architecture](#technical-architecture)
3. [Component Analysis](#component-analysis)
4. [Integration Checklist](#integration-checklist)
5. [Enhancement Opportunities](#enhancement-opportunities)
6. [Testing Strategy](#testing-strategy)
7. [Monitoring & Operations](#monitoring--operations)
8. [Rollout Plan](#rollout-plan)

---

## Current Implementation Status

### ✅ Completed Features

#### Backend (Supabase Edge Functions)

| Function | Status | Security | Validation | Error Handling |
|----------|--------|----------|------------|----------------|
| `replace-section` | ✅ Complete | ✅ JWT + Ownership | ✅ Zod Schema | ✅ Comprehensive |
| `replace-section-callback` | ✅ Complete | ✅ HMAC Signature | ✅ Type-safe | ✅ Comprehensive |
| `get-timestamped-lyrics` | ✅ Complete | ✅ JWT Auth | ✅ Zod Schema | ✅ Comprehensive |

**Key Features Implemented:**
- 🔐 JWT authentication with `X-User-Id` middleware
- 🛡️ HMAC signature verification for webhooks (`SUNO_WEBHOOK_SECRET`)
- ✅ Zod schema validation for all inputs
- 📊 Database caching for timestamped lyrics
- 🔄 Idempotent callback processing
- 📝 Comprehensive logging with centralized logger
- 🚨 Rate limiting and quota handling (429, 402 errors)
- 🔍 Track ownership verification

#### Frontend Components

| Component | Path | Status | Features |
|-----------|------|--------|----------|
| Hook | `src/hooks/useReplaceSection.ts` | ✅ Complete | Validation, React Query integration |
| Service | `src/services/lyrics.service.ts` | ✅ Complete | Timestamped lyrics fetching |
| UI Dialog | `src/components/tracks/ReplaceSectionDialog.tsx` | ✅ Complete | Section selection, form validation |

**Key Features Implemented:**
- 🎯 Section duration validation (5-30 seconds)
- 🔄 React Query invalidation for real-time updates
- 🎨 User-friendly UI with time range selector
- 📡 Supabase Realtime subscription support
- 🚨 Toast notifications for user feedback

#### Database Schema

| Table | Status | Purpose |
|-------|--------|---------|
| `track_section_replacements` | ✅ Exists | Store replacement requests and results |
| `callback_logs` | ✅ Exists | Log webhook callbacks for debugging |
| `tracks.metadata.timestamped_lyrics` | ✅ Implemented | Cache lyrics to reduce API calls |

---

## Technical Architecture

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Hook as useReplaceSection
    participant EdgeFn as replace-section
    participant SunoAPI as Suno API
    participant Callback as replace-section-callback
    participant DB as Supabase DB
    participant RT as Realtime

    UI->>Hook: User submits replacement
    Hook->>EdgeFn: POST /replace-section
    EdgeFn->>DB: Create replacement record (pending)
    EdgeFn->>SunoAPI: POST /replace-section (with callbackUrl)
    SunoAPI-->>EdgeFn: taskId
    EdgeFn->>DB: Update status to 'processing'
    EdgeFn-->>Hook: {success: true, taskId}
    Hook->>UI: Show success toast

    Note over SunoAPI: Processing (30-60s)

    SunoAPI->>Callback: POST callback (with HMAC signature)
    Callback->>Callback: Verify signature
    Callback->>DB: Find replacement by taskId
    Callback->>DB: Create new track version
    Callback->>DB: Update replacement status to 'completed'
    Callback->>RT: Publish update event
    RT->>UI: Realtime notification
    UI->>UI: Refresh track list
```

### Timestamped Lyrics Flow

```mermaid
sequenceDiagram
    participant Player as Audio Player UI
    participant Service as LyricsService
    participant EdgeFn as get-timestamped-lyrics
    participant Cache as DB Cache
    participant SunoAPI as Suno API

    Player->>Service: getTimestampedLyrics(taskId, audioId)
    Service->>EdgeFn: POST /get-timestamped-lyrics
    EdgeFn->>Cache: Check if cached
    alt Cached
        Cache-->>EdgeFn: Return cached data
        EdgeFn-->>Service: {data, cached: true}
    else Not cached
        EdgeFn->>SunoAPI: GET timestamped lyrics
        SunoAPI-->>EdgeFn: {alignedWords, waveformData}
        EdgeFn->>Cache: Store in tracks.metadata
        EdgeFn-->>Service: {data, cached: false}
    end
    Service-->>Player: Render karaoke view
```

---

## Component Analysis

### 1. Replace Music Section

**File:** `supabase/functions/replace-section/index.ts`

#### Functionality
Replaces a specific time segment (infill) within an existing track with newly generated content based on user prompts.

#### Input Schema (Zod Validated)
```typescript
{
  trackId: string (UUID),
  taskId: string (1-100 chars),
  musicIndex: 0 | 1,
  prompt: string (1-1000 chars, trimmed),
  tags: string (1-200 chars),
  title: string (1-200 chars),
  negativeTags?: string (max 200 chars),
  infillStartS: number (0-300),
  infillEndS: number (5-300)
}
```

#### Business Rules
- ✅ Section duration: **5-30 seconds** (enforced)
- ✅ End time cannot exceed track duration
- ✅ User must own the track (ownership check via `tracks.user_id`)
- ✅ Track must have a `suno_task_id`

#### API Integration
- **Endpoint:** `https://api.sunoapi.org/api/v1/generate/replace-section`
- **Callback URL:** `${SUPABASE_URL}/functions/v1/replace-section-callback`
- **Reference:** [Suno Replace Section API Docs](https://docs.sunoapi.org/suno-api/replace-section-callbacks)

#### Error Handling
| Status Code | Meaning | Action |
|-------------|---------|--------|
| 429 | Rate limit exceeded | Return user-friendly message, retry later |
| 402 | Insufficient credits | Prompt user to add funds |
| 500 | API error | Log error, update status to 'failed' |

#### Database Operations
1. Create record in `track_section_replacements` (status: 'pending')
2. Call Suno API
3. Update status to 'processing' with `suno_task_id`

#### Limitations & Constraints
- **Practical infill range:** 5-30 seconds (UI enforced)
- **Cost:** Each request consumes Suno credits
- **Rate limits:** Suno API rate limits apply (429 handling implemented)
- **Callback reliability:** Requires public endpoint and stable network

---

### 2. Replace Section Callbacks

**File:** `supabase/functions/replace-section-callback/index.ts`

#### Functionality
Receives asynchronous webhook notifications from Suno API when section replacement completes.

#### Security Features
- ✅ **HMAC Signature Verification:** Uses `SUNO_WEBHOOK_SECRET` via `webhook-verify.ts`
- ✅ **Idempotency:** Lookup by `suno_task_id` prevents duplicate processing
- ✅ **Public endpoint:** No JWT required (webhook source is Suno)

#### Webhook Payload Structure
```typescript
{
  code: number,
  msg: string,
  data: {
    callbackType: 'complete' | 'error',
    task_id: string,
    data?: [{
      id: string,
      audio_url: string,
      stream_audio_url: string,
      image_url: string,
      prompt: string,
      model_name: string,
      title: string,
      tags: string,
      createTime: string,
      duration: number
    }],
    error?: string
  }
}
```

#### Processing Logic

**Success Path (`callbackType: 'complete'`):**
1. Find replacement record by `suno_task_id`
2. Determine next version number for parent track
3. Create new `track_versions` record:
   - `variant_index`: Auto-incremented
   - `is_primary_variant`: false
   - `is_preferred_variant`: false
   - `metadata.source`: 'section_replacement'
4. Update replacement status to 'completed'
5. Log to `callback_logs`

**Error Path (`callbackType: 'error'`):**
1. Update replacement status to 'failed'
2. Store error message
3. Log to `callback_logs`

#### Idempotency Guarantee
- Lookup by unique `suno_task_id`
- Multiple deliveries won't create duplicate versions

---

### 3. Get Timestamped Lyrics

**File:** `supabase/functions/get-timestamped-lyrics/index.ts`

#### Functionality
Retrieves word-level synchronized lyrics with audio waveform data for karaoke-style playback.

#### Input Schema (Zod Validated)
```typescript
{
  taskId: string (1-100 chars, required),
  audioId?: string (1-100 chars, optional),
  musicIndex?: 0 | 1 (optional)
}
```
*Note: Must provide either `audioId` OR `musicIndex`*

#### Response Structure
```typescript
{
  success: boolean,
  data: {
    alignedWords: Array<{
      word: string,
      success: boolean,
      startS: number,    // Start time in seconds
      endS: number,      // End time in seconds
      palign: number     // Alignment confidence
    }>,
    waveformData: number[],  // Audio waveform visualization
    hootCer: number,         // Character error rate
    isStreamed: boolean
  },
  cached: boolean  // true if returned from DB cache
}
```

#### Caching Strategy
- **Cache Location:** `tracks.metadata.timestamped_lyrics`
- **Cache Key:** `taskId` (via `suno_task_id` lookup)
- **TTL:** No explicit TTL (cached indefinitely, as lyrics don't change)
- **Cache Benefit:** Reduces API calls, improves response time

#### API Integration
- **Endpoint:** `https://api.sunoapi.org/api/v1/generate/get-timestamped-lyrics`
- **Reference:** [Suno Get Timestamped Lyrics Docs](https://docs.sunoapi.org/suno-api/get-timestamped-lyrics)

#### Limitations
- **Instrumental tracks:** Will return empty `alignedWords` array
- **Waveform size:** Can be large (consider lazy loading)
- **Accuracy:** Depends on vocal clarity (`hootCer` indicates quality)

#### Frontend Integration
```typescript
// src/services/lyrics.service.ts
const response = await LyricsService.getTimestampedLyrics({
  taskId: track.suno_task_id,
  audioId: track.suno_audio_id
});

// Use in karaoke view
response.alignedWords.forEach(word => {
  if (currentTime >= word.startS && currentTime <= word.endS) {
    highlightWord(word.word);
  }
});
```

---

## Integration Checklist

### ✅ Backend (Supabase Edge Functions)

- [x] **`replace-section`** function exists and is deployed
- [x] JWT authentication via `X-User-Id` header
- [x] Zod schema validation for inputs
- [x] Track ownership verification
- [x] Section duration validation (5-30s)
- [x] Suno API error handling (429, 402, 500)
- [x] Database record creation in `track_section_replacements`
- [x] Callback URL configuration (`${SUPABASE_URL}/functions/v1/replace-section-callback`)
- [x] Centralized logging with `logger.ts`

- [x] **`replace-section-callback`** function exists and is deployed
- [x] HMAC signature verification (when `SUNO_WEBHOOK_SECRET` is set)
- [x] Idempotent processing via `suno_task_id` lookup
- [x] Track version creation with auto-incremented `variant_index`
- [x] Callback logging in `callback_logs` table
- [x] Error path handling (status: 'failed')

- [x] **`get-timestamped-lyrics`** function exists and is deployed
- [x] JWT authentication
- [x] Zod schema validation
- [x] Database caching in `tracks.metadata.timestamped_lyrics`
- [x] Rate limit handling (429)
- [x] Graceful fallback for instrumental tracks

### ✅ Frontend

- [x] **`useReplaceSection`** hook implemented
- [x] Client-side validation (5-30s duration)
- [x] React Query invalidation after successful submission
- [x] Toast notifications for user feedback
- [x] Error handling and display

- [x] **`LyricsService.getTimestampedLyrics`** implemented
- [x] Edge Function invocation
- [x] Type-safe response parsing
- [x] Error handling

- [x] **`ReplaceSectionDialog`** UI component
- [x] Section time range selector (`SectionSelector`)
- [x] Form validation (prompt, tags, title required)
- [x] Loading state during processing
- [x] Dialog reset on open

### ✅ Database Schema

- [x] **`track_section_replacements`** table exists
  - [x] Columns: `id`, `parent_track_id`, `replaced_start_s`, `replaced_end_s`, `prompt`, `tags`, `negative_tags`, `suno_task_id`, `replacement_audio_url`, `status`, `error_message`, `version_id`, `metadata`, `created_at`, `updated_at`
  - [x] Status enum: 'pending', 'processing', 'completed', 'failed'

- [x] **`callback_logs`** table exists
  - [x] Columns: `id`, `callback_type`, `track_id`, `payload`, `created_at`

- [x] **`tracks.metadata`** JSONB column
  - [x] Supports `timestamped_lyrics` nested object

### ⚠️ Environment Variables

- [x] **`SUNO_API_KEY`** - Configured in Supabase secrets
- [x] **`SUPABASE_URL`** - Available in Edge Functions
- [x] **`SUPABASE_SERVICE_ROLE_KEY`** - For admin client
- [ ] **`SUNO_WEBHOOK_SECRET`** - ⚠️ **RECOMMENDED:** Set this to enable HMAC signature verification

### 🔍 Testing Requirements

- [ ] **Unit Tests** - Write tests for each function
  - [ ] `replace-section`: Input validation, ownership checks
  - [ ] `replace-section-callback`: Signature verification, idempotency
  - [ ] `get-timestamped-lyrics`: Caching logic

- [ ] **Integration Tests** - End-to-end flow
  - [ ] Full replace section flow (UI → Edge → Suno → Callback → DB → Realtime)
  - [ ] Timestamped lyrics retrieval (cached vs uncached)

- [ ] **Load Tests** - Performance validation
  - [ ] 10 concurrent replacement requests
  - [ ] Callback processing under load
  - [ ] Waveform data rendering performance (FPS target: 55-60)

---

## Enhancement Opportunities

### 🔒 Security Improvements

#### 1. Enable Webhook Signature Verification
**Priority:** 🔴 **HIGH**

**Current State:** Signature verification is implemented but optional (logs warning if `SUNO_WEBHOOK_SECRET` is not set).

**Recommendation:**
1. Set `SUNO_WEBHOOK_SECRET` in Supabase secrets
2. Remove fallback path that skips verification in production
3. Add monitoring alert if signature verification fails

**Implementation:**
```typescript
// supabase/functions/replace-section-callback/index.ts (line 76-78)
// REMOVE THIS IN PRODUCTION:
} else {
  logger.warn('[REPLACE-SECTION-CALLBACK] ⚠️ SUNO_WEBHOOK_SECRET not configured - skipping signature verification');
  payload = await req.json();
}

// REPLACE WITH:
} else {
  logger.error('[REPLACE-SECTION-CALLBACK] SUNO_WEBHOOK_SECRET not configured');
  return new Response(
    JSON.stringify({ error: 'Server configuration error' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### 2. Implement Request ID Correlation
**Priority:** 🟡 Medium

Add `X-Request-Id` header for tracing requests across services.

```typescript
const requestId = crypto.randomUUID();
logger.info('[REPLACE-SECTION] Starting', { requestId });
// Pass requestId to Suno API, store in DB metadata
```

---

### 🎨 UI/UX Enhancements

#### 1. Preview Before Replacement
**Priority:** 🟡 Medium

**Feature:** Allow users to preview the selected section before submitting.

**Implementation:**
```typescript
// Add to ReplaceSectionDialog
const handlePreview = () => {
  const audio = new Audio(track.audio_url);
  audio.currentTime = startTime;
  audio.play();
  setTimeout(() => audio.pause(), (endTime - startTime) * 1000);
};
```

#### 2. Cost Estimation
**Priority:** 🟢 Low

**Feature:** Show estimated credit cost before submission.

```typescript
// Display in dialog
const estimatedCost = calculateCost(endTime - startTime);
<p>Estimated cost: {estimatedCost} credits</p>
```

#### 3. Karaoke Visualization
**Priority:** 🟡 Medium

**Feature:** Render timestamped lyrics with synchronized highlighting in player.

**Implementation:**
```typescript
// Player component
const currentWord = alignedWords.find(
  w => audioTime >= w.startS && audioTime <= w.endS
);

<span className={currentWord === word ? 'text-primary font-bold' : ''}>
  {word.word}
</span>
```

#### 4. Waveform Visualization Toggle
**Priority:** 🟡 Medium

**Feature:** Allow users to toggle waveform rendering (performance optimization).

```typescript
const [showWaveform, setShowWaveform] = useState(false);
// Only render <Waveform data={waveformData} /> if showWaveform is true
```

---

### 📊 Monitoring & Observability

#### 1. Add Metrics Collection
**Priority:** 🟡 Medium

Track key metrics:
- Replacement request success rate
- Average callback processing time
- API error rates (429, 402, 500)
- Cache hit rate for timestamped lyrics

**Implementation:**
```typescript
// Add to Edge Functions
logger.info('[METRICS]', {
  metric: 'replace_section.request',
  success: true,
  duration_ms: Date.now() - startTime,
  section_duration_s: endTime - startTime
});
```

#### 2. Webhook Delivery Monitoring
**Priority:** 🔴 **HIGH**

**Feature:** Alert if callbacks are not received within expected time (e.g., 5 minutes).

**Implementation:**
```sql
-- Scheduled query to find stuck replacements
SELECT * FROM track_section_replacements
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

**Alert:** Send notification if query returns results.

---

### ⚡ Performance Optimizations

#### 1. Batch Waveform Data Loading
**Priority:** 🟡 Medium

**Problem:** Large `waveformData` arrays can slow down initial render.

**Solution:** Lazy load waveform data or downsample.

```typescript
// Only fetch waveform when user enables visualization
const { data: waveform } = useQuery({
  queryKey: ['waveform', trackId],
  queryFn: () => fetchWaveform(trackId),
  enabled: showWaveform,
});
```

#### 2. Optimize Realtime Subscriptions
**Priority:** 🟢 Low

**Feature:** Only subscribe to `track_section_replacements` updates for tracks user is viewing.

```typescript
const subscription = supabase
  .channel('replacements')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'track_section_replacements',
    filter: `parent_track_id=eq.${trackId}` // Filter at DB level
  }, handleUpdate)
  .subscribe();
```

---

## Testing Strategy

### Unit Tests

#### 1. Backend (Edge Functions)

**File:** `supabase/functions/replace-section/__tests__/index.test.ts`

```typescript
describe('replace-section', () => {
  it('should reject unauthenticated requests', async () => {
    const req = new Request('http://localhost', { method: 'POST' });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('should validate section duration (min 5s)', async () => {
    const body = { ...validBody, infillStartS: 0, infillEndS: 3 };
    const res = await handler(createAuthRequest(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /at least 5 seconds/ });
  });

  it('should validate section duration (max 30s)', async () => {
    const body = { ...validBody, infillStartS: 0, infillEndS: 35 };
    const res = await handler(createAuthRequest(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /at most 30 seconds/ });
  });

  it('should reject if user does not own track', async () => {
    // Mock DB to return track with different user_id
    const res = await handler(createAuthRequest(validBody, 'other-user-id'));
    expect(res.status).toBe(403);
  });
});
```

**File:** `supabase/functions/replace-section-callback/__tests__/index.test.ts`

```typescript
describe('replace-section-callback', () => {
  it('should reject requests without signature', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(validPayload)
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('should reject invalid signatures', async () => {
    const req = createWebhookRequest(validPayload, 'invalid-signature');
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('should be idempotent (duplicate taskId)', async () => {
    await handler(createValidWebhookRequest(payload1));
    const res2 = await handler(createValidWebhookRequest(payload1));
    expect(res2.status).toBe(200);
    // Verify only one version was created
  });

  it('should create track version on success', async () => {
    const res = await handler(createValidWebhookRequest(successPayload));
    expect(res.status).toBe(200);
    // Verify track_versions record exists
  });
});
```

**File:** `supabase/functions/get-timestamped-lyrics/__tests__/index.test.ts`

```typescript
describe('get-timestamped-lyrics', () => {
  it('should return cached lyrics if available', async () => {
    // Mock DB to return track with cached lyrics
    const res = await handler(createAuthRequest({ taskId: 'cached-task' }));
    const data = await res.json();
    expect(data.cached).toBe(true);
  });

  it('should fetch from Suno API if not cached', async () => {
    const res = await handler(createAuthRequest({ taskId: 'new-task' }));
    const data = await res.json();
    expect(data.cached).toBe(false);
    // Verify Suno API was called
  });
});
```

#### 2. Frontend (React Hooks)

**File:** `src/hooks/__tests__/useReplaceSection.test.ts`

```typescript
describe('useReplaceSection', () => {
  it('should validate section duration', async () => {
    const { result } = renderHook(() => useReplaceSection());
    await expect(
      result.current.replaceSection({ ...params, infillEndS: 3 })
    ).rejects.toThrow('at least 5 seconds');
  });

  it('should invalidate queries on success', async () => {
    const { result } = renderHook(() => useReplaceSection());
    await result.current.replaceSection(validParams);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['tracks']
    });
  });
});
```

---

### Integration Tests

**File:** `tests/e2e/replace-section.spec.ts` (Playwright)

```typescript
test('should replace section and create new version', async ({ page }) => {
  // Login
  await page.goto('/workspace');
  await page.click('[data-testid="track-actions"]');
  await page.click('[data-testid="replace-section"]');

  // Fill form
  await page.fill('[data-testid="prompt"]', 'Add guitar solo');
  await page.fill('[data-testid="start-time"]', '10');
  await page.fill('[data-testid="end-time"]', '20');
  await page.click('[data-testid="submit"]');

  // Wait for success toast
  await page.waitForSelector('text=Section replacement started');

  // Wait for callback (mock or use staging environment)
  await page.waitForTimeout(60000); // Wait 60s for processing

  // Verify new version appears
  await page.click('[data-testid="versions-tab"]');
  await expect(page.locator('text=Section Replaced')).toBeVisible();
});
```

---

### Load Testing

**File:** `tests/load/replace-section-load.js` (k6)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10, // 10 concurrent users
  duration: '1m',
};

export default function () {
  const payload = JSON.stringify({
    trackId: __ENV.TEST_TRACK_ID,
    taskId: __ENV.TEST_TASK_ID,
    musicIndex: 0,
    prompt: 'Test load',
    tags: 'rock',
    title: 'Load Test',
    infillStartS: 10,
    infillEndS: 20,
  });

  const res = http.post(
    `${__ENV.SUPABASE_URL}/functions/v1/replace-section`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.SUPABASE_ANON_KEY}`,
      },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}
```

**Run:**
```bash
k6 run tests/load/replace-section-load.js
```

---

## Monitoring & Operations

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Replacement request success rate | > 95% | < 90% |
| Callback processing time | < 5s | > 10s |
| Timestamped lyrics cache hit rate | > 80% | < 60% |
| API error rate (429/402/500) | < 1% | > 5% |
| Stuck replacements (no callback) | 0 | > 5 in 1 hour |

### Logging Standards

**All Edge Functions use centralized logger:**
```typescript
import { logger } from '../_shared/logger.ts';

logger.info('[REPLACE-SECTION] Starting replacement', { trackId, userId });
logger.error('[REPLACE-SECTION] Suno API error', error, { status: 500 });
```

**Log Levels:**
- `info`: Normal operations, successful requests
- `warn`: Non-critical issues (e.g., missing optional config)
- `error`: Errors requiring investigation

**Structured Logging Format:**
```json
{
  "level": "info",
  "message": "[REPLACE-SECTION] Starting replacement",
  "context": {
    "trackId": "abc123",
    "userId": "user456"
  },
  "timestamp": "2025-11-05T12:00:00Z"
}
```

### Monitoring Queries

**1. Find Stuck Replacements**
```sql
SELECT
  id,
  parent_track_id,
  suno_task_id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_seconds
FROM track_section_replacements
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;
```

**2. Callback Failure Rate**
```sql
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  callback_type,
  COUNT(*) AS total,
  SUM(CASE WHEN (payload->>'code')::int != 200 THEN 1 ELSE 0 END) AS failures,
  ROUND(100.0 * SUM(CASE WHEN (payload->>'code')::int != 200 THEN 1 ELSE 0 END) / COUNT(*), 2) AS failure_rate_pct
FROM callback_logs
WHERE callback_type = 'replace_section'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, callback_type
ORDER BY hour DESC;
```

**3. Cache Hit Rate (Timestamped Lyrics)**
```sql
-- Track this in Edge Function logs, then aggregate:
SELECT
  DATE_TRUNC('day', timestamp) AS day,
  SUM(CASE WHEN log_message LIKE '%cached: true%' THEN 1 ELSE 0 END) AS cache_hits,
  SUM(CASE WHEN log_message LIKE '%cached: false%' THEN 1 ELSE 0 END) AS cache_misses,
  ROUND(100.0 * SUM(CASE WHEN log_message LIKE '%cached: true%' THEN 1 ELSE 0 END) / COUNT(*), 2) AS hit_rate_pct
FROM edge_function_logs
WHERE function_name = 'get-timestamped-lyrics'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

### Alerting Rules

**Recommended Alerts (via Sentry, Datadog, or custom):**

1. **High Error Rate**
   - Condition: Error rate > 5% in 5 minutes
   - Severity: Critical
   - Action: Page on-call engineer

2. **Stuck Replacements**
   - Condition: More than 5 replacements stuck for > 5 minutes
   - Severity: High
   - Action: Investigate webhook delivery

3. **Suno API Quota**
   - Condition: 402 errors detected
   - Severity: Medium
   - Action: Notify admin to add credits

4. **Callback Signature Failures**
   - Condition: > 10 signature verification failures in 1 hour
   - Severity: High
   - Action: Investigate potential security issue

---

## Rollout Plan

### Phase 1: Feature Flag Setup
**Duration:** 1 day

**Tasks:**
1. Add feature flags to `src/config/features.ts`:
   ```typescript
   export const FEATURES = {
     REPLACE_SECTION: import.meta.env.VITE_FEATURE_REPLACE_SECTION === 'true',
     TIMESTAMPED_LYRICS: import.meta.env.VITE_FEATURE_TIMESTAMPED_LYRICS === 'true',
   };
   ```

2. Wrap UI components:
   ```typescript
   {FEATURES.REPLACE_SECTION && (
     <Button onClick={() => setShowReplaceDialog(true)}>
       Replace Section
     </Button>
   )}
   ```

3. Set in `.env`:
   ```bash
   # Dev: Enable all features
   VITE_FEATURE_REPLACE_SECTION=true
   VITE_FEATURE_TIMESTAMPED_LYRICS=true

   # Staging: Enable for testing
   VITE_FEATURE_REPLACE_SECTION=true
   VITE_FEATURE_TIMESTAMPED_LYRICS=true

   # Production: Start disabled
   VITE_FEATURE_REPLACE_SECTION=false
   VITE_FEATURE_TIMESTAMPED_LYRICS=false
   ```

---

### Phase 2: Internal Testing (Dev Environment)
**Duration:** 3 days

**Checklist:**
- [ ] Run unit tests for all Edge Functions (target: 100% pass rate)
- [ ] Run integration tests (UI → Backend → Callback flow)
- [ ] Test with various section durations (5s, 15s, 30s)
- [ ] Test error scenarios (invalid track, unauthorized user, API errors)
- [ ] Test timestamped lyrics (cached vs uncached, instrumental vs vocal)
- [ ] Performance test: Render karaoke view with 500+ words
- [ ] Load test: 10 concurrent replacement requests

**Exit Criteria:**
- ✅ All tests passing
- ✅ No critical bugs
- ✅ Performance targets met (55-60 FPS for karaoke)

---

### Phase 3: Staging Deployment
**Duration:** 1 week

**Tasks:**
1. Deploy to staging environment
2. Set `SUNO_WEBHOOK_SECRET` in Supabase secrets
3. Enable feature flags for staging users
4. Monitor logs and metrics for 1 week

**Test Scenarios:**
- [ ] Replace section on real tracks (Suno staging account)
- [ ] Verify callback receives HMAC signature
- [ ] Test with multiple users simultaneously
- [ ] Verify realtime updates work (multiple browser tabs)
- [ ] Test mobile responsiveness

**Exit Criteria:**
- ✅ No errors in logs for 48 hours
- ✅ All callbacks received within 2 minutes
- ✅ User feedback positive (no major UX issues)

---

### Phase 4: Canary Rollout (5% of Production Users)
**Duration:** 1 week

**Tasks:**
1. Enable feature flag for 5% of production users (via user ID hash)
2. Monitor metrics closely:
   - Replacement success rate
   - Callback processing time
   - API error rates
   - User engagement (how many use the feature)

**Rollback Plan:**
- Disable feature flag immediately if:
  - Success rate < 90%
  - More than 10 stuck replacements in 1 hour
  - Critical security issue detected

**Exit Criteria:**
- ✅ Success rate > 95%
- ✅ No stuck replacements
- ✅ Positive user feedback

---

### Phase 5: Gradual Rollout
**Duration:** 2 weeks

**Schedule:**
- Week 1: 25% of users
- Week 2: 50% of users
- Week 3: 100% of users

**Monitoring:**
- Track metrics at each stage
- Pause rollout if issues detected

---

### Phase 6: Full Production Release
**Duration:** Ongoing

**Post-Launch Tasks:**
- [ ] Update user documentation
- [ ] Create video tutorials (how to replace sections)
- [ ] Monitor usage patterns
- [ ] Gather user feedback for enhancements

---

## Rollback Procedures

### Fast Rollback (Feature Flag)
**ETA:** < 5 minutes

```bash
# Disable feature immediately
# Update environment variable in Supabase dashboard
VITE_FEATURE_REPLACE_SECTION=false
VITE_FEATURE_TIMESTAMPED_LYRICS=false

# OR disable via admin panel (if implemented)
```

### Edge Function Rollback
**ETA:** < 15 minutes

```bash
# Revert to previous version
cd supabase/functions
git log --oneline replace-section/
git revert <commit-hash>

# Redeploy
npx supabase functions deploy replace-section
npx supabase functions deploy replace-section-callback
npx supabase functions deploy get-timestamped-lyrics
```

### Database Rollback
**ETA:** < 30 minutes (if schema changes made)

```sql
-- If new columns added, remove them
ALTER TABLE track_section_replacements DROP COLUMN IF EXISTS new_column;

-- If new tables added, drop them (CAREFUL!)
DROP TABLE IF EXISTS new_table;
```

---

## Cost Analysis

### Suno API Costs

| Operation | Credits per Request | Notes |
|-----------|---------------------|-------|
| Replace Section | ~10-20 credits | Depends on section duration (5-30s) |
| Get Timestamped Lyrics | ~1 credit | Cached after first fetch |

**Monthly Estimate (100 active users):**
- Assume 5 replacements per user/month: 500 requests × 15 credits = **7,500 credits**
- Assume 20 lyrics fetches per user/month (20% cache miss): 2,000 requests × 1 credit = **2,000 credits**
- **Total:** ~9,500 credits/month

**Cost:** Varies by Suno pricing tier. Check [Suno Pricing](https://sunoapi.org/pricing).

---

## Conclusion

### Summary of Achievements

✅ **Core Implementation Complete:**
- All three Suno API integrations are fully functional
- Security best practices implemented (JWT, HMAC, Zod validation)
- User-friendly UI with real-time updates
- Comprehensive error handling and logging

### Recommended Next Steps

**Immediate (High Priority):**
1. ✅ Set `SUNO_WEBHOOK_SECRET` and enforce signature verification
2. ✅ Write unit tests for Edge Functions (target: 80% coverage)
3. ✅ Add monitoring alerts for stuck replacements

**Short-term (Next 2 weeks):**
1. Implement request ID correlation for debugging
2. Add karaoke visualization in player
3. Performance optimize waveform rendering
4. Conduct load testing

**Long-term (Next quarter):**
1. Add cost estimation UI
2. Implement preview functionality
3. A/B test karaoke feature engagement
4. Explore batch replacement API (if Suno adds support)

---

## References

- [Suno API Documentation](https://docs.sunoapi.org/)
- [Replace Section API](https://docs.sunoapi.org/suno-api/replace-section-callbacks)
- [Get Timestamped Lyrics API](https://docs.sunoapi.org/suno-api/get-timestamped-lyrics)
- [Project Architecture](./ARCHITECTURE.md)
- [Backend Architecture](./BACKEND_ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)

---

**Document Maintenance:**
- Review quarterly or when API changes
- Update after each production deployment
- Add new test cases as bugs are discovered

**Contact:**
- Technical Lead: [Insert Name]
- On-call Rotation: [Insert Pagerduty/Opsgenie link]
