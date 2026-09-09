ALTER TABLE public.homologation_cards DROP CONSTRAINT IF EXISTS homologation_cards_brand_model_year_key;

CREATE OR REPLACE FUNCTION public.ensure_homologation_card(p_vehicle_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_card record;
  v_ref record;
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

  -- 2) Não existe: cria um card próprio para este veículo
  IF NOT FOUND THEN
    SELECT id, status, configuration, equipment_model INTO v_ref
    FROM public.homologation_cards
    WHERE deleted_at IS NULL
      AND upper(trim(brand)) = v_brand
      AND upper(trim(model)) = v_model
      AND coalesce(year, 0) = coalesce(v.year, 0)
    ORDER BY (status = 'homologado') DESC, updated_at DESC
    LIMIT 1;

    INSERT INTO public.homologation_cards (brand, model, year, status, incoming_vehicle_id, configuration, equipment_model, notes)
    VALUES (
      v_brand,
      v_model,
      v.year,
      CASE WHEN v_ref.status = 'homologado' THEN 'homologado'::homologation_status ELSE 'homologar'::homologation_status END,
      p_vehicle_id,
      v_ref.configuration,
      v_ref.equipment_model,
      CASE WHEN v_ref.status = 'homologado'
        THEN 'Criado automaticamente após kickoff de ' || coalesce(v.company_name, 'cliente') || '. Modelo já homologado anteriormente.'
        ELSE 'Criado automaticamente após conclusão do kickoff de ' || coalesce(v.company_name, 'cliente') || '.'
      END
    )
    RETURNING id, status INTO v_card;
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