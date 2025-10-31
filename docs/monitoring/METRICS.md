# 📊 Metrics & Monitoring Dashboard

## Overview

This document describes the metrics collection system and monitoring capabilities for Albert3 Muse Synth Studio.

## Key Metrics

### 1. Generation Metrics

**Tracked Events:**
- `generation.started` - When music generation begins
- `generation.completed` - When generation succeeds
- `generation.failed` - When generation fails

**Attributes:**
- `trackId` - Unique track identifier
- `provider` - suno | mureka
- `duration` - Time taken in milliseconds
- `errorCode` - Error classification (if failed)
- `timestamp` - Unix timestamp

**Dashboard Queries:**
```sql
-- Success rate last 24h
SELECT 
  provider,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM analytics_events
WHERE event_type = 'generation'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;

-- Average generation time
SELECT 
  provider,
  AVG((event_data->>'duration')::numeric) as avg_duration_ms
FROM analytics_events
WHERE event_type = 'generation'
  AND event_data->>'status' = 'completed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider;
```

### 2. Archiving Metrics

**Tracked Events:**
- `archiving.started` - Track archiving initiated
- `archiving.completed` - Files successfully archived
- `archiving.failed` - Archiving failed

**Attributes:**
- `trackId` - Track being archived
- `filesArchived` - Number of files (audio, cover, video)
- `duration` - Time taken
- `timestamp` - When archiving occurred

**Dashboard Queries:**
```sql
-- Archiving health
SELECT 
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM track_archiving_jobs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Tracks needing archiving
SELECT COUNT(*) as tracks_pending_archive
FROM tracks
WHERE archived_to_storage = false
  AND status = 'completed'
  AND audio_url IS NOT NULL
  AND created_at < NOW() - INTERVAL '13 days';
```

### 3. Rate Limit Metrics

**Tracked Events:**
- `rate_limit.hit` - API rate limit encountered

**Attributes:**
- `provider` - Which API (suno, mureka, lovable-ai)
- `endpoint` - Specific endpoint hit
- `retryAfter` - Seconds until retry allowed
- `timestamp` - When limit was hit

**Alerts:**
- Alert if rate limits > 10/hour
- Alert if same provider rate limited 3+ times in 5 minutes

### 4. Error Metrics

**Categories:**
- `RATE_LIMIT_EXCEEDED` - 429 errors
- `INSUFFICIENT_CREDITS` - 402 quota errors
- `NETWORK_ERROR` - Connection failures
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Unexpected errors

**Dashboard Queries:**
```sql
-- Error breakdown
SELECT 
  event_data->>'errorCode' as error_code,
  COUNT(*) as occurrences
FROM analytics_events
WHERE event_type = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY occurrences DESC;
```

## Monitoring Dashboard Setup

### Grafana Dashboard Configuration

**Panel 1: Generation Success Rate (Gauge)**
```sql
SELECT 
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE event_data->>'status' = 'completed') / 
    COUNT(*), 2
  ) as success_rate
FROM analytics_events
WHERE event_type = 'generation'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Panel 2: Generation Volume (Time Series)**
```sql
SELECT 
  time_bucket('5 minutes', created_at) as time,
  event_data->>'provider' as provider,
  COUNT(*) as generations
FROM analytics_events
WHERE event_type = 'generation'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY time, provider
ORDER BY time;
```

**Panel 3: Active Rate Limits (Table)**
```sql
SELECT 
  event_data->>'provider' as provider,
  event_data->>'endpoint' as endpoint,
  COUNT(*) as hits,
  MAX(created_at) as last_hit
FROM analytics_events
WHERE event_type = 'rate_limit'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider, endpoint
ORDER BY hits DESC;
```

**Panel 4: Archiving Status (Stat)**
```sql
SELECT COUNT(*) as pending_archiving
FROM tracks
WHERE archived_to_storage = false
  AND status = 'completed'
  AND audio_url IS NOT NULL
  AND archive_scheduled_at < NOW();
```

## Sentry Integration

### Custom Tags
```typescript
Sentry.setTag('provider', 'suno' | 'mureka');
Sentry.setTag('operation', 'generation' | 'archiving');
Sentry.setTag('user_tier', 'free' | 'pro');
```

### Breadcrumbs
```typescript
Sentry.addBreadcrumb({
  category: 'generation',
  message: 'Track generation started',
  level: 'info',
  data: { trackId, provider }
});
```

## Alerting Rules

### Critical Alerts (Immediate)
1. **Generation success rate < 90%** (5min window)
2. **Archiving failed > 5 tracks** (1hr window)
3. **Rate limits > 20/hour**
4. **Error rate > 5%** (5min window)

### Warning Alerts (15min delay)
1. **Generation success rate < 95%**
2. **Average generation time > 120s**
3. **Pending archiving > 100 tracks**
4. **Rate limits > 10/hour**

## SLO Targets

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Generation Success Rate | ≥ 97% | 24 hours |
| Generation Latency (p95) | ≤ 90s | 1 hour |
| Archiving Success Rate | ≥ 99% | 7 days |
| API Uptime | ≥ 99.5% | 30 days |
| Rate Limit Errors | < 0.1% | 24 hours |

## Usage

### In Frontend Code
```typescript
import { metricsCollector } from '@/utils/monitoring/metrics';

// Track generation start
metricsCollector.trackGeneration({
  trackId,
  provider: 'suno',
  status: 'started',
  timestamp: Date.now()
});

// Track completion
metricsCollector.trackGeneration({
  trackId,
  provider: 'suno',
  status: 'completed',
  duration: Date.now() - startTime,
  timestamp: Date.now()
});

// Get stats
const stats = metricsCollector.getGenerationStats();
console.log('Success rate:', stats.successRate);
```

### In Edge Functions
```typescript
// Log structured metrics
console.log(JSON.stringify({
  type: 'metric',
  name: 'generation.completed',
  provider: 'suno',
  duration: 45000,
  timestamp: new Date().toISOString()
}));
```

## Maintenance

- Metrics retained for 30 days
- Aggregated stats computed hourly
- Dashboard refresh rate: 30 seconds
- Archive old metrics to cold storage after 90 days
