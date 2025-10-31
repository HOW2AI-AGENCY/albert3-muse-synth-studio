# Rate Limiting System

## Overview

The Rate Limiting System protects edge functions from abuse by limiting the number of requests per user within a time window. It uses an in-memory store for fast checks without database overhead.

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client     │────────▶│ Edge Function│────────▶│  Rate Limiter│
│  (Frontend)  │  Request│              │  Check  │  (In-Memory) │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                         │
                                │ allowed = false         │
                                ▼                         │
                         ┌──────────────┐                │
                         │  429 Response│                │
                         │ + Headers    │◀────────────────┘
                         └──────────────┘
```

## Components

### 1. Rate Limiter Class (`rate-limit.ts`)

**Location**: `supabase/functions/_shared/rate-limit.ts`

**Features**:
- ✅ In-memory Map-based storage
- ✅ Automatic cleanup every 5 minutes
- ✅ Per-user, per-endpoint rate limiting
- ✅ Configurable time windows and limits
- ✅ Zero database overhead

**Implementation**:
```typescript
class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  
  check(identifier: string, config: RateLimitConfig): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  }
}

// Global instance
export const rateLimiter = new RateLimiter();
```

### 2. Rate Limit Configurations

**Predefined Configs**:
```typescript
export const rateLimitConfigs = {
  // Balance checks - 20 requests/minute
  balance: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'balance',
  },
  
  // Music generation - 10 requests/minute
  generation: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'generation',
  },
  
  // Expensive operations - 5 requests/minute
  expensive: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'expensive',
  },
  
  // Default - 30 requests/minute
  default: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'default',
  },
};
```

### 3. Helper Functions

#### checkRateLimit()
Main function for checking rate limits:
```typescript
const { allowed, headers, result } = checkRateLimit(
  userId,
  rateLimitConfigs.generation
);

if (!allowed) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { ...corsHeaders, ...headers }
  });
}
```

#### createRateLimitHeaders()
Creates standard rate limit headers:
```typescript
const headers = createRateLimitHeaders(result);
// {
//   'X-RateLimit-Limit': '10',
//   'X-RateLimit-Remaining': '7',
//   'X-RateLimit-Reset': '1730391600',
//   'Retry-After': '45'
// }
```

## Integration Examples

### Example 1: generate-mureka Edge Function

```typescript
import { checkRateLimit, rateLimitConfigs } from "../_shared/rate-limit.ts";

serve(async (req: Request): Promise<Response> => {
  // 1. Authenticate user
  const { user } = await supabaseAdmin.auth.getUser(token);
  
  // 2. Check rate limit
  const { allowed, headers: rateLimitHeaders, result } = checkRateLimit(
    user.id,
    rateLimitConfigs.generation
  );
  
  if (!allowed) {
    logger.warn('Rate limit exceeded', { 
      userId: user.id,
      limit: result.limit,
      resetAt: new Date(result.resetAt).toISOString()
    });
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Слишком много запросов. Попробуйте позже.',
        resetAt: new Date(result.resetAt).toISOString(),
        limit: result.limit,
        remaining: result.remaining,
      }),
      {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders }
      }
    );
  }
  
  // 3. Process request
  const response = await processRequest();
  
  // 4. Return with rate limit headers
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, ...rateLimitHeaders }
  });
});
```

### Example 2: get-balance Edge Function

```typescript
// Check rate limit for balance endpoint
const { allowed, headers: rateLimitHeaders } = checkRateLimit(
  userId,
  rateLimitConfigs.balance // 20 requests/minute
);

if (!allowed) {
  return new Response(
    JSON.stringify({ error: 'Too many balance checks' }),
    { 
      status: 429, 
      headers: { ...corsHeaders, ...rateLimitHeaders } 
    }
  );
}

// ... fetch balance
```

## Rate Limit Headers

All responses include standard rate limit headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in window | `10` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `7` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1730391600` |
| `Retry-After` | Seconds until retry (on 429 only) | `45` |

**Example Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1730391600

{
  "success": true,
  "data": { ... }
}
```

**429 Rate Limit Exceeded**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730391600
Retry-After: 45

{
  "error": "Rate limit exceeded",
  "message": "Слишком много запросов. Попробуйте позже.",
  "resetAt": "2025-10-31T15:30:00.000Z",
  "limit": 10,
  "remaining": 0
}
```

## Monitoring & Analytics

### Log Messages

```typescript
// Rate limit check passed
logger.info('✅ Rate limit check passed', { 
  userId, 
  remaining: 7,
  limit: 10 
});

// Rate limit exceeded
logger.warn('⚠️ Rate limit exceeded for Mureka generation', { 
  userId,
  limit: 10,
  resetAt: '2025-10-31T15:30:00.000Z'
});

// Cleanup completed
logger.debug('Rate limiter cleanup completed', { 
  entriesRemoved: 42 
});
```

### Query Rate Limit Violations

```sql
-- Get rate limit violations from logs (via Sentry/logging)
SELECT 
  timestamp,
  user_id,
  endpoint,
  limit,
  reset_at
FROM logs
WHERE message LIKE '%Rate limit exceeded%'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## Configuration Guide

### Adjusting Limits

Edit `supabase/functions/_shared/rate-limit.ts`:

```typescript
// Increase generation limit to 15/minute
generation: {
  windowMs: 60 * 1000,
  maxRequests: 15,  // Changed from 10
  keyPrefix: 'generation',
}

// Add new expensive endpoint config
stemSeparation: {
  windowMs: 60 * 1000,
  maxRequests: 3,
  keyPrefix: 'stem-separation',
}
```

### Custom Rate Limits

```typescript
// Custom rate limit for specific use case
const { allowed, headers } = checkRateLimit(
  userId,
  {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 100,
    keyPrefix: 'bulk-operation'
  }
);
```

## Best Practices

### 1. Choose Appropriate Limits

| Endpoint Type | Recommended Limit | Reason |
|---------------|-------------------|--------|
| Balance checks | 20/minute | Fast, non-critical |
| Music generation | 10/minute | Resource-intensive |
| Stem separation | 5/minute | Very expensive |
| Lyrics generation | 10/minute | Moderate cost |
| File upload | 30/minute | I/O bound |

### 2. Always Return Rate Limit Headers

```typescript
// ✅ GOOD: Include headers in all responses
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { ...corsHeaders, ...rateLimitHeaders }
});

// ❌ BAD: Missing rate limit headers
return new Response(JSON.stringify(data), {
  status: 200,
  headers: corsHeaders
});
```

### 3. Log Rate Limit Events

```typescript
// ✅ GOOD: Log with context
if (!allowed) {
  logger.warn('Rate limit exceeded', { 
    userId,
    endpoint: 'generate-mureka',
    limit: result.limit,
    resetAt: new Date(result.resetAt).toISOString()
  });
}

// ❌ BAD: No logging
if (!allowed) {
  return new Response(...);
}
```

### 4. Handle Frontend Gracefully

```typescript
// Frontend should respect rate limits
const generateMusic = async () => {
  try {
    const response = await fetch('/generate-mureka', ...);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const resetAt = response.headers.get('X-RateLimit-Reset');
      
      toast.error(`Rate limit exceeded. Try again in ${retryAfter}s`);
      
      // Disable button until reset
      setTimeout(() => {
        enableGenerateButton();
      }, parseInt(retryAfter) * 1000);
      
      return;
    }
    
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## Comparison: Old vs New System

| Feature | Old (security.ts) | New (rate-limit.ts) |
|---------|-------------------|---------------------|
| Storage | Database table `rate_limits` | In-memory Map |
| Performance | ~50ms per check | ~0.1ms per check |
| Cleanup | Manual SQL DELETE | Automatic every 5 min |
| Overhead | Database queries | Zero |
| Scalability | Limited by DB | Excellent |
| Persistence | Across restarts | Lost on restart |
| Use Case | Strict rate limiting | High-performance limiting |

**When to Use Each**:
- **New System**: Default choice for most endpoints (fast, efficient)
- **Old System**: When you need rate limits to persist across function restarts

## Troubleshooting

### Issue: Rate limit not working

**Check**:
1. Is `rateLimiter` imported correctly?
2. Is `checkRateLimit()` called before processing?
3. Are headers added to responses?

```typescript
// Debug rate limiter
const { allowed, result } = checkRateLimit(userId, config);
console.log('Rate limit check:', { 
  allowed, 
  remaining: result.remaining,
  limit: result.limit 
});
```

### Issue: Too many rate limit errors

**Solutions**:
1. Increase limits in `rateLimitConfigs`
2. Increase window size
3. Implement exponential backoff on frontend
4. Use request queuing on frontend

### Issue: Memory usage high

**Check**:
- How many unique users in 5 minutes?
- Each entry ~100 bytes
- 10,000 users = ~1MB memory

**Solutions**:
- Decrease cleanup interval
- Implement LRU cache
- Use database-backed rate limiter for high-traffic endpoints

## Future Enhancements

### Phase 1: Advanced Features
- [ ] Per-IP rate limiting (in addition to user)
- [ ] Burst allowance (allow short bursts)
- [ ] Different limits per subscription tier
- [ ] Rate limit analytics dashboard

### Phase 2: Distribution
- [ ] Redis-backed rate limiter for multi-region
- [ ] Distributed rate limiting across edge functions
- [ ] Rate limit synchronization

### Phase 3: Smart Limiting
- [ ] Adaptive rate limits based on load
- [ ] ML-based abuse detection
- [ ] Whitelist trusted users

## Related Documentation

- [Edge Functions Security](./EDGE_FUNCTIONS_SECURITY.md)
- [Performance Monitoring](./PERFORMANCE_MONITORING.md)
- [Error Handling](./ERROR_HANDLING.md)

---

**Last Updated**: 2025-10-31  
**Version**: 1.0.0  
**Status**: ✅ Implemented  
**Coverage**: 2/29 edge functions (expanding)
