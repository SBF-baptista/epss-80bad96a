-- Populate item_homologation_history for currently pending items
-- This sets their pending date to today

INSERT INTO item_homologation_history (item_name, item_type, status, changed_at)
SELECT DISTINCT 
  hka.item_name,
  hka.item_type,
  'pending'::text,
  now()
FROM homologation_kit_accessories hka
WHERE NOT EXISTS (
  SELECT 1 
  FROM kit_item_options kio 
  WHERE lower(trim(kio.item_name)) = lower(trim(hka.item_name))
)
ON CONFLICT DO NOTHING;