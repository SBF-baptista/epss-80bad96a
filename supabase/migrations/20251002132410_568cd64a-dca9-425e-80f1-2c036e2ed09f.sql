-- Backfill accessories and supplies in existing kit_schedules from customers
UPDATE kit_schedules ks
SET 
  accessories = COALESCE(ks.accessories, c.accessories),
  supplies    = COALESCE(ks.supplies, c.modules)
FROM customers c
WHERE ks.customer_id = c.id
  AND (ks.accessories IS NULL OR ks.supplies IS NULL);