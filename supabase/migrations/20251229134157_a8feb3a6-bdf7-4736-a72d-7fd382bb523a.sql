-- Remove duplicate entries from kit_item_options, keeping the oldest record
DELETE FROM kit_item_options 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(item_name)), item_type 
        ORDER BY created_at ASC
      ) as rn
    FROM kit_item_options
  ) subquery
  WHERE rn > 1
);

-- Create unique index to prevent future duplicates (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kit_item_options_unique_name_type 
ON kit_item_options (LOWER(TRIM(item_name)), item_type);