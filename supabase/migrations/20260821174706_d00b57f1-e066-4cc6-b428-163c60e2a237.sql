
CREATE OR REPLACE FUNCTION public.ensure_homologation_card(p_vehicle_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_card record;
  v_brand text;
  v_model text;
  v_card_id uuid;
  v_status homologation_status;
BEGIN
  SELECT * INTO v FROM public.incoming_vehicles WHERE id = p_vehicle_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_brand := upper(trim(coalesce(v.brand, '')));
  v_model := upper(trim(coalesce(v.vehicle, '')));

  -- 1) Card já vinculado a este veículo
  SELECT id, status INTO v_card
  FROM public.homologation_cards
  WHERE incoming_vehicle_id = p_vehicle_id AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2) Card existente do mesmo modelo/ano (chave única brand/model/year)
  IF NOT FOUND THEN
    SELECT id, status INTO v_card
    FROM public.homologation_cards
    WHERE deleted_at IS NULL
      AND upper(trim(brand)) = v_brand
      AND upper(trim(model)) = v_model
      AND coalesce(year, 0) = coalesce(v.year, 0)
    ORDER BY (status = 'homologado') DESC, updated_at DESC
    LIMIT 1;

    -- 3) Não existe: cria
    IF NOT FOUND THEN
      INSERT INTO public.homologation_cards (brand, model, year, status, incoming_vehicle_id, notes)
      VALUES (
        v_brand, v_model, v.year, 'homologar'::homologation_status, p_vehicle_id,
        'Criado automaticamente após conclusão do kickoff de ' || coalesce(v.company_name, 'cliente') || '.'
      )
      ON CONFLICT (brand, model, year) DO NOTHING
      RETURNING id, status INTO v_card;

      IF v_card.id IS NULL THEN
        SELECT id, status INTO v_card
        FROM public.homologation_cards
        WHERE brand = v_brand AND model = v_model
          AND coalesce(year, 0) = coalesce(v.year, 0)
        LIMIT 1;
      END IF;
    END IF;

    -- vincula o card ao veículo quando o card ainda não tem veículo
    IF v_card.id IS NOT NULL THEN
      UPDATE public.homologation_cards
        SET incoming_vehicle_id = p_vehicle_id,
            deleted_at = NULL
        WHERE id = v_card.id AND incoming_vehicle_id IS NULL;
    END IF;
  END IF;

  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_card_id := v_card.id;
  v_status := v_card.status;

  UPDATE public.incoming_vehicles
    SET created_homologation_id = v_card_id,
        homologation_status = v_status
    WHERE id = p_vehicle_id
      AND (created_homologation_id IS DISTINCT FROM v_card_id
           OR homologation_status IS DISTINCT FROM v_status);

  RETURN v_card_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_ensure_homologation_on_kickoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.kickoff_completed, false) = true
     AND coalesce(OLD.kickoff_completed, false) = false THEN
    PERFORM public.ensure_homologation_card(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_homologation_on_kickoff ON public.incoming_vehicles;
CREATE TRIGGER trg_ensure_homologation_on_kickoff
AFTER UPDATE OF kickoff_completed ON public.incoming_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.trg_ensure_homologation_on_kickoff();

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT v.id
    FROM public.incoming_vehicles v
    WHERE v.kickoff_completed = true
      AND (v.created_homologation_id IS NULL
           OR NOT EXISTS (SELECT 1 FROM public.homologation_cards h
                          WHERE h.id = v.created_homologation_id AND h.deleted_at IS NULL))
    ORDER BY v.received_at
  LOOP
    PERFORM public.ensure_homologation_card(r.id);
  END LOOP;
END $$;
