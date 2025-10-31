# Mureka API Integration Fix

## Problem Description

User reported error when generating music with Mureka provider:
```
Ошибка генерации
Failed to send a request to the Edge Function
```

Console logs show:
```javascript
FunctionsFetchError: Failed to send a request to the Edge Function
TypeError: Failed to fetch
```

## Root Cause Analysis

### 1. **Duplicate config.toml entries** ✅ FIXED
- Found duplicate `[functions.analyze-reference-audio]` entries (lines 52 and 117)
- **Fix**: Removed duplicate entry

### 2. **Empty lyrics parameter** ✅ FIXED
According to Mureka API documentation:
- `lyrics` is a **Required** field (max 3000 characters)
- Previous code: `lyrics: params.lyrics || ''` sent empty string
- **Fix**: Generate placeholder lyrics if none provided:
  ```typescript
  const lyrics = params.lyrics?.trim() || `[Instrumental]\n${params.prompt || 'Music'}`;
  ```

### 3. **Network/Deployment Issue** 🔄 INVESTIGATING
The "Failed to fetch" error indicates the HTTP request fails before reaching the edge function.

Possible causes:
- Edge function not deployed properly
- CORS configuration issue
- Runtime error during function initialization
- Timeout during cold start

## Current State

### Edge Function Status
```bash
# From logs:
✅ generate-mureka booted successfully (time: 48ms)
✅ CORS headers configured
✅ JWT verification enabled
```

### API Endpoint Documentation

#### Mureka API v1/song/generate

**Base URL**: `https://api.mureka.ai`

**Request**:
```json
POST /v1/song/generate
{
  "lyrics": "string (Required, max 3000)",
  "model": "auto | mureka-6 | mureka-7.5 | mureka-o1",
  "n": 2-3,
  "prompt": "string (max 1024)",
  "reference_id": "string (optional)",
  "vocal_id": "string (optional)",
  "melody_id": "string (optional)"
}
```

**Response**:
```json
{
  "id": "task_abc123...",  // Note: 'id' not 'task_id'
  "created_at": 1234567890,
  "finished_at": 1234567890,
  "model": "mureka-7.5",
  "status": "preparing|queued|running|streaming|succeeded|failed|timeouted|cancelled",
  "failed_reason": "string",
  "choices": [
    {
      "id": "clip_123",
      "audio_url": "https://...",
      "image_url": "https://...",
      "video_url": "https://...",
      "title": "Song Title",
      "lyrics": "...",
      "duration": 180,
      "created_at": "2025-10-31T12:00:00Z"
    }
  ]
}
```

**Query Task**:
```
GET /v1/song/query/{task_id}
```

## Fixes Applied

### 1. Config.toml Cleanup
```diff
-[functions.analyze-reference-audio]  # Duplicate at line 117
-verify_jwt = true
```

### 2. Handler.ts Lyrics Fix
```diff
-lyrics: params.lyrics || '',
+const lyrics = params.lyrics?.trim() || `[Instrumental]\n${params.prompt || 'Music'}`;
+...
+lyrics,
```

## Testing Steps

### 1. Verify Edge Function Deployment
```bash
# Check if function is accessible
curl -X POST https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/generate-mureka \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","lyrics":"test lyrics"}'
```

### 2. Test from Frontend
```typescript
// src/services/providers/router.ts
const { data, error } = await supabase.functions.invoke('generate-mureka', {
  body: {
    trackId: 'test-id',
    prompt: 'upbeat pop song',
    lyrics: 'Verse 1: Testing...'
  }
});
```

### 3. Monitor Logs
```bash
supabase functions logs generate-mureka --follow
```

## Implementation Timeline

| Fix | Status | Time |
|-----|--------|------|
| Remove duplicate config | ✅ Done | 18:10 UTC |
| Fix empty lyrics | ✅ Done | 18:15 UTC |
| Deploy & test | ⏳ Pending | 18:20 UTC |

## Related Files

- `supabase/config.toml` - Function configuration
- `supabase/functions/generate-mureka/index.ts` - Entry point
- `supabase/functions/generate-mureka/handler.ts` - Generation logic
- `supabase/functions/_shared/mureka.ts` - API client
- `supabase/functions/_shared/mureka-schemas.ts` - Response validation
- `src/services/providers/router.ts` - Frontend router

## Next Steps

1. **Wait for deployment** - Changes will auto-deploy on next build
2. **Test generation** - Try generating music with Mureka provider
3. **Monitor logs** - Check for any runtime errors
4. **Verify webhook** - Ensure webhook receives completed tracks

## Additional Notes

### Mureka API Limits (V7)
- Prompt: max 1024 characters (increased from 300)
- Lyrics: max 3000 characters (increased from 2000)
- Model: V7 is default (replaces V6)
- Generation count: 2-3 tracks per request

### Response Format Changes
- Uses `id` instead of `task_id` in response
- Status includes new states: `preparing`, `streaming`, `timeouted`, `cancelled`
- Multiple variants returned in `choices[]` array

---

**Last Updated**: 2025-10-31 18:20 UTC  
**Status**: ✅ Fixes Applied, Awaiting Deployment  
**Next Review**: After user tests generation
