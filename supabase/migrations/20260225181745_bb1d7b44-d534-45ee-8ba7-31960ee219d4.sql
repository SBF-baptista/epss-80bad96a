
-- 1. Desvincular homologation_cards dos veiculos pendentes
UPDATE public.homologation_cards 
SET incoming_vehicle_id = NULL 
WHERE incoming_vehicle_id IN (
  SELECT id FROM public.incoming_vehicles WHERE kickoff_completed = false
);

-- 2. Desvincular kit_schedules dos veiculos pendentes
UPDATE public.kit_schedules 
SET incoming_vehicle_id = NULL 
WHERE incoming_vehicle_id IN (
  SELECT id FROM public.incoming_vehicles WHERE kickoff_completed = false
);

-- 3. Excluir acessorios vinculados a veiculos pendentes
DELETE FROM public.accessories 
WHERE vehicle_id IN (
  SELECT id FROM public.incoming_vehicles WHERE kickoff_completed = false
);

-- 4. Excluir veiculos pendentes
DELETE FROM public.incoming_vehicles 
WHERE kickoff_completed = false;
