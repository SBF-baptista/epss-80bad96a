-- Backfill incoming_vehicle_id in kit_schedules for better accessory resolution

-- Update schedules with exact plate matches (excluding 'Placa pendente')
UPDATE kit_schedules ks
SET incoming_vehicle_id = iv.id
FROM incoming_vehicles iv
WHERE ks.incoming_vehicle_id IS NULL
  AND ks.vehicle_plate IS NOT NULL
  AND ks.vehicle_plate != 'Placa pendente'
  AND iv.plate = ks.vehicle_plate
  AND UPPER(TRIM(iv.brand)) = UPPER(TRIM(ks.vehicle_brand))
  AND (
    UPPER(TRIM(iv.vehicle)) = UPPER(TRIM(ks.vehicle_model))
    OR UPPER(TRIM(iv.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(ks.vehicle_model, ' ', 1))) || '%'
    OR UPPER(TRIM(ks.vehicle_model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(iv.vehicle, ' ', 1))) || '%'
  );

-- Update schedules with 'Placa pendente' by matching company_name + brand + model within time window
UPDATE kit_schedules ks
SET incoming_vehicle_id = iv.id
FROM incoming_vehicles iv
WHERE ks.incoming_vehicle_id IS NULL
  AND (ks.vehicle_plate = 'Placa pendente' OR ks.vehicle_plate IS NULL)
  AND ks.customer_name IS NOT NULL
  AND iv.company_name = ks.customer_name
  AND UPPER(TRIM(iv.brand)) = UPPER(TRIM(ks.vehicle_brand))
  AND (
    UPPER(TRIM(iv.vehicle)) = UPPER(TRIM(ks.vehicle_model))
    OR UPPER(TRIM(iv.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(ks.vehicle_model, ' ', 1))) || '%'
    OR UPPER(TRIM(ks.vehicle_model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(iv.vehicle, ' ', 1))) || '%'
  )
  AND iv.received_at >= (ks.created_at - INTERVAL '7 days')
  AND iv.received_at <= (ks.created_at + INTERVAL '7 days');