CREATE OR REPLACE FUNCTION public.apply_accessory_homologation_exemption(p_vehicle_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_id uuid;
  v_has_accessories boolean;
  v_all_exempt boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.accessories a
    WHERE a.vehicle_id = p_vehicle_id
      AND COALESCE(public.normalize_item_name(a.categories), '') <> 'modulos'
  ) INTO v_has_accessories;

  IF NOT v_has_accessories THEN
    RETURN false;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.accessories a
    WHERE a.vehicle_id = p_vehicle_id
      AND COALESCE(public.normalize_item_name(a.categories), '') <> 'modulos'
      AND NOT EXISTS (
        SELECT 1
        FROM public.kit_item_options k
        WHERE k.item_type = 'accessory'
          AND public.normalize_item_name(k.item_name) = public.normalize_item_name(a.name)
          AND k.requires_homologation = false
      )
  ) INTO v_all_exempt;

  IF NOT v_all_exempt THEN
    RETURN false;
  END IF;

  v_card_id := public.ensure_homologation_card(p_vehicle_id);

  IF v_card_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.homologation_cards
  SET status = 'homologado',
      notes = 'Homologação dispensada automaticamente: todos os acessórios vinculados estão configurados para avanço direto ao Planejamento.',
      updated_at = now()
  WHERE id = v_card_id;

  UPDATE public.incoming_vehicles
  SET created_homologation_id = v_card_id,
      homologation_status = 'homologado'
  WHERE id = p_vehicle_id;

  PERFORM public.ensure_planning_customer_for_vehicle(p_vehicle_id);
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_accessory_homologation_exemption(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_accessory_homologation_exemption(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_accessory_homologation_exemption(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_apply_accessory_homologation_exemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kickoff_completed = true
     AND (TG_OP = 'INSERT' OR OLD.kickoff_completed IS DISTINCT FROM true) THEN
    PERFORM public.apply_accessory_homologation_exemption(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_accessory_homologation_exemption ON public.incoming_vehicles;
CREATE TRIGGER trg_accessory_homologation_exemption
AFTER INSERT OR UPDATE OF kickoff_completed ON public.incoming_vehicles
FOR EACH ROW EXECUTE FUNCTION public.trg_apply_accessory_homologation_exemption();