-- Backfill vehicle_id for accessories using existing relations
BEGIN;

-- 1) Link accessories to vehicles via homologation_cards when incoming_vehicle_group_id stores homologation id
UPDATE accessories a
SET vehicle_id = hc.incoming_vehicle_id
FROM homologation_cards hc
WHERE a.vehicle_id IS NULL
  AND a.incoming_vehicle_group_id IS NOT NULL
  AND hc.id = a.incoming_vehicle_group_id
  AND hc.incoming_vehicle_id IS NOT NULL;

-- 2) Link accessories tied to AUTO or other orders when incoming_vehicles.created_order_id matches pedido_id
UPDATE accessories a
SET vehicle_id = iv.id
FROM incoming_vehicles iv
WHERE a.vehicle_id IS NULL
  AND a.pedido_id IS NOT NULL
  AND iv.created_order_id IS NOT NULL
  AND iv.created_order_id = a.pedido_id;

-- 3) Link orphan contract accessories by company_name within ±1 day window of incoming vehicle received_at
WITH matches AS (
  SELECT 
    a.id AS accessory_id,
    iv.id AS vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY a.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (a.created_at - iv.received_at))) ASC
    ) AS rn
  FROM accessories a
  JOIN incoming_vehicles iv
    ON a.company_name IS NOT NULL
   AND a.company_name = iv.company_name
   AND a.created_at BETWEEN iv.received_at - INTERVAL '1 day' AND iv.received_at + INTERVAL '1 day'
  WHERE a.vehicle_id IS NULL
    AND a.pedido_id IS NULL
    AND a.incoming_vehicle_group_id IS NULL
)
UPDATE accessories a
SET vehicle_id = m.vehicle_id
FROM matches m
WHERE a.id = m.accessory_id
  AND m.rn = 1;

COMMIT;