# 🐛 Sentry Setup Guide

## Overview

Albert3 Muse Synth Studio uses **Sentry** for production error tracking, performance monitoring, and user session replay.

## Quick Start

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project:
   - **Platform:** React
   - **Alert Frequency:** Weekly (recommended)
   - **Project Name:** `albert3-muse-synth-studio`

### 2. Get Your DSN

After creating the project:

1. Go to **Settings** → **Projects** → Select your project
2. Navigate to **Client Keys (DSN)**
3. Copy the **DSN URL** (looks like `https://abc123@o123456.ingest.sentry.io/4567890`)

### 3. Configure Environment Variable

Add the DSN to your `.env` file:

```bash
# Production
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id

# Optional: Enable in development
VITE_SENTRY_DEV_ENABLED=true
```

### 4. Verify Integration

1. **Development mode:**
   ```bash
   npm run dev
   ```
   Check console for: `✅ [Sentry] Initialized in development mode`

2. **Production build:**
   ```bash
   npm run build
   npm run preview
   ```
   Check console for: `[Sentry] Initialized in production mode`

3. **Test error capture:**
   Open browser console and run:
   ```javascript
   throw new Error('Test Sentry integration');
   ```
   This error should appear in your Sentry dashboard within ~30 seconds.

## Features Enabled

### 1. Error Tracking
- Automatic error capture with stack traces
- Source maps for production debugging
- Filtered sensitive data (cookies, auth headers)

### 2. Performance Monitoring
- **Traces Sample Rate:** 25% in production, 100% in development
- Tracks API calls to Supabase, Suno, Mureka
- HTTP client integration for failed requests (4xx, 5xx)
- Long task monitoring

### 3. Session Replay
- **Session Sample Rate:** 10% in production, 100% in development
- **Error Replay:** 100% (always record sessions with errors)
- Masked text, inputs, and media for privacy

### 4. Performance Profiling
- **Profiles Sample Rate:** 25% in production
- Flame graphs for slow operations

### 5. User Feedback
- Built-in feedback widget (in Russian)
- Users can report issues directly from the app
- Automatically attached to error events

## Filtered Errors

The following errors are **ignored** to reduce noise:

- Network errors (`Failed to fetch`, `NetworkError`)
- JWT token expiration (expected behavior)
- Browser extension errors
- Safari-specific errors

## Custom Error Handling

### Capture Exceptions

```typescript
import { captureException } from '@/utils/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, {
    context: 'MusicGenerator',
    userId: user.id,
    provider: 'suno',
  });
}
```

### Capture Messages

```typescript
import { captureMessage } from '@/utils/sentry';

captureMessage('User clicked generate button', 'info', {
  provider: 'mureka',
  promptLength: 150,
});
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/utils/sentry';

addBreadcrumb('User uploaded audio reference', 'user', {
  fileSize: file.size,
  fileName: file.name,
});
```

### Set User Context

```typescript
import { setUserContext } from '@/utils/sentry';

// On login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.full_name,
});

// On logout
setUserContext(null);
```

### Performance Spans

```typescript
import { startSpan } from '@/utils/sentry';

startSpan('music-generation', 'task', async () => {
  await generateMusic(params);
});
```

## Sentry Dashboard

### Issues Tab
- View all captured errors
- Group by error type
- Filter by release, environment, user

### Performance Tab
- View transaction traces
- Identify slow API calls
- Monitor Web Vitals (LCP, FID, CLS)

### Replays Tab
- Watch user sessions leading to errors
- Debug visual issues
- Understand user behavior

### Releases Tab
- Track deployments
- See error spikes after releases
- Compare error rates between versions

## Alerts

Recommended alert rules:

1. **High Error Rate**
   - Condition: More than 10 errors in 5 minutes
   - Notification: Email + Slack

2. **New Issue**
   - Condition: First time error occurs
   - Notification: Email

3. **Performance Degradation**
   - Condition: p95 transaction duration > 3s
   - Notification: Email

## Source Maps

To enable source maps for production debugging:

1. Install Sentry CLI:
   ```bash
   npm install -g @sentry/cli
   ```

2. Create `.sentryclirc`:
   ```ini
   [auth]
   token=your-auth-token

   [defaults]
   url=https://sentry.io/
   org=your-org
   project=albert3-muse-synth-studio
   ```

3. Add to `package.json`:
   ```json
   {
     "scripts": {
       "build": "vite build && sentry-cli sourcemaps upload --release $npm_package_version ./dist"
     }
   }
   ```

## Privacy & GDPR

Sentry integration is GDPR-compliant with the following safeguards:

- ✅ All text inputs are **masked** in session replays
- ✅ All media (images, audio) are **blocked**
- ✅ Cookies and auth headers are **removed** before sending
- ✅ Session replays require **explicit user consent** (via feedback widget)

## Troubleshooting

### Sentry not capturing errors

1. **Check DSN is set:**
   ```bash
   echo $VITE_SENTRY_DSN
   ```

2. **Check console logs:**
   - Look for `[Sentry] Initialized` message
   - If missing, check `.env` file

3. **Verify network requests:**
   - Open DevTools → Network tab
   - Filter by `sentry.io`
   - Should see POST requests when errors occur

### Too many errors

1. **Increase `ignoreErrors` list** in `src/utils/sentry.ts`
2. **Add more filters** in `beforeSend` function
3. **Adjust sample rates** to reduce volume

### Source maps not working

1. **Verify build output:**
   ```bash
   ls -la dist/assets/*.map
   ```

2. **Check Sentry release:**
   ```bash
   sentry-cli releases list
   ```

3. **Re-upload source maps:**
   ```bash
   sentry-cli sourcemaps upload --release v2.7.5 ./dist
   ```

## Cost Optimization

**Free tier limits:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month

**To stay within limits:**
- Use `tracesSampleRate: 0.25` in production (25% sampling)
- Use `replaysSessionSampleRate: 0.1` (10% sampling)
- Filter out non-critical errors in `beforeSend`

## Support

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/react/
- Sentry Discord: https://discord.gg/sentry
- Internal Support: Contact tech lead

---

**Last updated:** January 2, 2025  
**Version:** 3.0.0
