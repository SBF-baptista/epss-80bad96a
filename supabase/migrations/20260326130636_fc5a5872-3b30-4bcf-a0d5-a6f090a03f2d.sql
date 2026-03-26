-- Remove old sales imported erroneously by sync-segsale-auto retry logic
-- These were imported on 2026-03-26 due to a bug in the retry filter
DELETE FROM incoming_vehicles 
WHERE sale_summary_id < 10942 
  AND received_at > '2026-03-25';