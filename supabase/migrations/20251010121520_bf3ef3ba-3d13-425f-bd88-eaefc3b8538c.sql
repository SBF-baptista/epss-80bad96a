-- Backfill accessories with vehicle_id where missing
-- This corrects historical data to link accessories to their vehicles

-- Step 1: Link accessories to vehicles via homologation cards
UPDATE accessories a
SET vehicle_id = hc.incoming_vehicle_id
FROM homologation_cards hc
WHERE a.vehicle_id IS NULL
  AND a.incoming_vehicle_group_id = hc.id
  AND hc.incoming_vehicle_id IS NOT NULL;

-- Step 2: Link orphaned contract_items to vehicles by company_name and time window
-- This finds the closest incoming_vehicle within ±1 day based on received_at
WITH matches AS (
  SELECT 
    a.id as accessory_id, 
    iv.id as vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY a.id
      ORDER BY ABS(EXTRACT(EPOCH FROM (a.received_at - iv.received_at))) ASC
    ) as rn
  FROM accessories a
  JOIN incoming_vehicles iv
    ON a.company_name = iv.company_name
   AND a.received_at >= iv.received_at - interval '1 day'
   AND a.received_at <= iv.received_at + interval '1 day'
   AND iv.sale_summary_id IS NOT NULL
  WHERE a.vehicle_id IS NULL
    AND a.incoming_vehicle_group_id IS NULL
    AND a.pedido_id IS NULL
)
UPDATE accessories a
SET vehicle_id = m.vehicle_id
FROM matches m
WHERE a.id = m.accessory_id
  AND m.rn = 1;

-- Step 3: For accessories linked to AUTO orders, set vehicle_id from incoming_vehicles
UPDATE accessories a
SET vehicle_id = iv.id
FROM pedidos p
JOIN incoming_vehicles iv ON iv.created_order_id = p.id
WHERE a.pedido_id = p.id
  AND a.vehicle_id IS NULL
  AND p.numero_pedido LIKE 'AUTO-%'
  AND iv.id IS NOT NULL;