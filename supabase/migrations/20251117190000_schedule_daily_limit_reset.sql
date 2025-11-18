-- Schedule the daily limit reset function to run once every day at midnight.
SELECT cron.schedule(
  'reset-daily-limits',
  '0 0 * * *', -- every day at midnight
  $$
  SELECT public.reset_daily_generation_limits();
  $$
);
