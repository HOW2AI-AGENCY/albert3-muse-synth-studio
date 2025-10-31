# Sentry Production Monitoring

## Overview
Albert3 Muse Synth Studio использует Sentry для real-time мониторинга ошибок и производительности в production.

## Configuration

### Environment Variables
```env
VITE_SENTRY_DSN=<your-sentry-dsn>
```

**Note**: Sentry активируется только в production (`import.meta.env.PROD`)

### Initialization
Location: `src/main.tsx`

```typescript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // 'production'
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,              // 100% transactions
  replaysSessionSampleRate: 0.1,       // 10% normal sessions
  replaysOnErrorSampleRate: 1.0,       // 100% error sessions
});
```

## Features

### 1. Error Tracking
**Enhanced Error Boundary**: `src/components/errors/EnhancedErrorBoundary.tsx`

Автоматически отлавливает:
- React component errors
- Render errors
- Event handler errors

```tsx
<EnhancedErrorBoundary>
  <App />
</EnhancedErrorBoundary>
```

### 2. Web Vitals Monitoring
Автоматически отправляет Core Web Vitals:

| Metric | Description | Good | Poor |
|--------|-------------|------|------|
| **CLS** | Cumulative Layout Shift | <0.1 | >0.25 |
| **FID** | First Input Delay | <100ms | >300ms |
| **FCP** | First Contentful Paint | <1.8s | >3.0s |
| **LCP** | Largest Contentful Paint | <2.5s | >4.0s |
| **TTFB** | Time to First Byte | <800ms | >1800ms |

### 3. Session Replay
- **Normal sessions**: 10% (random sampling)
- **Error sessions**: 100% (всегда записываются при ошибке)

**Privacy**:
- `maskAllText: false` - текст видим (для дебага)
- `blockAllMedia: false` - медиа видимо

**Security Note**: Не записываются:
- Пароли (автоматически маскируются)
- Credit card data
- Sensitive input fields

### 4. Performance Tracing
- **100% transactions** отслеживаются
- Автоматический distributed tracing
- Network request monitoring

## Usage Examples

### Manual Error Capture
```typescript
import * as Sentry from '@sentry/react';

try {
  // risky operation
  await generateMusic(params);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'music-generation',
      provider: 'suno',
    },
    contexts: {
      params: {
        prompt: params.prompt,
        hasLyrics: !!params.lyrics,
      },
    },
  });
  throw error;
}
```

### Custom Events
```typescript
Sentry.captureMessage('Critical workflow completed', {
  level: 'info',
  tags: {
    workflow: 'music-generation',
    provider: 'suno',
  },
});
```

### User Context
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

if (user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.full_name,
  });
}
```

## Dashboard Navigation

### Key Metrics to Monitor
1. **Error Rate**
   - Target: <0.1%
   - Alert threshold: >1%

2. **Response Time (p95)**
   - Target: <300ms
   - Alert threshold: >1000ms

3. **Largest Contentful Paint**
   - Target: <1.6s
   - Alert threshold: >4.0s

4. **Session Replay Views**
   - Priority: High severity errors
   - Focus: User journey before error

### Common Issues & Solutions

#### High Error Rate
1. Check **Issues** tab for top errors
2. Filter by `environment:production`
3. Look at error frequency trend
4. Review stack traces and breadcrumbs

#### Poor Performance
1. Check **Performance** tab
2. Review transaction durations
3. Identify slow API calls
4. Check for N+1 queries

#### User-Reported Issues
1. Search by user email in Sentry
2. Review session replay
3. Check user's error history
4. Verify reproduction steps

## Alerts Configuration

### Recommended Alerts
```yaml
# Error rate spike
- metric: error_rate
  threshold: 1%
  window: 5 minutes
  channel: #alerts-critical

# Performance degradation
- metric: p95_response_time
  threshold: 1000ms
  window: 10 minutes
  channel: #alerts-performance

# High LCP
- metric: largest_contentful_paint
  threshold: 4000ms
  window: 1 hour
  channel: #alerts-performance
```

## Privacy & Compliance

### Data Retention
- **Errors**: 90 days
- **Session Replays**: 30 days
- **Performance data**: 90 days

### PII Handling
- Emails: stored (for user identification)
- Passwords: **never stored** (auto-masked)
- User IDs: stored (for tracking)
- IP addresses: anonymized

### GDPR Compliance
Users can request data deletion via:
```
support@albert3.app
```

## Performance Impact

### Bundle Size
```
@sentry/react: ~50KB (gzipped)
Total overhead: <100KB
```

### Runtime Impact
- Initialization: ~5ms
- Per-transaction overhead: <1ms
- Session replay: ~50KB/minute

## Troubleshooting

### Sentry not capturing errors
1. Check DSN configuration
2. Verify `import.meta.env.PROD` is true
3. Look for CSP blocking Sentry
4. Check network tab for failed uploads

### Missing source maps
```bash
# Build with source maps
npm run build -- --sourcemap

# Upload to Sentry
sentry-cli releases files <release> upload-sourcemaps ./dist
```

### High replay storage usage
Reduce sample rate:
```typescript
replaysSessionSampleRate: 0.05, // 5% instead of 10%
```

## Integration with Other Tools

### Slack Notifications
1. Go to Sentry > Settings > Integrations
2. Add Slack integration
3. Configure channels for alerts

### GitHub Issues
1. Enable GitHub integration
2. Auto-create issues for new errors
3. Link commits to error fixes

---

**Last updated**: 2025-10-31  
**Maintainer**: DevOps Team  
**Sentry Project**: `albert3-muse-synth-studio`
