# 📡 API Documentation

> Comprehensive guide to all Edge Functions and API endpoints in Albert3 Muse Synth Studio

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Edge Functions](#edge-functions)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

All API endpoints are implemented as Deno Edge Functions deployed on Lovable Cloud. They follow RESTful conventions and return JSON responses.

**Base URL**: Automatically configured via `VITE_SUPABASE_URL`

## Authentication

All endpoints require JWT authentication unless specified otherwise.

### Headers

```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "apikey": "<supabase_anon_key>"
}
```

### Getting JWT Token

```typescript
import { supabase } from "@/integrations/supabase/client";

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Edge Functions

### 1. Generate Music (Suno)

Generate music tracks using Suno AI.

**Endpoint**: `/functions/v1/generate-suno`  
**Method**: POST  
**Rate Limit**: 10 requests/minute per user  
**Auth**: Required

#### Request Body

```typescript
{
  prompt: string;           // Music description (required, 5-1000 chars)
  tags?: string;           // Genre/style tags (optional)
  title?: string;          // Track title (optional)
  make_instrumental?: boolean;  // Instrumental only (default: false)
  model_version?: string;  // Model version (default: "chirp-v3-5")
  wait_audio?: boolean;    // Wait for completion (default: false)
  continue_clip_id?: string; // Extend existing track (optional)
  continue_at?: number;    // Extension point in seconds (optional)
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  trackId: string;          // Database track ID
  sunoTaskId?: string;      // Suno task ID for polling
  message: string;
}
```

#### Response (400 Bad Request)

```typescript
{
  error: string;
  details?: string;
  code: "INVALID_INPUT" | "RATE_LIMITED" | "INSUFFICIENT_CREDITS";
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('generate-suno', {
  body: {
    prompt: "Upbeat electronic dance music with synthesizers",
    tags: "electronic, dance, synth",
    title: "Neon Nights",
    make_instrumental: false,
    model_version: "chirp-v3-5",
    wait_audio: false
  }
});
```

---

### 2. Generate Music (Mureka)

Generate music tracks using Mureka AI.

**Endpoint**: `/functions/v1/generate-mureka`  
**Method**: POST  
**Rate Limit**: 10 requests/minute per user  
**Auth**: Required

#### Request Body

```typescript
{
  prompt: string;           // Music description (required)
  tags?: string;           // Genre/style tags (optional)
  title?: string;          // Track title (optional)
  make_instrumental?: boolean;  // Instrumental only (default: false)
  duration?: number;       // Duration in seconds (default: 120)
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  trackId: string;
  murekaTaskId: string;
  message: string;
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('generate-mureka', {
  body: {
    prompt: "Calm ambient soundscape with nature elements",
    tags: "ambient, relaxing",
    duration: 180
  }
});
```

---

### 3. Generate Lyrics

Generate song lyrics using AI.

**Endpoint**: `/functions/v1/generate-lyrics`  
**Method**: POST  
**Rate Limit**: 10 requests/minute per user  
**Auth**: Required

#### Request Body

```typescript
{
  prompt: string;           // Lyrics theme/description (required)
  genre?: string;          // Music genre (optional)
  mood?: string;           // Emotional mood (optional)
  language?: string;       // Language (default: "en")
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  lyrics: string;          // Generated lyrics
  structure: {
    verses: number;
    chorus: number;
    bridge: boolean;
  };
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('generate-lyrics', {
  body: {
    prompt: "Love song about stargazing",
    genre: "pop",
    mood: "romantic",
    language: "en"
  }
});
```

---

### 4. Improve Prompt

Enhance user prompts for better music generation results.

**Endpoint**: `/functions/v1/improve-prompt`  
**Method**: POST  
**Rate Limit**: 20 requests/minute per user  
**Auth**: Required

#### Request Body

```typescript
{
  prompt: string;           // Original prompt (required)
  genre?: string;          // Target genre (optional)
  mood?: string;           // Target mood (optional)
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  improvedPrompt: string;   // Enhanced prompt
  suggestions: string[];    // Alternative variations
  tags: string[];          // Recommended tags
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('improve-prompt', {
  body: {
    prompt: "happy music",
    genre: "pop",
    mood: "energetic"
  }
});

// Response:
// {
//   improvedPrompt: "Upbeat pop track with energetic rhythm, bright synthesizers, and catchy melodies...",
//   suggestions: [...],
//   tags: ["pop", "upbeat", "energetic"]
// }
```

---

### 5. Separate Stems

Split audio tracks into individual stems (vocals, instrumental, instruments).

**Endpoint**: `/functions/v1/separate-stems`  
**Method**: POST  
**Rate Limit**: 5 requests/minute per user  
**Auth**: Required

#### Request Body

```typescript
{
  trackId: string;          // Track ID (required)
  audioId: string;          // Audio variant ID (required)
  type: "separate_vocal" | "split_stem";  // Separation type (required)
}
```

**Separation Types**:
- `separate_vocal`: Split into vocals + instrumental (2 stems)
- `split_stem`: Split into 12+ individual instrument stems

#### Response (200 OK)

```typescript
{
  success: boolean;
  taskId: string;           // Suno separation task ID
  message: string;
}
```

#### Response (Processing)

After processing completes, stems are available in the `track_stems` table:

```typescript
{
  id: string;
  track_id: string;
  stem_type: "vocals" | "instrumental" | "drums" | "bass" | "guitar" | ...;
  audio_url: string;
  metadata: {
    duration: number;
    format: string;
  };
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('separate-stems', {
  body: {
    trackId: "uuid-here",
    audioId: "audio-uuid-here",
    type: "split_stem"
  }
});
```

---

### 6. Get Provider Balance

Check remaining credits for Suno/Mureka APIs.

**Endpoint**: `/functions/v1/get-provider-balance`  
**Method**: GET  
**Rate Limit**: Unlimited  
**Auth**: Required

#### Query Parameters

```typescript
{
  provider: "suno" | "mureka";  // Provider name (required)
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  provider: string;
  balance: {
    credits: number;        // Remaining credits
    daily_limit: number;    // Daily limit
    reset_at: string;       // ISO timestamp of reset
  };
}
```

#### Example

```typescript
const { data, error } = await supabase.functions.invoke('get-provider-balance', {
  body: { provider: "suno" }
});
```

---

### 7. Archive Tracks

Move old tracks from external CDN to permanent storage.

**Endpoint**: `/functions/v1/archive-tracks`  
**Method**: POST  
**Rate Limit**: 1 request/minute (admin only)  
**Auth**: Required (admin role)

#### Request Body

```typescript
{
  limit?: number;           // Max tracks to process (default: 10)
  dryRun?: boolean;        // Preview without archiving (default: false)
}
```

#### Response (200 OK)

```typescript
{
  success: boolean;
  archived: number;         // Number of tracks archived
  failed: number;          // Number of failures
  details: Array<{
    trackId: string;
    status: "success" | "failed";
    reason?: string;
  }>;
}
```

---

### 8. Telegram Notifications

Send notifications via Telegram bot (webhook handler).

**Endpoint**: `/functions/v1/telegram-notifications`  
**Method**: POST  
**Rate Limit**: None (webhook)  
**Auth**: Not required (validates Telegram signature)

This is an internal webhook endpoint used by Telegram. Not meant for direct client calls.

---

## Rate Limiting

### Implementation

Rate limiting is enforced using an in-memory token bucket algorithm:

```typescript
import { generationRateLimiter } from "@/middleware/rateLimiter";

// In edge function
const limited = await generationRateLimiter.isRateLimited(userId);
if (limited) {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded" }),
    { status: 429 }
  );
}
```

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/generate-suno` | 10 req | 1 minute |
| `/generate-mureka` | 10 req | 1 minute |
| `/generate-lyrics` | 10 req | 1 minute |
| `/improve-prompt` | 20 req | 1 minute |
| `/separate-stems` | 5 req | 1 minute |
| `/get-provider-balance` | Unlimited | - |
| `/archive-tracks` | 1 req | 1 minute |

### Rate Limit Response

```typescript
{
  error: "Rate limit exceeded",
  code: "RATE_LIMITED",
  retryAfter: 45  // Seconds until reset
}
```

---

## Error Handling

### Standard Error Response

```typescript
{
  error: string;            // Human-readable error message
  code: string;            // Error code for programmatic handling
  details?: any;           // Additional error context
  timestamp: string;       // ISO timestamp
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Missing or invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `UNAUTHORIZED` | 401 | Invalid or missing JWT |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `PROVIDER_ERROR` | 502 | External API error |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Handling Example

```typescript
try {
  const { data, error } = await supabase.functions.invoke('generate-suno', {
    body: { prompt: "..." }
  });

  if (error) throw error;
  
  // Handle success
  console.log(data);

} catch (error: any) {
  switch (error.code) {
    case "RATE_LIMITED":
      toast.error("Too many requests. Please wait.");
      break;
    case "INSUFFICIENT_CREDITS":
      toast.error("Not enough credits. Please upgrade.");
      break;
    case "PROVIDER_ERROR":
      toast.error("AI service temporarily unavailable.");
      break;
    default:
      toast.error("An unexpected error occurred.");
  }
}
```

---

## Examples

### Complete Music Generation Flow

```typescript
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function generateTrack() {
  try {
    // 1. Improve prompt
    const { data: improvedData } = await supabase.functions.invoke('improve-prompt', {
      body: {
        prompt: "happy music",
        genre: "pop"
      }
    });

    // 2. Generate track
    const { data: trackData } = await supabase.functions.invoke('generate-suno', {
      body: {
        prompt: improvedData.improvedPrompt,
        tags: improvedData.tags.join(", "),
        title: "My Track",
        make_instrumental: false
      }
    });

    toast.success("Track generation started!");

    // 3. Poll for completion (optional)
    const trackId = trackData.trackId;
    const pollInterval = setInterval(async () => {
      const { data: track } = await supabase
        .from('tracks')
        .select('status, audio_url')
        .eq('id', trackId)
        .single();

      if (track.status === 'completed') {
        clearInterval(pollInterval);
        toast.success("Track ready!");
        
        // 4. Optionally separate stems
        await supabase.functions.invoke('separate-stems', {
          body: {
            trackId: track.id,
            audioId: track.id,
            type: "split_stem"
          }
        });
      } else if (track.status === 'failed') {
        clearInterval(pollInterval);
        toast.error("Generation failed");
      }
    }, 5000);

  } catch (error) {
    console.error('Generation failed:', error);
    toast.error("Failed to generate track");
  }
}
```

### Batch Track Processing

```typescript
async function processMultipleTracks(prompts: string[]) {
  const results = await Promise.allSettled(
    prompts.map(prompt =>
      supabase.functions.invoke('generate-suno', {
        body: { prompt }
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`Generated ${successful.length} tracks`);
  console.log(`Failed: ${failed.length}`);
}
```

---

## Best Practices

1. **Always handle errors gracefully** - Edge functions can fail for various reasons
2. **Implement retry logic** - Use exponential backoff for transient errors
3. **Monitor rate limits** - Track remaining requests and warn users
4. **Validate inputs** - Use Zod schemas before API calls
5. **Use TypeScript** - Leverage type safety for API contracts
6. **Cache responses** - Use TanStack Query for automatic caching
7. **Log errors** - Send errors to Sentry for monitoring

---

**Last Updated**: 2025-10-31  
**API Version**: 2.4.0
