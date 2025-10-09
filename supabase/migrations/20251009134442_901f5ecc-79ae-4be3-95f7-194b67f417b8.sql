-- Strategy: Keep the most recent incoming_vehicle per group and update references
-- 1. Identify which records to keep (most recent per id_resumo_venda)
WITH vehicles_to_keep AS (
  SELECT DISTINCT ON (brand, vehicle, COALESCE(year, 0), id_resumo_venda)
    id as keep_id,
    brand,
    vehicle,
    COALESCE(year, 0) as year,
    id_resumo_venda
  FROM incoming_vehicles
  WHERE id_resumo_venda IS NOT NULL
  ORDER BY brand, vehicle, COALESCE(year, 0), id_resumo_venda, received_at DESC
),
vehicles_to_delete AS (
  SELECT iv.id as delete_id, vtk.keep_id
  FROM incoming_vehicles iv
  JOIN vehicles_to_keep vtk 
    ON iv.brand = vtk.brand 
    AND iv.vehicle = vtk.vehicle 
    AND COALESCE(iv.year, 0) = vtk.year
    AND iv.id_resumo_venda = vtk.id_resumo_venda
  WHERE iv.id != vtk.keep_id
    AND iv.id_resumo_venda IS NOT NULL
)
-- Update homologation_cards to point to the kept record
UPDATE homologation_cards hc
SET incoming_vehicle_id = vtd.keep_id
FROM vehicles_to_delete vtd
WHERE hc.incoming_vehicle_id = vtd.delete_id;

-- 2. Now delete the duplicate incoming_vehicles
WITH vehicles_to_keep AS (
  SELECT DISTINCT ON (brand, vehicle, COALESCE(year, 0), id_resumo_venda)
    id as keep_id
  FROM incoming_vehicles
  WHERE id_resumo_venda IS NOT NULL
  ORDER BY brand, vehicle, COALESCE(year, 0), id_resumo_venda, received_at DESC
)
DELETE FROM incoming_vehicles
WHERE id_resumo_venda IS NOT NULL
  AND id NOT IN (SELECT keep_id FROM vehicles_to_keep);

-- 3. Fix Pedro Albuquerque customer to show in planning
UPDATE customers
SET show_in_planning = true
WHERE id_resumo_venda = 258;

-- 4. Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_incoming_vehicles_unique_segsale
ON incoming_vehicles (brand, vehicle, COALESCE(year, 0), id_resumo_venda)
WHERE id_resumo_venda IS NOT NULL;