-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to send daily agenda at 17:30 BRT (20:30 UTC)
-- This calls the send-daily-agenda edge function every day
SELECT cron.schedule(
  'daily-agenda-dispatch-1730',
  '30 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/send-daily-agenda',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);