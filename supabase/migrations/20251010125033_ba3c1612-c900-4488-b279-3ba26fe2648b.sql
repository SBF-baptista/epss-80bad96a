-- Backfill vehicle_id in orphaned accessories

-- Step 1: Link accessories via homologation_cards
UPDATE accessories a
SET vehicle_id = hc.incoming_vehicle_id
FROM homologation_cards hc
WHERE a.vehicle_id IS NULL
  AND a.incoming_vehicle_group_id = hc.id
  AND hc.incoming_vehicle_id IS NOT NULL;

-- Step 2: Link accessories by plate (most direct for scheduled vehicles)
WITH iv AS (
  SELECT id, plate, company_name
  FROM incoming_vehicles
  WHERE plate IS NOT NULL AND plate != '' AND plate != 'Placa pendente'
)
UPDATE accessories a
SET vehicle_id = iv.id
FROM iv
WHERE a.vehicle_id IS NULL
  AND a.company_name = iv.company_name
  AND EXISTS (
    SELECT 1 FROM kit_schedules ks
    WHERE ks.vehicle_plate = iv.plate
      AND ks.status IN ('scheduled', 'in_progress', 'confirmed')
  );

-- Step 3: Link accessories by time window + company (for cases without plate)
WITH matches AS (
  SELECT 
    a.id as accessory_id, 
    iv.id as vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY a.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (a.created_at - iv.received_at))) ASC
    ) as rn
  FROM accessories a
  JOIN incoming_vehicles iv
    ON a.company_name = iv.company_name
   AND a.created_at BETWEEN iv.received_at - interval '2 days' AND iv.received_at + interval '2 days'
  WHERE a.vehicle_id IS NULL
    AND a.company_name IS NOT NULL
    AND a.company_name != ''
)
UPDATE accessories a
SET vehicle_id = m.vehicle_id
FROM matches m
WHERE a.id = m.accessory_id
  AND m.rn = 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incoming_vehicles_plate ON incoming_vehicles(plate) WHERE plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accessories_vehicle_id ON accessories(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accessories_company_created ON accessories(company_name, created_at) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kit_schedules_plate ON kit_schedules(vehicle_plate) WHERE vehicle_plate IS NOT NULL;

-- Add foreign key constraint (optional but recommended)
ALTER TABLE accessories
ADD CONSTRAINT fk_accessories_vehicle
FOREIGN KEY (vehicle_id) REFERENCES incoming_vehicles(id)
ON DELETE SET NULL;