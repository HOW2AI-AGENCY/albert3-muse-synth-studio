# Structured Logging Guide for Albert3 Muse Synth Studio

**Version**: 1.0.0  
**Date**: 2025-11-01  
**Status**: Active

---

## 📋 Overview

This project uses **structured logging** for all frontend and backend code to ensure:
- Consistent log format across all components
- Easy parsing and searching in production logs
- Automatic Sentry integration for errors
- Better debugging experience

**Key Principle**: ❌ **Never use `console.log/error/warn` directly** → ✅ **Always use `logger.*`**

---

## 🎯 Quick Start

### Frontend (React Components)

```typescript
import { logger } from '@/utils/logger';

// ✅ Correct
logger.info('User logged in', 'Auth', { userId: user.id });
logger.warn('Slow API response', 'API', { endpoint: '/tracks', duration: 2500 });
logger.error('Failed to load tracks', new Error('Network error'), 'Tracks', { attempt: 3 });

// ❌ Wrong
console.log('User logged in');
console.error('Failed to load tracks');
```

### Backend (Edge Functions)

```typescript
import { logger } from "../_shared/logger.ts";

// ✅ Correct
logger.info('✅ Track created', { trackId, userId });
logger.warn('Slow operation detected', { operation: 'generate', duration: 2000 });
logger.error('Generation failed', { error: error.message, trackId });

// ❌ Wrong
console.log('Track created');
console.error('Generation failed');
```

---

## 📚 Logger API Reference

### Frontend Logger (`src/utils/logger.ts`)

```typescript
export class Logger {
  constructor(context?: string);
  
  info(message: string, context?: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  error(message: string, error: Error, context?: string, meta?: Record<string, unknown>): void;
  debug(message: string, context?: string, meta?: Record<string, unknown>): void;
}
```

**Helper Functions:**

```typescript
export const logInfo = (message: string, context: string, meta?: Record<string, unknown>): void;
export const logWarn = (message: string, context: string, meta?: Record<string, unknown>): void;
export const logError = (message: string, error: Error, context: string, meta?: Record<string, unknown>): void;
```

**Example:**

```typescript
const logger = new Logger('MusicGenerator');

logger.info('Generation started', undefined, { 
  trackId: '123', 
  provider: 'suno' 
});

// Or use helper
logInfo('Generation started', 'MusicGenerator', { trackId: '123' });
```

---

### Backend Logger (`supabase/functions/_shared/logger.ts`)

```typescript
export const logger = {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
};
```

**Example:**

```typescript
import { logger } from "../_shared/logger.ts";

logger.info('✅ [SUNO] Track completed', {
  trackId: '05b8fddb-0567-4fa4-b923-6b8347631f81',
  hasAudioUrl: true,
  duration: 1094,
});

logger.error('❌ [SUNO] Generation failed', {
  error: error.message,
  trackId: '123',
  attempt: 3,
});
```

**Output Format:**

```json
{
  "timestamp": "2025-11-01T17:57:12.833Z",
  "level": "info",
  "message": "✅ [SUNO] Track completed",
  "context": {
    "trackId": "05b8fddb-0567-4fa4-b923-6b8347631f81",
    "hasAudioUrl": true,
    "duration": 1094
  }
}
```

---

## 🎨 Best Practices

### 1. Use Descriptive Messages

```typescript
// ✅ Good
logger.info('✅ Track generated successfully', { trackId, duration: 93.96 });

// ❌ Bad
logger.info('Success');
```

### 2. Include Relevant Context

```typescript
// ✅ Good
logger.error('Failed to upload audio', new Error('Network timeout'), 'Upload', {
  trackId: '123',
  attempt: 3,
  fileSize: 5242880,
});

// ❌ Bad
logger.error('Upload failed', new Error('Error'));
```

### 3. Use Emojis for Visual Clarity (Backend Only)

```typescript
// ✅ Good (Backend)
logger.info('✅ [SUNO] Track completed', { ... });
logger.warn('⚠️ [SUNO] Slow operation', { ... });
logger.error('❌ [SUNO] Generation failed', { ... });

// ❌ Wrong (Frontend - no emojis needed)
logger.info('✅ Track completed', ...);
```

### 4. Avoid Logging Sensitive Data

```typescript
// ✅ Good
logger.info('User authenticated', { userId: user.id });

// ❌ Bad
logger.info('User authenticated', { 
  userId: user.id, 
  password: user.password,  // ❌ Never log passwords!
  apiKey: SUNO_API_KEY,     // ❌ Never log API keys!
});
```

---

## 🔍 Log Levels Guide

### `logger.info()` - Normal Operations

Use for successful operations, state changes, and important milestones.

```typescript
logger.info('✅ Track created', { trackId, userId });
logger.info('🎵 Starting Suno generation', { trackId, provider: 'suno' });
logger.info('📥 Audio download complete', { trackId, fileSize });
```

### `logger.warn()` - Warning Conditions

Use for recoverable errors, slow operations, or deprecated features.

```typescript
logger.warn('⚠️ Slow operation detected', { 
  operation: 'generate', 
  duration: 2500,  // > 1000ms threshold
});

logger.warn('Cache miss', { key: 'balance:suno:user123' });
logger.warn('Rate limit approaching', { remaining: 2, total: 10 });
```

### `logger.error()` - Error Conditions

Use for failures, exceptions, and critical errors.

```typescript
logger.error('❌ Generation failed', {
  error: error.message,
  trackId: '123',
  provider: 'suno',
  attempt: 3,
});

logger.error('Database query failed', {
  query: 'SELECT * FROM tracks',
  error: error.message,
});
```

### `logger.debug()` - Debug Information

Use for detailed debugging information (only in development).

```typescript
logger.debug('Cache hit', { key: 'balance:suno:user123', ttl: 300 });
logger.debug('API request', { 
  endpoint: '/api/v1/generate', 
  payload: { ... } 
});
```

---

## 🚫 Common Mistakes

### ❌ Using console.* directly

```typescript
// ❌ Wrong
console.log('Track created');
console.error('Failed:', error);
console.warn('Slow operation');

// ✅ Correct
logger.info('Track created', { trackId });
logger.error('Failed to create track', error, 'Tracks', { trackId });
logger.warn('Slow operation', { duration: 2000 });
```

### ❌ Not including context

```typescript
// ❌ Wrong
logger.info('Track updated');

// ✅ Correct
logger.info('Track updated', { trackId, status: 'completed' });
```

### ❌ Logging errors without Error object (Frontend)

```typescript
// ❌ Wrong
logger.error('Upload failed');

// ✅ Correct
logger.error('Upload failed', new Error('Network timeout'), 'Upload', { trackId });
```

---

## 🔗 Sentry Integration

**Automatic Sentry capture** for errors and warnings:

```typescript
// Frontend (src/utils/logger.ts)
logger.error('Track generation failed', error, 'Generator', { trackId });
// → Automatically sends to Sentry with context

// Backend (supabase/functions/_shared/logger.ts)
logger.error('Generation failed', { error: error.message, trackId });
// → Sends to Sentry via sentry-edge.ts
```

**Sentry Context:**

```typescript
// Errors automatically include:
{
  "message": "Track generation failed",
  "level": "error",
  "contexts": {
    "logger": {
      "context": "Generator",
      "meta": { "trackId": "123" }
    }
  },
  "exception": {
    "type": "Error",
    "value": "Network timeout",
    "stacktrace": { ... }
  }
}
```

---

## 🛠️ ESLint Configuration

**Enforcing structured logging:**

```json
// .eslintrc.cjs
{
  "rules": {
    "no-console": ["error", { 
      "allow": [] 
    }]
  }
}
```

**Exceptions:**
- `supabase/functions/_shared/logger.ts` - intentional console.* usage
- `supabase/functions/_shared/sentry-edge.ts` - fallback logging
- Example code in comments (documentation)

---

## 📊 Viewing Logs

### Development

```bash
# Frontend logs (browser console)
[MusicGenerator] ℹ️ Generation started { trackId: '123', provider: 'suno' }

# Backend logs (Supabase Dashboard → Edge Functions → Logs)
{"timestamp":"2025-11-01T17:57:12.833Z","level":"info","message":"✅ Track completed","context":{...}}
```

### Production

**Supabase Edge Function Logs:**
1. Go to Supabase Dashboard
2. Select "Edge Functions"
3. Click on function name
4. View "Logs" tab
5. Search by level, message, or context

**Sentry Dashboard:**
1. Go to Sentry.io
2. Select "albert3-muse-synth-studio" project
3. View "Issues" for errors
4. View "Performance" for slow operations

---

## 🎯 Migration Guide

### Replacing console.log

**Before:**

```typescript
console.log('User logged in:', user.id);
console.error('Failed to load:', error);
console.warn('Slow response:', duration);
```

**After:**

```typescript
import { logger } from '@/utils/logger';

logger.info('User logged in', 'Auth', { userId: user.id });
logger.error('Failed to load tracks', error, 'Tracks');
logger.warn('Slow API response', 'API', { duration });
```

### Edge Functions Migration

**Before:**

```typescript
console.log('[SUNO] Track created:', trackId);
console.error('[SUNO] Generation failed:', error);
```

**After:**

```typescript
import { logger } from "../_shared/logger.ts";

logger.info('✅ [SUNO] Track created', { trackId });
logger.error('❌ [SUNO] Generation failed', { error: error.message, trackId });
```

---

## 📝 Examples

### React Component

```typescript
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

export const TrackGenerator = () => {
  useEffect(() => {
    logger.info('Component mounted', 'TrackGenerator');
    
    return () => {
      logger.info('Component unmounted', 'TrackGenerator');
    };
  }, []);

  const handleGenerate = async () => {
    try {
      logger.info('Starting generation', 'TrackGenerator', { 
        provider: 'suno' 
      });
      
      const result = await generateTrack();
      
      logger.info('Generation successful', 'TrackGenerator', { 
        trackId: result.id,
        duration: result.duration 
      });
    } catch (error) {
      logger.error(
        'Generation failed', 
        error as Error, 
        'TrackGenerator', 
        { provider: 'suno' }
      );
    }
  };

  return <button onClick={handleGenerate}>Generate</button>;
};
```

### Edge Function

```typescript
import { logger } from "../_shared/logger.ts";

export async function generateTrack(params: GenerationParams) {
  const startTime = Date.now();
  
  logger.info('🎵 Starting generation', {
    userId: params.userId,
    provider: params.provider,
  });

  try {
    const result = await callProviderAPI(params);
    
    const duration = Date.now() - startTime;
    
    logger.info('✅ Generation complete', {
      trackId: result.trackId,
      duration,
      provider: params.provider,
    });
    
    if (duration > 1000) {
      logger.warn('⚠️ Slow operation', {
        operation: 'generate',
        duration,
        threshold: 1000,
      });
    }
    
    return result;
  } catch (error) {
    logger.error('❌ Generation failed', {
      error: error.message,
      userId: params.userId,
      provider: params.provider,
    });
    
    throw error;
  }
}
```

---

## 🔗 Related Documents

- [Development Plan](../DEVELOPMENT_PLAN.md)
- [Week 1 Phase 1.3 Report](../reports/WEEK_1_PHASE_1.3_REPORT.md)
- [Sentry Configuration](../utils/sentry.ts)
- [Logger Implementation](../utils/logger.ts)

---

**Last Updated**: 2025-11-01  
**Maintained By**: Development Team  
**Questions?** Check Sentry docs or ask in team chat
