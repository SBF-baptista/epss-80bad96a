-- Step 1: Clean corrupted data - Remove duplicate accessories, keeping only the most recent
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY vehicle_id, accessory_name 
      ORDER BY created_at DESC
    ) as row_num
  FROM accessories
  WHERE vehicle_id IS NOT NULL
)
DELETE FROM accessories
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Step 2: Add UNIQUE constraint to prevent future duplications
CREATE UNIQUE INDEX IF NOT EXISTS idx_accessories_unique_vehicle_accessory 
ON accessories(vehicle_id, accessory_name)
WHERE vehicle_id IS NOT NULL;