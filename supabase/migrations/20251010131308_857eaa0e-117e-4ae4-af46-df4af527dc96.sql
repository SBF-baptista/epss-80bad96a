-- 1) Add incoming_vehicle_id to kit_schedules
ALTER TABLE kit_schedules 
ADD COLUMN incoming_vehicle_id uuid NULL;

ALTER TABLE kit_schedules 
ADD CONSTRAINT kit_schedules_incoming_vehicle_id_fkey 
FOREIGN KEY (incoming_vehicle_id) 
REFERENCES incoming_vehicles(id) 
ON DELETE SET NULL;

CREATE INDEX idx_kit_schedules_incoming_vehicle_id 
ON kit_schedules(incoming_vehicle_id);

-- 2) Backfill kit_schedules.incoming_vehicle_id by plate
UPDATE kit_schedules ks
SET incoming_vehicle_id = iv.id
FROM incoming_vehicles iv
WHERE ks.incoming_vehicle_id IS NULL
  AND ks.vehicle_plate IS NOT NULL
  AND ks.vehicle_plate != 'Placa pendente'
  AND iv.plate = ks.vehicle_plate;

-- 3) Backfill kit_schedules by company + time window (fallback for no plate)
WITH matches AS (
  SELECT ks.id ks_id, iv.id iv_id,
         ROW_NUMBER() OVER (
           PARTITION BY ks.id
           ORDER BY ABS(EXTRACT(EPOCH FROM (ks.created_at - iv.received_at))) ASC
         ) rn
  FROM kit_schedules ks
  JOIN incoming_vehicles iv
    ON (ks.customer_name = iv.company_name)
   AND ks.incoming_vehicle_id IS NULL
   AND (ks.vehicle_plate IS NULL OR ks.vehicle_plate = 'Placa pendente')
)
UPDATE kit_schedules ks
   SET incoming_vehicle_id = m.iv_id
  FROM matches m
 WHERE ks.id = m.ks_id AND m.rn = 1;

-- 4) Backfill accessories.vehicle_id via homologation
UPDATE accessories a
SET vehicle_id = hc.incoming_vehicle_id
FROM homologation_cards hc
WHERE a.vehicle_id IS NULL
  AND a.incoming_vehicle_group_id = hc.id
  AND hc.incoming_vehicle_id IS NOT NULL;

-- 5) Backfill accessories.vehicle_id by plate + company
UPDATE accessories a
   SET vehicle_id = iv.id
  FROM incoming_vehicles iv
  JOIN kit_schedules ks ON ks.vehicle_plate = iv.plate
 WHERE a.vehicle_id IS NULL
   AND a.company_name = iv.company_name
   AND iv.plate IS NOT NULL;

-- 6) Backfill accessories by company + time window (final fallback)
WITH matches AS (
  SELECT a.id aid, iv.id iv_id,
         ROW_NUMBER() OVER (
           PARTITION BY a.id
           ORDER BY ABS(EXTRACT(EPOCH FROM (a.created_at - iv.received_at))) ASC
         ) rn
  FROM accessories a
  JOIN incoming_vehicles iv
    ON a.company_name = iv.company_name
  WHERE a.vehicle_id IS NULL
)
UPDATE accessories a
   SET vehicle_id = m.iv_id
  FROM matches m
 WHERE a.id = m.aid AND m.rn = 1;

-- 7) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accessories_vehicle_id 
ON accessories(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_incoming_vehicles_plate 
ON incoming_vehicles(plate);

CREATE INDEX IF NOT EXISTS idx_accessories_company_created 
ON accessories(company_name, created_at);