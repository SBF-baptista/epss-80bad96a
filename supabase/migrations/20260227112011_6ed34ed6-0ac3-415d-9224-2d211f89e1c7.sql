
-- 1. Delete status history linked to kit_schedules
DELETE FROM kit_schedule_status_history
WHERE kit_schedule_id IN (SELECT id FROM kit_schedules);

-- 2. Delete installation_schedules linked to kit_schedules
DELETE FROM installation_schedules
WHERE kit_schedule_id IN (SELECT id FROM kit_schedules);

-- 3. Delete production_items linked to kit_schedules
DELETE FROM production_items
WHERE kit_schedule_id IN (SELECT id FROM kit_schedules);

-- 4. Delete all kit_schedules
DELETE FROM kit_schedules;

-- 5. Delete accessories linked to incoming_vehicles
DELETE FROM accessories
WHERE vehicle_id IN (SELECT id FROM incoming_vehicles);

-- 6. Unlink homologation_cards from incoming_vehicles
UPDATE homologation_cards SET incoming_vehicle_id = NULL
WHERE incoming_vehicle_id IN (SELECT id FROM incoming_vehicles);

-- 7. Delete all incoming_vehicles
DELETE FROM incoming_vehicles;

-- 8. Reset customers show_in_planning flag
UPDATE customers SET show_in_planning = false WHERE show_in_planning = true;
