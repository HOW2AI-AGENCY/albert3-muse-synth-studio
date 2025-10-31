# Fal.ai Integration Plan (Future)

## Overview

Fal.ai will serve as a **fallback provider** for AI audio analysis features when Mureka AI is unavailable or rate-limited.

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Analysis Request                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│              audio-analysis-router.ts                   │
│                                                          │
│  try {                                                   │
│    return await murekaClient.analyze(params);           │
│  } catch (murekaError) {                                │
│    logger.warn('Mureka unavailable, fallback to Fal');  │
│    return await falClient.analyze(params);              │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   ↓                 ↓
         ┌─────────────────┐  ┌──────────────┐
         │  Mureka Client  │  │  Fal Client  │
         │   (Primary)     │  │  (Fallback)  │
         └─────────────────┘  └──────────────┘
```

## Features to Support via Fal.ai

### 1. Song Recognition (Shazam-like)

**Fal.ai Endpoint**: Not yet available in standard Fal.ai API  
**Alternative**: May need to use ACRCloud or AudD API

```typescript
interface FalRecognitionRequest {
  audioUrl: string;
}

interface FalRecognitionResponse {
  title: string;
  artist: string;
  album?: string;
  confidence: number;
}
```

### 2. AI Music Description

**Fal.ai Endpoint**: Can use custom audio analysis models

```typescript
interface FalDescriptionRequest {
  audioUrl: string;
  analysisType: 'full' | 'genre' | 'mood' | 'instruments';
}

interface FalDescriptionResponse {
  genre: string;
  mood: string;
  instruments: string[];
  tempo_bpm?: number;
  energy_level?: number;
  description: string;
}
```

## Implementation Phases

### Phase 1: Infrastructure (Done)
- ✅ `describe-song` edge function (uses Mureka)
- ✅ `recognize-song` edge function (uses Mureka)
- ✅ Database tables (`song_descriptions`, `song_recognitions`)

### Phase 2: Fal.ai Client (Future)

Create `supabase/functions/_shared/fal-client.ts`:

```typescript
import { logger } from "./logger.ts";

export interface FalClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export function createFalClient(options: FalClientOptions) {
  const BASE_URL = options.baseUrl || "https://api.fal.ai";
  
  async function recognizeSong(audioUrl: string) {
    logger.info('[FAL] Recognizing song', { audioUrl });
    
    // TODO: Implement Fal.ai recognition
    throw new Error('Fal.ai recognition not yet implemented');
  }
  
  async function describeSong(audioUrl: string) {
    logger.info('[FAL] Describing song', { audioUrl });
    
    // TODO: Implement Fal.ai description
    throw new Error('Fal.ai description not yet implemented');
  }
  
  return {
    recognizeSong,
    describeSong,
  };
}
```

### Phase 3: Router Logic

Create `supabase/functions/_shared/audio-analysis-router.ts`:

```typescript
import { createMurekaClient } from "./mureka.ts";
import { createFalClient } from "./fal-client.ts";
import { logger } from "./logger.ts";

export type AnalysisProvider = 'mureka' | 'fal';

export interface AnalysisRequest {
  audioUrl: string;
  analysisType: 'recognize' | 'describe';
  preferredProvider?: AnalysisProvider;
}

export interface AnalysisResult {
  provider: AnalysisProvider;
  data: any;
  fallbackUsed: boolean;
}

export async function analyzeAudio(
  request: AnalysisRequest,
  murekaApiKey: string,
  falApiKey?: string
): Promise<AnalysisResult> {
  const { audioUrl, analysisType, preferredProvider = 'mureka' } = request;
  
  // Try Mureka first
  if (preferredProvider === 'mureka' || !falApiKey) {
    try {
      const murekaClient = createMurekaClient({ apiKey: murekaApiKey });
      
      logger.info('[ROUTER] Attempting Mureka analysis', { 
        analysisType, 
        audioUrl 
      });
      
      const data = analysisType === 'recognize'
        ? await murekaClient.recognizeSong({ url: audioUrl })
        : await murekaClient.describeSong({ url: audioUrl });
      
      return {
        provider: 'mureka',
        data,
        fallbackUsed: false,
      };
    } catch (murekaError) {
      logger.warn('[ROUTER] Mureka failed, attempting fallback to Fal.ai', {
        error: murekaError instanceof Error ? murekaError.message : String(murekaError),
        hasF alKey: !!falApiKey,
      });
      
      // If no Fal key, re-throw Mureka error
      if (!falApiKey) {
        throw murekaError;
      }
      
      // Fallback to Fal.ai
      try {
        const falClient = createFalClient({ apiKey: falApiKey });
        
        logger.info('[ROUTER] Using Fal.ai fallback', { analysisType });
        
        const data = analysisType === 'recognize'
          ? await falClient.recognizeSong(audioUrl)
          : await falClient.describeSong(audioUrl);
        
        return {
          provider: 'fal',
          data,
          fallbackUsed: true,
        };
      } catch (falError) {
        logger.error('[ROUTER] Both Mureka and Fal.ai failed', {
          murekaError: murekaError instanceof Error ? murekaError.message : String(murekaError),
          falError: falError instanceof Error ? falError.message : String(falError),
        });
        
        throw new Error(`All providers failed: Mureka (${murekaError}), Fal (${falError})`);
      }
    }
  }
  
  // Direct Fal.ai request (if explicitly requested)
  if (preferredProvider === 'fal' && falApiKey) {
    const falClient = createFalClient({ apiKey: falApiKey });
    const data = analysisType === 'recognize'
      ? await falClient.recognizeSong(audioUrl)
      : await falClient.describeSong(audioUrl);
    
    return {
      provider: 'fal',
      data,
      fallbackUsed: false,
    };
  }
  
  throw new Error('No valid provider configuration');
}
```

### Phase 4: Edge Function Updates

Update `supabase/functions/describe-song/index.ts` and `recognize-song/index.ts` to use the router:

```typescript
import { analyzeAudio } from "../_shared/audio-analysis-router.ts";

// In the edge function:
const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
const falApiKey = Deno.env.get('FAL_API_KEY'); // Optional

if (!murekaApiKey) {
  throw new Error('MUREKA_API_KEY not configured');
}

const result = await analyzeAudio(
  {
    audioUrl: trackAudioUrl,
    analysisType: 'describe', // or 'recognize'
  },
  murekaApiKey,
  falApiKey
);

logger.info(`Analysis completed using ${result.provider}`, {
  fallbackUsed: result.fallbackUsed,
});
```

## Secrets Management

### Required Secrets

1. `MUREKA_API_KEY` - ✅ Already configured
2. `FAL_API_KEY` - ❌ To be added when implementing Fal.ai

### Adding FAL_API_KEY

```bash
# Via Lovable Cloud UI
Settings -> Secrets -> Add Secret
Name: FAL_API_KEY
Value: <fal_api_key>
```

## Monitoring & Metrics

Track provider usage:

```sql
-- Add provider_used column to song_descriptions and song_recognitions
ALTER TABLE song_descriptions ADD COLUMN provider_used TEXT DEFAULT 'mureka';
ALTER TABLE song_recognitions ADD COLUMN provider_used TEXT DEFAULT 'mureka';

-- Query provider distribution
SELECT 
  provider_used,
  COUNT(*) as usage_count,
  AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_rate
FROM song_descriptions
GROUP BY provider_used;
```

## Cost Comparison

### Mureka AI
- Song Recognition: ~0.02 CNY per request
- Song Description: ~0.05 CNY per request
- **Concurrent Request Limit**: 1 (major bottleneck)

### Fal.ai
- TBD - Need to research Fal.ai pricing for audio analysis

## Testing Checklist

- [ ] Create stub Fal client that returns mock data
- [ ] Test router with Mureka success case
- [ ] Test router with Mureka failure → Fal fallback
- [ ] Test router with both providers failing
- [ ] Verify database tracking of provider usage
- [ ] Load test with concurrent requests

## References

- [Mureka AI API Docs](https://platform.mureka.ai/docs/en/quickstart.html)
- [Fal.ai Documentation](https://fal.ai/docs)
- [ACRCloud API](https://www.acrcloud.com/) - Alternative for song recognition
- [AudD API](https://audd.io/) - Another alternative for song recognition

## Notes

- Fal.ai currently focuses on image/video generation, so audio analysis may require custom model deployment
- Consider ACRCloud or AudD as dedicated song recognition providers
- Keep Mureka as primary due to existing integration and good results
- Fal.ai fallback mainly for handling Mureka rate limits (1 concurrent request)
