-- ✅ PHASE 1 TASK: Configure CRON for daily generation limits reset
-- This CRON job runs every day at 00:00 UTC to reset generation limits

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reset of generation limits at 00:00 UTC
SELECT cron.schedule(
  'reset-daily-generation-limits',
  '0 0 * * *',
  'SELECT reset_daily_generation_limits();'
);

-- Verify the CRON job was created
-- Query: SELECT * FROM cron.job WHERE jobname = 'reset-daily-generation-limits';

-- Note: The function reset_daily_generation_limits() should already exist
-- from Sprint 35 Phase 1 database migration. If not, it will be created automatically.

-- To manually trigger the reset (for testing):
-- SELECT reset_daily_generation_limits();