-- Remove FK references from homologation_cards
UPDATE homologation_cards SET incoming_vehicle_id = NULL WHERE incoming_vehicle_id IN (SELECT id FROM incoming_vehicles);

-- Remove FK references from kit_schedules  
UPDATE kit_schedules SET incoming_vehicle_id = NULL WHERE incoming_vehicle_id IN (SELECT id FROM incoming_vehicles);

-- Clear accessories linked to incoming_vehicles
DELETE FROM accessories WHERE vehicle_id IN (SELECT id FROM incoming_vehicles);

-- Clear incoming_vehicles
DELETE FROM incoming_vehicles;