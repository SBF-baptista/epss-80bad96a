-- Backfill empty arrays in kit_schedules from customers
UPDATE kit_schedules ks
SET 
  accessories = COALESCE(NULLIF(ks.accessories, '{}'), c.accessories),
  supplies    = COALESCE(NULLIF(ks.supplies, '{}'), c.modules)
FROM customers c
WHERE ks.customer_id = c.id
  AND (
    array_length(ks.accessories, 1) IS NULL
    OR array_length(ks.supplies, 1) IS NULL
  );