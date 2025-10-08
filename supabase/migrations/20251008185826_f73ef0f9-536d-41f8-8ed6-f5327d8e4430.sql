-- Remove duplicate accessories (keep only one of each)
DELETE FROM accessories a
WHERE a.id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY accessory_name, company_name, quantity, received_at 
             ORDER BY received_at
           ) as rn
    FROM accessories
  ) t
  WHERE t.rn > 1
);

-- Verify remaining accessories
SELECT 
  accessory_name,
  company_name,
  quantity,
  COUNT(*) as count
FROM accessories
GROUP BY accessory_name, company_name, quantity
ORDER BY accessory_name;