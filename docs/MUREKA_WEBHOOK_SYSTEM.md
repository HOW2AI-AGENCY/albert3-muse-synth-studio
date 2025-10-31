# Mureka Webhook System

## Overview

The Mureka Webhook System allows the application to receive real-time updates from Mureka AI when music generation tasks complete, eliminating the need for polling.

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│ generate-    │────────▶│  Mureka API  │
│              │         │   mureka     │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                         │
                                │                         │
                                ▼                         │
                         ┌──────────────┐                │
                         │  Database    │                │
                         │ (tracks)     │                │
                         └──────────────┘                │
                                ▲                         │
                                │                         │
                                │    Webhook Callback     │
                         ┌──────────────┐◀────────────────┘
                         │  mureka-     │
                         │  webhook     │
                         └──────────────┘
```

## Components

### 1. Edge Function: `mureka-webhook`

**Location**: `supabase/functions/mureka-webhook/index.ts`

**Purpose**: Receives and processes webhook callbacks from Mureka API.

**Features**:
- ✅ Validates webhook payload structure
- ✅ Updates track status in database
- ✅ Stores audio/video URLs
- ✅ Handles multiple track variants
- ✅ Logs all operations for debugging
- ✅ No JWT verification (external service)

**Webhook Payload Schema**:
```typescript
{
  code: number,           // 200 = success
  msg: string,            // Status message
  data: {
    task_id: string,      // Mureka task ID
    status: 'pending' | 'processing' | 'completed' | 'failed',
    clips?: [{           // Array of generated tracks
      id: string,        // Clip ID
      audio_url: string, // Audio file URL
      image_url?: string,// Cover image URL
      video_url?: string,// Video URL
      title: string,     // Track title
      lyrics?: string,   // Track lyrics
      duration: number,  // Duration in seconds
      created_at: string,// ISO timestamp
      metadata?: object  // Additional data
    }],
    error?: string       // Error message if failed
  }
}
```

### 2. Configuration

**File**: `supabase/config.toml`

```toml
[functions.mureka-webhook]
verify_jwt = false  # No JWT verification for external webhooks
```

### 3. Database Schema

The webhook updates the `tracks` table:

```sql
UPDATE tracks SET
  status = 'completed',        -- Update status
  audio_url = clip.audio_url,  -- Store audio URL
  cover_url = clip.image_url,  -- Store cover URL
  video_url = clip.video_url,  -- Store video URL
  duration = clip.duration,    -- Store duration
  lyrics = clip.lyrics,        -- Store lyrics
  metadata = jsonb_set(...)    -- Update metadata
WHERE suno_id = task_id;       -- Match by Mureka task ID
```

**Note**: We reuse the `suno_id` field to store Mureka's `task_id` for consistency.

## Workflow

### 1. Track Creation
```typescript
// Frontend calls generate-mureka
const { data } = await supabase.functions.invoke('generate-mureka', {
  body: { prompt, lyrics, ... }
});

// Track created with status: 'processing'
// suno_id field stores Mureka task_id
```

### 2. Generation in Progress
```typescript
// Mureka API processes the generation
// No polling needed from frontend
```

### 3. Webhook Callback
```typescript
// Mureka sends POST request to:
// https://[project].supabase.co/functions/v1/mureka-webhook

{
  code: 200,
  msg: "success",
  data: {
    task_id: "abc123...",
    status: "completed",
    clips: [{
      audio_url: "https://...",
      duration: 180,
      ...
    }]
  }
}
```

### 4. Database Update
```typescript
// mureka-webhook updates track:
// - status: 'processing' → 'completed'
// - audio_url, cover_url, video_url populated
// - duration set
// - metadata updated with webhook timestamp
```

### 5. Frontend Notification
```typescript
// Frontend listens to realtime updates
supabase
  .channel('tracks')
  .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'tracks' },
      (payload) => {
        // Track updated! Show notification
      })
  .subscribe();
```

## Multiple Variants Handling

If Mureka returns multiple clips (variants), the webhook:

1. **First clip** → Updates main track record
2. **Additional clips** → Stored in `track_versions` table

```typescript
// Example: 2 variants generated
clips: [
  { id: "clip1", audio_url: "url1", ... }, // → Main track
  { id: "clip2", audio_url: "url2", ... }  // → track_versions (version 2)
]
```

## Error Handling

### Track Not Found
```typescript
// Webhook acknowledges but logs warning
// Returns 200 to prevent Mureka retries
{
  success: false,
  message: "Track not found but webhook acknowledged"
}
```

### Generation Failed
```typescript
// Updates track status to 'failed'
// Stores error message in metadata
{
  status: 'failed',
  metadata: {
    error_message: "Generation failed",
    webhook_received_at: "2025-10-31T..."
  }
}
```

## Testing

### Manual Webhook Test
```bash
curl -X POST https://[project].supabase.co/functions/v1/mureka-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "code": 200,
    "msg": "success",
    "data": {
      "task_id": "test-task-123",
      "status": "completed",
      "clips": [{
        "id": "clip-1",
        "audio_url": "https://example.com/audio.mp3",
        "image_url": "https://example.com/cover.jpg",
        "title": "Test Track",
        "duration": 180,
        "created_at": "2025-10-31T12:00:00Z"
      }]
    }
  }'
```

### Check Logs
```bash
# View webhook processing logs
supabase functions logs mureka-webhook
```

## Monitoring

### Key Metrics
- **Webhook Receive Rate**: Webhooks received per minute
- **Processing Duration**: Time to update database
- **Error Rate**: Failed webhook processing
- **Track Not Found Rate**: Webhooks for non-existent tracks

### Logs Structure
```typescript
// Success
"✅ [MUREKA-WEBHOOK] Webhook processed"
{ taskId, trackId, status, duration }

// Warning
"⚠️ [MUREKA-WEBHOOK] Track marked as failed"
{ trackId, error }

// Error
"🔴 [MUREKA-WEBHOOK] Processing error"
{ error, duration }
```

## Security Considerations

### Why No JWT Verification?
- Webhooks come from external Mureka service
- Mureka doesn't have our JWT tokens
- Security through obscurity (unpredictable URL)

### Future Improvements
1. **Webhook Signature**: Verify HMAC signature from Mureka
2. **IP Whitelist**: Only accept webhooks from Mureka IPs
3. **Rate Limiting**: Prevent webhook spam
4. **Idempotency**: Handle duplicate webhooks gracefully

## Integration with Frontend

### Realtime Updates
```typescript
// Listen for track updates
const trackChannel = supabase
  .channel('track-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tracks',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      toast.success('🎵 Track ready!');
      // Update UI with audio_url
    }
  })
  .subscribe();
```

### Manual Polling Fallback
```typescript
// If realtime not working, poll every 5 seconds
const pollTrack = async (trackId: string) => {
  const { data } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .single();
    
  if (data.status === 'completed') {
    // Track ready!
  }
};
```

## Advantages Over Polling

| Feature | Polling | Webhooks |
|---------|---------|----------|
| Latency | 5-30s | <1s |
| Server Load | High | Low |
| API Calls | Continuous | One-time |
| Battery Usage | High | Low |
| Real-time | No | Yes |
| Complexity | Low | Medium |

## Troubleshooting

### Issue: Webhook Not Received
**Causes**:
- Mureka API down
- Incorrect callback URL
- Network firewall blocking

**Solution**:
```typescript
// Check edge function URL is correct
// Verify Mureka API configuration
// Check Supabase logs for errors
```

### Issue: Track Not Updated
**Causes**:
- Database permissions
- Invalid task_id
- Validation errors

**Solution**:
```typescript
// Check webhook logs
// Verify track exists with matching suno_id
// Validate payload structure
```

### Issue: Duplicate Webhooks
**Causes**:
- Mureka retry logic
- Network issues

**Solution**:
```typescript
// Add idempotency check
// Use `updated_at` timestamp to detect duplicates
```

## Future Enhancements

### Phase 1: Enhanced Security
- [ ] HMAC signature verification
- [ ] IP whitelist
- [ ] Rate limiting

### Phase 2: Advanced Features
- [ ] Webhook retry queue
- [ ] Duplicate detection
- [ ] Analytics dashboard

### Phase 3: Multi-Provider
- [ ] Support for other AI providers
- [ ] Unified webhook interface
- [ ] Provider-agnostic handlers

## Related Documentation

- [Mureka API Documentation](https://platform.mureka.ai/docs/en/quickstart.html)
- [Database Schema](./ARCHITECTURE_DATABASE_SCHEMA.md)
- [Edge Functions Guide](./EDGE_FUNCTIONS.md)
- [Realtime Documentation](https://supabase.com/docs/guides/realtime)

---

**Last Updated**: 2025-10-31  
**Version**: 1.0.0  
**Status**: ✅ Implemented
