# SEC-001: CORS Migration Guide

**Status:** 🟡 PARTIAL - error-handler.ts fixed, 18 Edge Functions remain
**Priority:** P0 - CRITICAL
**Estimated Time:** 3-4 hours

## Problem

18 Edge Functions use unsafe CORS wildcard:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ SECURITY RISK
};
```

## Solution

Replace with whitelist-based CORS from `_shared/cors.ts`:

### Before:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ... handler logic

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

### After:
```typescript
import { createCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = createCorsHeaders(req);

  // ... handler logic

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

## Files to Fix (18 total)

### Webhook Functions (HIGH PRIORITY):
- ✅ `_shared/error-handler.ts` - FIXED
- [ ] `suno-webhook/index.ts`
- [ ] `mureka-webhook/index.ts` (if exists)

### API Functions:
- [ ] `telegram-auth/index.ts`
- [ ] `recognize-song/index.ts`
- [ ] `refresh-track-audio/index.ts`
- [ ] `describe-song/index.ts`
- [ ] `enhance-generation-prompt/index.ts`
- [ ] `create-suno-persona/index.ts`
- [ ] `ai-project-wizard/index.ts`
- [ ] `analyze-audio-flamingo/index.ts`
- [ ] `generate-project-concept/index.ts`
- [ ] `generate-minimax/index.ts`

### Prompt DJ Functions:
- [ ] `prompt-dj-stream/index.ts`
- [ ] `prompt-dj-update-prompts/index.ts`
- [ ] `prompt-dj-disconnect/index.ts`
- [ ] `prompt-dj-lyria-stream/index.ts`
- [ ] `prompt-dj-connect/index.ts`

### Utility:
- [ ] `health-check/index.ts`
- [ ] `_shared/cors_test.ts`

## Testing

After migration, test:
1. ✅ Localhost: Should allow (http://localhost:5173, :8080)
2. ❌ Random origin: Should reject
3. ✅ Production domain: Should allow (when CORS_ALLOWED_ORIGINS set)

## Environment Setup

Set in Supabase dashboard → Settings → Edge Functions → Environment Variables:

```
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://your-vercel-app.vercel.app
```

## Automated Migration Script

```bash
# Find and replace pattern (use with caution!)
find supabase/functions -name "index.ts" -exec sed -i \
  's/const corsHeaders = {[^}]*}/import { createCorsHeaders } from "..\/_shared\/cors.ts";\nconst corsHeaders = createCorsHeaders(req);/g' {} \;
```

**⚠️ Manual review required after automated script!**
