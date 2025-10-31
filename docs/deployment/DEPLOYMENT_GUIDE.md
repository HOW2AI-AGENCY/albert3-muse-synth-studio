# 🚀 Deployment Guide - Track Archiving CRON

## Overview

This guide explains how to set up automatic track archiving using PostgreSQL's `pg_cron` extension. The system will automatically archive tracks that are 13+ days old to prevent data loss when provider URLs expire after 15 days.

---

## Prerequisites

- ✅ Supabase project with admin access
- ✅ `archive-tracks` edge function deployed
- ✅ Database with `track_archiving_jobs` table
- ✅ Storage buckets (`tracks-audio`, `tracks-covers`, `tracks-videos`)

---

## Step 1: Enable pg_cron Extension

Run this SQL in your Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Expected output:**
```
CREATE EXTENSION
```

---

## Step 2: Schedule the Archiving Job

Copy and run the SQL from `docs/deployment/CRON_SETUP.sql`:

```sql
SELECT cron.schedule(
  'archive-tracks-hourly',
  '0 * * * *', -- Every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/archive-tracks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := jsonb_build_object('limit', 50)
  ) as request_id;
  $$
);
```

**Expected output:**
```
 schedule 
----------
        1
```

---

## Step 3: Verify the Job

Check that the job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'archive-tracks-hourly';
```

**Expected columns:**
- `jobid`: Unique job identifier
- `schedule`: `0 * * * *`
- `command`: SQL to execute
- `nodename`: `localhost`
- `active`: `true`

---

## Step 4: Test the Setup

### Option A: Wait 1 Hour
The job will run automatically at the next hour mark (e.g., 14:00, 15:00).

### Option B: Manual Trigger (for testing)
Call the edge function directly:

```bash
curl -X POST \
  https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/archive-tracks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

---

## Step 5: Monitor Execution

### Check Recent Jobs
```sql
SELECT * 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'archive-tracks-hourly')
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Archiving Jobs Table
```sql
SELECT 
  id,
  track_id,
  status,
  created_at,
  completed_at,
  error_message
FROM track_archiving_jobs
ORDER BY created_at DESC
LIMIT 20;
```

### Check Archived Tracks
```sql
SELECT 
  id,
  title,
  archived_to_storage,
  storage_audio_url,
  archived_at
FROM tracks
WHERE archived_to_storage = true
ORDER BY archived_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Job Not Running

**Check if job is active:**
```sql
SELECT active FROM cron.job WHERE jobname = 'archive-tracks-hourly';
```

**Re-enable if disabled:**
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'archive-tracks-hourly';
```

### Job Failing

**Check error logs:**
```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'archive-tracks-hourly')
  AND status = 'failed'
ORDER BY start_time DESC;
```

**Common issues:**
1. **401 Unauthorized:** Check if anon key is correct
2. **Network error:** Verify Supabase URL is accessible
3. **Edge function timeout:** Reduce `limit` parameter

### No Tracks Being Archived

**Check if tracks need archiving:**
```sql
SELECT * FROM get_tracks_needing_archiving(10);
```

If empty, tracks are either:
- Already archived
- Less than 13 days old
- Missing audio URLs

---

## Maintenance

### Update Schedule

To change archiving frequency (e.g., every 6 hours):

```sql
SELECT cron.unschedule('archive-tracks-hourly');

SELECT cron.schedule(
  'archive-tracks-every-6h',
  '0 */6 * * *', -- Every 6 hours
  $$ ... $$
);
```

### Adjust Batch Size

To archive more/fewer tracks per run:

```sql
-- Edit the body parameter
body := jsonb_build_object('limit', 100) -- Archive up to 100 tracks
```

### Disable Archiving

Temporarily disable without deleting:

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'archive-tracks-hourly';
```

### Remove Job Completely

```sql
SELECT cron.unschedule('archive-tracks-hourly');
```

---

## Performance Considerations

**Current Setup:**
- Runs every hour
- Processes up to 50 tracks per run
- Each track: ~3 HTTP requests (audio, cover, video)
- Total: ~150 requests/hour max

**Scaling:**
- For 1000+ tracks/day: Increase frequency to every 30 minutes
- For large files: Increase edge function timeout
- Monitor storage bucket capacity

---

## Success Metrics

After 7 days, verify:

```sql
-- Archiving success rate (should be >99%)
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2) as success_rate
FROM track_archiving_jobs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Tracks archived vs needing archiving
SELECT 
  COUNT(*) FILTER (WHERE archived_to_storage = true) as archived,
  COUNT(*) FILTER (WHERE archived_to_storage = false AND created_at < NOW() - INTERVAL '13 days') as needs_archiving
FROM tracks
WHERE status = 'completed' AND audio_url IS NOT NULL;
```

**Target Metrics:**
- ✅ Success rate > 99%
- ✅ Tracks needing archiving < 10
- ✅ Average archiving time < 2 hours after eligibility

---

**Last Updated:** 2025-10-31  
**Status:** Production Ready  
**Owner:** DevOps Team
