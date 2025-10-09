-- Create triggers to keep Planning (customers.show_in_planning) in sync with homologation status
DO $$
BEGIN
  -- Create trigger for creating/removing Planning customers on homologation status changes
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_planning_from_homologation'
  ) THEN
    CREATE TRIGGER trg_planning_from_homologation
    AFTER INSERT OR UPDATE ON public.homologation_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.create_planning_customer_from_homologation();
  END IF;

  -- Create trigger to handle ancillary effects (cancel schedules, ensure visibility toggling)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_homologation_status_change'
  ) THEN
    CREATE TRIGGER trg_handle_homologation_status_change
    AFTER UPDATE ON public.homologation_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_homologation_status_change();
  END IF;

  -- Create trigger to auto-create Planning customers when Segsale incoming arrives and a homologated card exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_create_planning_customer_from_incoming'
  ) THEN
    CREATE TRIGGER trg_auto_create_planning_customer_from_incoming
    AFTER INSERT ON public.incoming_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_planning_customer_from_incoming();
  END IF;
END $$;

-- Backfill: ensure only customers linked to a homologated card remain visible in Planning
-- 1) Mark visible when there IS a homologated card linked through incoming_vehicles
UPDATE public.customers c
SET show_in_planning = true
WHERE c.id_resumo_venda IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.incoming_vehicles iv
    JOIN public.homologation_cards hc ON hc.incoming_vehicle_id = iv.id
    WHERE iv.id_resumo_venda = c.id_resumo_venda
      AND hc.status = 'homologado'
  );

-- 2) Hide when there is NO homologated card for that sale summary
UPDATE public.customers c
SET show_in_planning = false
WHERE c.id_resumo_venda IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.incoming_vehicles iv
    JOIN public.homologation_cards hc ON hc.incoming_vehicle_id = iv.id
    WHERE iv.id_resumo_venda = c.id_resumo_venda
      AND hc.status = 'homologado'
  );