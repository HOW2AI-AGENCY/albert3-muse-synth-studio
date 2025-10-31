# 🔄 Force Generation Feature

## Overview

The **Force Generation** feature allows users to bypass the automatic deduplication system and create a new track even when identical parameters have been used recently.

## Background: Deduplication System

### How It Works

By default, the system implements intelligent request deduplication to:
- **Save credits** by reusing recently generated tracks
- **Reduce API load** on external providers (Suno, Mureka)
- **Improve response times** by returning cached results instantly

When a user submits a generation request, the system:
1. Creates a **hash** from the request parameters (prompt, lyrics, tags, provider, model)
2. Checks if an **identical request** was made in the last **30 minutes**
3. If found, returns the **existing track ID** instead of generating a new one

```typescript
// Example hash creation
{
  prompt: "upbeat electronic dance music",
  lyrics: "verse 1 lyrics...",
  tags: ["electronic", "dance"],
  provider: "mureka",
  hasVocals: true,
  model: "auto"
}
// → Hash: "a1b2c3d4e5f6..."
```

### Benefits

✅ **Cost Savings**: Users don't waste credits on duplicate generations  
✅ **Faster Results**: Cached tracks are returned instantly  
✅ **Provider-Friendly**: Reduces load on external AI services  

### Limitations

❌ Users might want a **new variation** with the same parameters  
❌ First attempt might have failed/had issues  
❌ User wants to compare multiple generations  

## Force Generation Solution

### Implementation

The `forceNew` flag was added to `GenerationRequest`:

```typescript
export interface GenerationRequest {
  // Basic params
  title?: string;
  prompt: string;
  provider: import('@/config/provider-models').MusicProvider;
  
  // Music params
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  makeInstrumental?: boolean;
  
  // Advanced params
  modelVersion?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | 'any';
  
  // Audio reference
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  audioWeight?: number;
  
  // Weights & constraints
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;
  
  // Optional
  customMode?: boolean;
  isBGM?: boolean;
  idempotencyKey?: string;
  
  // ✅ Force new generation (skip cache)
  forceNew?: boolean;
}
```

### Usage

#### In Code

```typescript
// Standard generation (uses cache)
await GenerationService.generate({
  prompt: "energetic rock song",
  provider: "suno",
  lyrics: "verse 1..."
});

// Force new generation (bypasses cache)
await GenerationService.generate({
  prompt: "energetic rock song",
  provider: "suno",
  lyrics: "verse 1...",
  forceNew: true  // ✅ New parameter
});
```

#### In UI

When a cached track is detected, users see:

```
⚡ Трек найден!
Используется ранее созданный трек с такими же параметрами.

[Открыть трек]  [Создать новый вместо этого]
```

Clicking "Создать новый вместо этого" retries generation with `forceNew: true`.

## Technical Details

### Cache Check Logic

```typescript
function checkDuplicateRequest(request: GenerationRequest): string | null {
  // ✅ Skip cache if forceNew flag is set
  if (request.forceNew) {
    logger.info('Skipping duplicate check - forceNew flag enabled');
    return null;
  }
  
  const hash = generateRequestHash(request);
  const cached = requestCache.get(hash);
  
  if (cached && Date.now() - cached.timestamp < REQUEST_CACHE_TTL) {
    return cached.trackId; // Return existing track
  }
  
  return null; // No duplicate found
}
```

### Cache Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `REQUEST_CACHE_SIZE` | 10 | Maximum cached requests |
| `REQUEST_CACHE_TTL` | 30 minutes | Cache expiration time |

### Hash Generation

The system creates a UTF-8 safe hash using:

```typescript
function generateRequestHash(request: GenerationRequest): string {
  const normalized = JSON.stringify({
    prompt: request.prompt.trim().toLowerCase(),
    lyrics: request.lyrics?.trim().toLowerCase() || '',
    tags: [...(request.styleTags || [])].sort().join(','),
    provider: request.provider,
    hasVocals: request.hasVocals ?? true,
    model: request.modelVersion || 'default',
  });
  
  // UTF-8 safe encoding (supports Cyrillic)
  const utf8Bytes = new TextEncoder().encode(normalized);
  const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString).substring(0, 32);
}
```

## User Experience

### Standard Flow

```mermaid
graph TD
    A[User submits generation] --> B{Check cache}
    B -->|Found| C[Return cached track]
    B -->|Not found| D[Generate new track]
    C --> E[Show toast: "⚡ Трек найден!"]
    D --> F[Show toast: "🎵 Генерация началась!"]
```

### Force Generation Flow

```mermaid
graph TD
    A[User clicks "Создать новый"] --> B[Set forceNew: true]
    B --> C[Skip cache check]
    C --> D[Generate new track]
    D --> E[Show toast: "🎵 Генерация началась!"]
```

## Monitoring & Logging

### Logs

```typescript
// When cache is bypassed
logger.info('Skipping duplicate check - forceNew flag enabled', 'GenerationService');

// When cache hit occurs
logger.info('Duplicate request detected', 'GenerationService', { 
  hash, 
  cachedTrackId: cached.trackId,
  age: Math.floor((Date.now() - cached.timestamp) / 1000),
});
```

### Metrics

Track the following metrics:
- **Cache hit rate**: % of requests returning cached tracks
- **Force generation usage**: How often users bypass cache
- **Credit savings**: Credits saved through deduplication

## Best Practices

### For Users

✅ **Use cached tracks when possible** to save credits  
✅ **Force new generation** when you want variation or comparison  
✅ **Check Library** before forcing new generation  

### For Developers

✅ **Log all cache operations** for debugging  
✅ **Monitor cache hit rate** to optimize TTL  
✅ **Clear cache** when prompts or parameters change significantly  
✅ **Test force generation** in different scenarios  

## Future Improvements

- [ ] Add UI toggle in generation form ("Always create new")
- [ ] Show cache age in banner ("Created 5 minutes ago")
- [ ] Allow cache invalidation per track
- [ ] Implement per-user cache settings
- [ ] Add analytics dashboard for cache metrics

## Related Files

- `src/services/generation/GenerationService.ts` - Main service logic
- `src/hooks/useGenerateMusic.ts` - Generation hook with toast handling
- `src/components/generation/CachedTrackBanner.tsx` - UI component
- `docs/features/FORCE_GENERATION.md` - This documentation

---

**Last Updated**: 2025-10-31  
**Feature Version**: 1.0.0  
**Status**: ✅ Production Ready
