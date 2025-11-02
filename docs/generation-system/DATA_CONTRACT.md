# 🔒 Music Generation Data Contract - IMMUTABLE

⚠️ **CRITICAL**: Этот документ является контрактом между frontend, backend и провайдерами.  
НЕ ИЗМЕНЯЙТЕ без обновления ВСЕХ связанных файлов!

## Architecture Decision Records

### 1. **Schema Synchronization**: Frontend ↔ Backend ↔ Providers
- Frontend validation → `src/utils/provider-validation.ts`
- Backend types → `supabase/functions/_shared/types/generation.ts`
- Provider adapters → `src/services/providers/adapters/*.adapter.ts`

**RULE**: Эти три слоя ДОЛЖНЫ иметь идентичные интерфейсы для параметров генерации.

---

## Parameter Mapping Contract

### ✅ Base Parameters (Required by ALL providers)

| Parameter | Type | Frontend | Backend | Suno | Mureka | Validation |
|-----------|------|----------|---------|------|--------|------------|
| `prompt` | `string` | ✅ | ✅ | ✅ | ✅ (max 500 chars) | min: 3, max: 3000 |
| `provider` | `'suno' \| 'mureka'` | ✅ | ✅ | - | - | required |
| `title` | `string?` | ✅ | ✅ | ✅ | ✅ | max: 200 |
| `lyrics` | `string?` | ✅ | ✅ | ✅ | ✅ | max: 3000 |
| `styleTags` | `string[]?` | ✅ | ✅ | ✅ (as `tags`) | ✅ | max items: 20, max len: 50 |
| `hasVocals` | `boolean?` | ✅ | ✅ | ✅ | ✅ | - |
| `modelVersion` | `string?` | ✅ | ✅ | ✅ (as `model_version`) | ✅ | provider-specific |
| `idempotencyKey` | `string?` | ✅ | ✅ | ✅ | ✅ | UUID format |

### ✅ Suno-Specific Parameters

| Parameter | Type | Default | Validation | Notes |
|-----------|------|---------|------------|-------|
| `make_instrumental` | `boolean?` | `false` | - | Overrides `hasVocals` |
| `customMode` | `boolean?` | `false` | - | Enables custom lyrics |
| `negativeTags` | `string?` | - | max: 200 | Excluded styles |
| `vocalGender` | `'m' \| 'f' \| 'any'?` | `'any'` | - | Vocal gender |
| `styleWeight` | `number?` | `0.5` | 0-1 | Style influence |
| `lyricsWeight` | `number?` | `0.5` | 0-1 | Lyrics influence |
| `weirdnessConstraint` | `number?` | `0.5` | 0-1 | Creativity level |
| `audioWeight` | `number?` | `0.5` | 0-1 | Reference audio influence |
| `referenceAudioUrl` | `string?` | - | URL format | Audio reference |
| `referenceTrackId` | `string?` | - | UUID | Track reference |
| `personaId` | `string?` | - | - | Suno Persona ID |

### ✅ Mureka-Specific Parameters

| Parameter | Type | Default | Validation | Notes |
|-----------|------|---------|------------|-------|
| `isBGM` | `boolean?` | `false` | - | Background music mode |
| `referenceAudioId` | `string?` | - | - | Mureka file ID |

---

## Response Contract

### Success Response (200)
```typescript
{
  success: true,
  trackId: string,        // UUID трека в БД
  taskId: string,         // Provider task ID
  provider: 'suno' | 'mureka',
  message?: string
}
```

### Error Responses

#### 400 - Validation Error
```typescript
{
  success: false,
  error: string,
  details?: Array<{ path: string, message: string }>
}
```

#### 401 - Authentication Error
```typescript
{
  error: 'Unauthorized'
}
```

#### 429 - Rate Limit Exceeded
```typescript
{
  success: false,
  error: string,
  errorCode: 'RATE_LIMIT_EXCEEDED',
  retryAfter: number  // seconds
}
```

#### 402 - Insufficient Credits
```typescript
{
  success: false,
  error: string,
  errorCode: 'INSUFFICIENT_CREDITS'
}
```

#### 500 - Internal Error
```typescript
{
  success: false,
  error: string,
  errorCode: 'INTERNAL_ERROR'
}
```

---

## Provider-Specific Constraints

### Suno AI
- **Max prompt length**: 3000 chars
- **Max lyrics length**: 3000 chars
- **Models**: `V5`, `V4_5PLUS`, `V4_5`, `V4`, `V3_5`
- **Concurrent requests**: Unlimited (rate limited)
- **Custom mode**: Requires `styleTags` OR `lyrics`

### Mureka AI
- **Max prompt length**: 500 chars ⚠️ (truncated automatically)
- **Max lyrics length**: 3000 chars
- **Models**: `auto`, `mureka-6`, `mureka-7.5`, `mureka-o1`
- **Concurrent requests**: 1 per user (enforced in edge function)
- **BGM mode**: Requires `isBGM: true`

---

## Critical Transformation Rules

### 1. Frontend → Edge Function
**File**: `src/services/providers/adapters/*.adapter.ts`

#### Suno Adapter
```typescript
// ✅ CORRECT transformation
{
  prompt: params.prompt,
  tags: params.styleTags,  // ⚠️ styleTags → tags
  model_version: params.modelVersion || 'V5',
  make_instrumental: params.makeInstrumental,
  // ... rest
}
```

#### Mureka Adapter
```typescript
// ✅ CORRECT transformation
{
  prompt: params.prompt.slice(0, 500),  // ⚠️ Truncate to 500 chars
  styleTags: params.styleTags,  // ✅ Keep as styleTags
  hasVocals: params.hasVocals ?? !params.makeInstrumental,
  isBGM: params.isBGM,
  // ... rest
}
```

### 2. Edge Function → Provider API
**Files**: 
- `supabase/functions/generate-suno/index.ts`
- `supabase/functions/generate-mureka/index.ts`

#### Suno
```typescript
// ✅ CORRECT: tags → styleTags conversion
const params: SunoGenerationParams = {
  styleTags: body.tags,  // ⚠️ tags → styleTags
  modelVersion: body.model_version,  // ⚠️ snake_case → camelCase
  // ...
}
```

#### Mureka
```typescript
// ✅ CORRECT: Direct mapping
const params: MurekaGenerationParams = {
  prompt: validatedPrompt,  // ⚠️ Truncated to 500 chars
  styleTags: body.styleTags,
  // ...
}
```

---

## Validation Checklist

Before ANY changes to generation system:

### Frontend Changes
- [ ] Update `src/utils/provider-validation.ts` schemas
- [ ] Update `src/services/providers/types.ts` interfaces
- [ ] Update provider adapters (`suno.adapter.ts`, `mureka.adapter.ts`)
- [ ] Verify parameter transformations in `transformTo*Format()` methods

### Backend Changes
- [ ] Update `supabase/functions/_shared/types/generation.ts`
- [ ] Update Zod schemas in `supabase/functions/_shared/zod-schemas.ts`
- [ ] Update edge function entry points (`index.ts`)
- [ ] Verify parameter mapping in edge functions

### Cross-Layer Validation
- [ ] Run validation script: `bash scripts/validate-generation-contract.sh`
- [ ] Check test coverage: `npm run test src/services/generation`
- [ ] Verify end-to-end flow on `/workspace/generate` route

---

## Known Issues & Gotchas

### ⚠️ Issue #1: `styleTags` vs `tags` inconsistency
**Problem**: Frontend uses `styleTags[]`, Suno edge function expects `tags[]`  
**Solution**: Transformation in `suno.adapter.ts` line 195:
```typescript
tags: sanitizedTags,  // styleTags → tags
```

### ⚠️ Issue #2: Mureka prompt truncation
**Problem**: Mureka API has 500-char limit, frontend allows 3000  
**Solution**: Automatic truncation in `generate-mureka/index.ts` lines 151-173  
**Status**: ✅ Fixed

### ⚠️ Issue #3: `hasVocals` vs `makeInstrumental` conflict
**Problem**: Two boolean flags with opposite meanings  
**Solution**: Priority logic in adapters:
```typescript
const makeInstrumental = 
  params.makeInstrumental ?? (params.hasVocals === false);
```

---

## Testing Requirements

### Unit Tests Required
1. ✅ `src/services/generation/__tests__/generate-mureka.test.ts`
   - Validates `styleTags` and `modelVersion` passing
   
2. TODO: `src/services/providers/adapters/__tests__/suno.adapter.test.ts`
   - Test `styleTags → tags` transformation
   - Test weight clamping (0-1)
   
3. TODO: `src/services/providers/adapters/__tests__/mureka.adapter.test.ts`
   - Test prompt truncation
   - Test `hasVocals` resolution

### Integration Tests Required
1. TODO: `tests/e2e/music-generation.spec.ts`
   - Test full Suno generation flow
   - Test full Mureka generation flow
   - Test error handling (429, 402, 500)

---

## Monitoring & Observability

### Required Logs
- ✅ `[GENERATION START]` - Generation initiation
- ✅ `[STEP N]` - Each validation/processing step
- ✅ `[GENERATION SUCCESS]` - Successful completion
- ✅ `❌ [GENERATION FAILED]` - Error with full context

### Required Metrics
- Generation success rate per provider
- Average generation time
- Error rate by error code
- Rate limit hits

---

**Last Updated**: 2025-11-02  
**Version**: 1.0.0  
**Maintainer**: Albert3 Team
