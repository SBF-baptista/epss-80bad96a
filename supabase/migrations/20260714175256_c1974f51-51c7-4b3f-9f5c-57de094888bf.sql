
CREATE OR REPLACE FUNCTION public.sync_kickoff_completed_from_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF NEW.vehicles_data IS NOT NULL AND jsonb_typeof(NEW.vehicles_data) = 'array' THEN
    SELECT array_agg((elem->>'id')::uuid)
      INTO v_ids
      FROM jsonb_array_elements(NEW.vehicles_data) AS elem
      WHERE elem ? 'id' AND (elem->>'id') ~ '^[0-9a-fA-F-]{36}$';

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
      UPDATE public.incoming_vehicles
        SET kickoff_completed = true
        WHERE id = ANY(v_ids)
          AND coalesce(kickoff_completed, false) = false;
    END IF;
  END IF;

  -- Fallback por sale_summary_id (garante que nenhum veículo da venda fique preso)
  IF NEW.sale_summary_id IS NOT NULL THEN
    UPDATE public.incoming_vehicles
      SET kickoff_completed = true
      WHERE sale_summary_id = NEW.sale_summary_id
        AND coalesce(kickoff_completed, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kickoff_completed ON public.kickoff_history;
CREATE TRIGGER trg_sync_kickoff_completed
  AFTER INSERT OR UPDATE ON public.kickoff_history
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_kickoff_completed_from_history();
