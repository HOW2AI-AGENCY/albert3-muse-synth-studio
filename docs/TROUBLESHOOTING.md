# 🔧 Troubleshooting Guide

> Common issues and solutions for Albert3 Muse Synth Studio

## Table of Contents

- [Music Generation Issues](#music-generation-issues)
- [Playback Problems](#playback-problems)
- [Performance Issues](#performance-issues)
- [Authentication Errors](#authentication-errors)
- [Database Errors](#database-errors)
- [Build and Deploy Issues](#build-and-deploy-issues)
- [Developer Tools](#developer-tools)

---

## Music Generation Issues

### ❌ Issue: Tracks not generating

**Symptoms**:
- Tracks stuck in "pending" or "processing" status
- Error message "Failed to generate track"
- No audio URL after 5+ minutes

**Possible Causes & Solutions**:

1. **API Keys Not Configured**
   ```typescript
   // Check edge function logs
   // Look for: "Missing SUNO_API_KEY" or "Missing MUREKA_API_KEY"
   ```
   - **Solution**: Verify API keys are set in Lovable Cloud secrets
   - Check: Backend → Secrets → `SUNO_API_KEY`, `MUREKA_API_KEY`

2. **Insufficient Credits**
   ```typescript
   // Check user credits
   const { data: profile } = await supabase
     .from('profiles')
     .select('test_credits, production_credits')
     .eq('id', userId)
     .single();
   ```
   - **Solution**: Add more credits to user profile
   - Test credits: For development/testing
   - Production credits: For real generation

3. **Rate Limited**
   ```typescript
   // Check for 429 error in network tab
   // Message: "Rate limit exceeded"
   ```
   - **Solution**: Wait 60 seconds before retrying
   - Current limit: 10 requests/minute per user

4. **Invalid Prompt**
   ```typescript
   // Prompt validation rules:
   // - Length: 5-1000 characters
   // - No offensive content
   // - No empty strings
   ```
   - **Solution**: Use the "Improve Prompt" feature
   - Provide more descriptive prompts

5. **External API Down**
   - Check Suno AI status: https://status.suno.ai
   - Try alternative provider (Mureka)
   - **Solution**: Retry later or switch providers

---

### ❌ Issue: Polling not working

**Symptoms**:
- Track stuck in "processing" indefinitely
- No status updates in UI

**Solutions**:

1. **Check Realtime Subscription**
   ```typescript
   // In TracksList component
   // Verify subscription is active
   console.log('Realtime channel:', channel.state);
   ```

2. **Manual Refresh**
   ```typescript
   // Force refetch tracks
   queryClient.invalidateQueries({ queryKey: ['tracks'] });
   ```

3. **Check Edge Function Logs**
   - Look for polling errors in edge function logs
   - Check if Suno task ID is correct

---

## Playback Problems

### ❌ Issue: Audio won't play

**Symptoms**:
- Play button doesn't respond
- Audio loads but no sound
- Error: "Failed to load audio"

**Solutions**:

1. **CDN URL Expired**
   ```typescript
   // Suno/Mureka URLs expire after 15 days
   // Check if track is older than 15 days
   const daysSinceCreation = differenceInDays(new Date(), track.created_at);
   if (daysSinceCreation > 15) {
     // Use storage URL instead
     const audioUrl = track.storage_audio_url || track.audio_url;
   }
   ```

2. **CORS Issues**
   ```typescript
   // Check browser console for CORS errors
   // Solution: Use proxy URL
   const proxyUrl = `/api/proxy?url=${encodeURIComponent(audioUrl)}`;
   ```

3. **Audio Format Not Supported**
   ```typescript
   // Check if browser supports audio format
   const audio = new Audio();
   const canPlay = audio.canPlayType('audio/mpeg');
   console.log('Can play MP3:', canPlay); // "probably" or "maybe" = OK
   ```

4. **Browser Autoplay Policy**
   - Some browsers block autoplay without user interaction
   - **Solution**: Require user click before playing

---

### ❌ Issue: Audio stuttering/buffering

**Symptoms**:
- Playback pauses frequently
- Audio quality degrades

**Solutions**:

1. **Slow Network Connection**
   - Check network speed: Fast 3G minimum required
   - **Solution**: Enable preloading
   ```typescript
   <audio preload="auto" />
   ```

2. **Memory Leak**
   - Check Memory tab in DevTools
   - Look for detached audio elements
   - **Solution**: Properly cleanup audio on unmount
   ```typescript
   useEffect(() => {
     return () => {
       audioRef.current?.pause();
       audioRef.current = null;
     };
   }, []);
   ```

3. **Too Many Concurrent Requests**
   - Limit to 1 audio stream at a time
   - **Solution**: Pause other tracks before playing new one

---

## Performance Issues

### ❌ Issue: Slow page load

**Symptoms**:
- White screen for 3+ seconds
- Large JavaScript bundle
- Slow Time to Interactive (TTI)

**Solutions**:

1. **Enable Route Lazy Loading**
   ```typescript
   // Already implemented in src/router.tsx
   const Dashboard = lazy(() => import("@/pages/Dashboard"));
   ```

2. **Check Bundle Size**
   ```bash
   npm run build
   # Check dist/ folder size
   ```
   - Target: < 500KB gzipped
   - Current: ~320KB

3. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Disable Browser Extensions**
   - Ad blockers can interfere with loading

---

### ❌ Issue: UI freezing/laggy

**Symptoms**:
- Scrolling is janky
- Buttons slow to respond
- High CPU usage

**Solutions**:

1. **Too Many Tracks Rendered**
   ```typescript
   // Check if virtualization is enabled
   import { VirtualizedList } from "@/components/ui/virtualized-list";
   
   // Should be used for lists with 50+ items
   ```

2. **Memory Leak**
   ```typescript
   // Check for missing cleanup in useEffect
   useEffect(() => {
     const subscription = supabase
       .channel('tracks')
       .on('postgres_changes', ...)
       .subscribe();
     
     return () => {
       subscription.unsubscribe(); // ✅ Don't forget this!
     };
   }, []);
   ```

3. **Too Many Re-renders**
   ```typescript
   // Use React DevTools Profiler
   // Look for components rendering > 10 times/second
   
   // Solution: Memoize components
   const MemoizedTrackCard = React.memo(TrackCard);
   ```

---

## Authentication Errors

### ❌ Issue: Can't login

**Symptoms**:
- "Invalid credentials" error
- Redirect loop after login
- Session not persisting

**Solutions**:

1. **Wrong Email/Password**
   - Check for typos
   - Use "Forgot Password" to reset

2. **Email Not Confirmed**
   - Check if auto-confirm is enabled in Lovable Cloud
   - Backend → Authentication → Settings → Email Confirmations

3. **Session Storage Issues**
   ```typescript
   // Clear local storage
   localStorage.clear();
   sessionStorage.clear();
   
   // Then try logging in again
   ```

4. **CORS Configuration**
   - Verify allowed origins in Lovable Cloud
   - Backend → Authentication → URL Configuration

---

### ❌ Issue: Session expired

**Symptoms**:
- Logged out unexpectedly
- "Unauthorized" errors
- JWT token invalid

**Solutions**:

1. **Refresh Session**
   ```typescript
   const { data, error } = await supabase.auth.refreshSession();
   ```

2. **Check Token Expiration**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   const expiresAt = session?.expires_at;
   console.log('Token expires:', new Date(expiresAt * 1000));
   ```

3. **Re-authenticate**
   ```typescript
   // Force logout and login
   await supabase.auth.signOut();
   // User must login again
   ```

---

## Database Errors

### ❌ Issue: Row Level Security violation

**Symptoms**:
- Error: "new row violates row-level security policy"
- Can't insert/update data

**Solutions**:

1. **User Not Authenticated**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
     // Redirect to login
   }
   ```

2. **Missing user_id**
   ```typescript
   // Always include user_id in inserts
   const { data, error } = await supabase
     .from('tracks')
     .insert({
       title: "My Track",
       user_id: user.id,  // ✅ Required!
       // ...
     });
   ```

3. **Check RLS Policies**
   ```sql
   -- In Lovable Cloud Backend → Database
   -- Verify policies allow the operation
   SELECT * FROM pg_policies WHERE tablename = 'tracks';
   ```

---

### ❌ Issue: Foreign key violation

**Symptoms**:
- Error: "violates foreign key constraint"
- Can't delete records

**Solutions**:

1. **Cascade Delete**
   ```sql
   -- Check if ON DELETE CASCADE is set
   -- If not, manually delete related records first
   ```

2. **Order of Operations**
   ```typescript
   // Delete child records before parent
   await supabase.from('track_stems').delete().eq('track_id', id);
   await supabase.from('track_versions').delete().eq('parent_track_id', id);
   await supabase.from('tracks').delete().eq('id', id);
   ```

---

## Build and Deploy Issues

### ❌ Issue: Build fails

**Symptoms**:
- `npm run build` errors
- TypeScript compilation errors
- Missing dependencies

**Solutions**:

1. **TypeScript Errors**
   ```bash
   # Check for type errors
   npm run type-check
   
   # Fix common issues:
   # - Missing imports
   # - Incorrect type annotations
   # - Unused variables
   ```

2. **Missing Dependencies**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment Variables**
   ```bash
   # Verify .env file exists (auto-generated by Lovable)
   # Should contain:
   # - VITE_SUPABASE_URL
   # - VITE_SUPABASE_PUBLISHABLE_KEY
   ```

---

### ❌ Issue: Deploy fails

**Symptoms**:
- Green build but deploy errors
- Edge functions not updating

**Solutions**:

1. **Check Deploy Logs**
   - View logs in Lovable Cloud console
   - Look for migration errors

2. **Database Migration Failed**
   ```sql
   -- Check migration status
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC
   LIMIT 10;
   ```

3. **Edge Function Errors**
   - Check function logs for runtime errors
   - Verify all secrets are configured

---

## Developer Tools

### 🛠️ Performance Monitor Widget

Enable in-app performance monitoring:

```typescript
// Already enabled in development mode
// Shows FPS, memory usage, network activity
// Located in bottom-right corner
```

### 🛠️ React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Available in development mode
// Press button in bottom-left to open
```

### 🛠️ Sentry Error Tracking

```typescript
// Errors automatically sent to Sentry
// View at: https://sentry.io

// Manual error tracking:
import * as Sentry from "@sentry/react";
Sentry.captureException(error);
```

### 🛠️ Browser DevTools Checklist

**Console Tab**:
- Look for red errors
- Check for warnings
- Search for "Failed" or "Error"

**Network Tab**:
- Filter by "XHR" or "Fetch"
- Look for 4xx/5xx status codes
- Check request/response payloads

**Application Tab**:
- Check Local Storage for auth tokens
- Verify IndexedDB cache
- Clear site data if needed

**Performance Tab**:
- Record page load
- Look for long tasks (>50ms)
- Check for memory leaks

---

## Getting Help

If none of these solutions work:

1. **Check Documentation**
   - [Knowledge Base](./KNOWLEDGE_BASE.md)
   - [API Documentation](./API.md)
   - [Security Guide](./security/)

2. **Review Error Logs**
   - Lovable Cloud: Backend → Logs
   - Sentry: Error dashboard
   - Browser Console: F12

3. **Contact Support**
   - Include error messages
   - Provide reproduction steps
   - Share relevant logs

---

**Last Updated**: 2025-10-31  
**Version**: 2.4.0
