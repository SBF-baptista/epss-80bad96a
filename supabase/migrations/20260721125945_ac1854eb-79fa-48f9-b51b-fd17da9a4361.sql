-- 1) Remove duplicate triggers on public.incoming_vehicles that call the same
--    function (auto_create_planning_customer_from_incoming) three times per row.
--    Keep ONE canonical trigger with AFTER INSERT OR UPDATE semantics.
DROP TRIGGER IF EXISTS trg_auto_create_planning_customer_from_incoming ON public.incoming_vehicles;
DROP TRIGGER IF EXISTS trigger_auto_create_planning_customer         ON public.incoming_vehicles;
-- keep: auto_create_planning_from_incoming (AFTER INSERT OR UPDATE)

-- 2) Drop the redundant partial unique index on public.accessories
--    (vehicle_id, name) WHERE vehicle_id IS NOT NULL. It conflicts with the
--    canonical unique index (vehicle_id, name, categories) used by all
--    edge-function upserts and causes silent 23505 errors when the same
--    accessory name exists in two different categories.
DROP INDEX IF EXISTS public.idx_accessories_unique_vehicle_accessory;