-- Enable pg_cron extension (if not already enabled)
-- This allows scheduling of PostgreSQL functions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule archive-tracks to run every hour at minute 0
-- This will automatically archive tracks that are 13+ days old
SELECT cron.schedule(
  'archive-tracks-hourly',           -- Job name
  '0 * * * *',                       -- Cron schedule: every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://qycfsepwguaiwcquwwbw.supabase.co/functions/v1/archive-tracks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y2ZzZXB3Z3VhaXdjcXV3d2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjUxMTQsImV4cCI6MjA3NDk0MTExNH0.-DWekzgkTFQQpyp0MkJM_lgmetXCPFz8JeQPjYoXKc4'
    ),
    body := jsonb_build_object('limit', 50)
  ) as request_id;
  $$
);

-- Query to check if the job was created successfully
SELECT * FROM cron.job WHERE jobname = 'archive-tracks-hourly';

-- To manually trigger the job (for testing):
-- SELECT cron.schedule_in_database('archive-tracks-hourly', '1 second', $$ ... $$);

-- To unschedule/delete the job:
-- SELECT cron.unschedule('archive-tracks-hourly');
