-- Remove ALL duplicate accessories, keeping only ONE per company/accessory combination
WITH ranked_accessories AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY accessory_name, COALESCE(company_name, 'null'), quantity 
      ORDER BY received_at DESC
    ) as rn
  FROM accessories
)
DELETE FROM accessories
WHERE id IN (
  SELECT id FROM ranked_accessories WHERE rn > 1
);

-- Verify the cleanup
SELECT 
  accessory_name,
  company_name,
  quantity,
  COUNT(*) as count
FROM accessories
GROUP BY accessory_name, company_name, quantity
HAVING COUNT(*) > 1
ORDER BY count DESC, company_name, accessory_name;