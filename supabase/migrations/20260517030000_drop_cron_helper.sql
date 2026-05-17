-- Drop the helper from 20260517020000_inject_cron_key.sql. The cron job
-- itself remains scheduled with the embedded service role key (admin-only
-- visibility via cron.job.command).

DROP FUNCTION IF EXISTS public._kibay_set_cron_key(text);
