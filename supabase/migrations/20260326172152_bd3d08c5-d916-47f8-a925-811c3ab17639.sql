-- Remove incorrectly imported sales:
-- 10944, 10946, 10947: PLUS II products that should not be in the system
-- 10945: Incomplete records (4 instead of 7) due to missing plate in dedup
DELETE FROM incoming_vehicles 
WHERE sale_summary_id IN (10944, 10945, 10946, 10947);