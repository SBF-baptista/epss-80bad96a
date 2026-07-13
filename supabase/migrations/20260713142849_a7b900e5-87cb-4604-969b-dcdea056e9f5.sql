SELECT cron.schedule(
  'sync-segsale-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/sync-segsale-auto',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaWRldmN5eHBub3JiZ2Nza2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDY4NTIsImV4cCI6MjA2NjcyMjg1Mn0.d_522xNkZuA5upBT0TuqoIW8ylxTCVhYy3YAHp55xdg"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);