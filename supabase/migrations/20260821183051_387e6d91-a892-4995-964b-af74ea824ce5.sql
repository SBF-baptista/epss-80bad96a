-- 1) Função central: garante o cliente no Planejamento para um veículo já com kickoff concluído
CREATE OR REPLACE FUNCTION public.ensure_planning_customer_for_vehicle(p_vehicle_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  iv RECORD;
  v_customer_id uuid;
BEGIN
  SELECT * INTO iv FROM incoming_vehicles WHERE id = p_vehicle_id;
  IF iv IS NULL OR iv.sale_summary_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_customer_id
  FROM customers
  WHERE sale_summary_id = iv.sale_summary_id
  LIMIT 1;

  IF v_customer_id IS NULL AND iv.cpf IS NOT NULL AND iv.cpf <> '' THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE document_number = REPLACE(REPLACE(REPLACE(iv.cpf, '.', ''), '-', ''), '/', '')
    LIMIT 1;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET sale_summary_id = COALESCE(sale_summary_id, iv.sale_summary_id),
        company_name    = COALESCE(company_name, iv.company_name),
        phone           = COALESCE(NULLIF(phone, 'Não informado'), iv.phone, phone),
        address_street  = COALESCE(NULLIF(address_street, 'Não informado'), iv.address_street, address_street),
        address_city    = COALESCE(NULLIF(address_city, 'Não informado'), iv.address_city, address_city),
        show_in_planning = true
    WHERE id = v_customer_id;
  ELSE
    INSERT INTO customers (
      name, document_number, document_type, phone, email,
      address_street, address_number, address_neighborhood, address_city,
      address_state, address_postal_code, address_complement,
      company_name, sale_summary_id, vehicles, show_in_planning
    ) VALUES (
      COALESCE(iv.company_name, 'Cliente não identificado'),
      COALESCE(NULLIF(REPLACE(REPLACE(REPLACE(COALESCE(iv.cpf,''), '.', ''), '-', ''), '/', ''), ''), '00000000000'),
      CASE WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(iv.cpf,''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj' ELSE 'cpf' END,
      COALESCE(iv.phone, 'Não informado'),
      LOWER(REPLACE(COALESCE(iv.company_name, 'cliente'), ' ', '')) || '@email.com',
      COALESCE(iv.address_street, 'Não informado'),
      COALESCE(iv.address_number, 'S/N'),
      COALESCE(iv.address_district, 'Não informado'),
      COALESCE(iv.address_city, 'Não informado'),
      'SP',
      COALESCE(iv.address_zip_code, '00000-000'),
      iv.address_complement,
      iv.company_name,
      iv.sale_summary_id,
      '[]'::jsonb,
      true
    ) RETURNING id INTO v_customer_id;
  END IF;

  -- adiciona o veículo (por placa) caso ainda não exista na lista
  UPDATE customers
  SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', iv.brand,
          'model', iv.vehicle,
          'year', COALESCE(iv.year, 2024),
          'plate', COALESCE(NULLIF(iv.plate, ''), 'Placa pendente'),
          'scheduled', false
        ))
  WHERE id = v_customer_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(vehicles, '[]'::jsonb)) e
      WHERE UPPER(TRIM(COALESCE(e->>'plate',''))) = UPPER(TRIM(COALESCE(NULLIF(iv.plate,''), 'Placa pendente')))
        AND UPPER(TRIM(COALESCE(e->>'model',''))) = UPPER(TRIM(COALESCE(iv.vehicle,'')))
    );

  RETURN v_customer_id;
END;
$function$;

-- 2) Quando um card vira 'homologado', joga TODOS os veículos equivalentes (mesma marca/modelo) para o Planejamento
CREATE OR REPLACE FUNCTION public.trg_planning_on_homologado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v RECORD;
BEGIN
  IF NEW.status = 'homologado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'homologado') THEN
    FOR v IN
      SELECT iv.id
      FROM incoming_vehicles iv
      WHERE iv.kickoff_completed = true
        AND iv.sale_summary_id IS NOT NULL
        AND (
          iv.id = NEW.incoming_vehicle_id
          OR (
            UPPER(TRIM(iv.brand)) = UPPER(TRIM(NEW.brand))
            AND (
              UPPER(TRIM(iv.vehicle)) = UPPER(TRIM(NEW.model))
              OR UPPER(TRIM(iv.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(NEW.model, ' ', 1))) || '%'
            )
          )
        )
    LOOP
      PERFORM public.ensure_planning_customer_for_vehicle(v.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_planning_on_homologado ON public.homologation_cards;
CREATE TRIGGER trg_planning_on_homologado
AFTER INSERT OR UPDATE OF status ON public.homologation_cards
FOR EACH ROW EXECUTE FUNCTION public.trg_planning_on_homologado();

-- 3) Quando o kickoff é concluído e já existe card homologado para o modelo, entra no Planejamento na hora
CREATE OR REPLACE FUNCTION public.trg_planning_on_kickoff_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kickoff_completed = true
     AND (TG_OP = 'INSERT' OR OLD.kickoff_completed IS DISTINCT FROM true)
     AND NEW.sale_summary_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM homologation_cards h
      WHERE h.deleted_at IS NULL AND h.status = 'homologado'
        AND UPPER(TRIM(h.brand)) = UPPER(TRIM(NEW.brand))
        AND (
          UPPER(TRIM(h.model)) = UPPER(TRIM(NEW.vehicle))
          OR UPPER(TRIM(NEW.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(h.model, ' ', 1))) || '%'
        )
    ) THEN
      PERFORM public.ensure_planning_customer_for_vehicle(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_planning_on_kickoff_completed ON public.incoming_vehicles;
CREATE TRIGGER trg_planning_on_kickoff_completed
AFTER INSERT OR UPDATE OF kickoff_completed ON public.incoming_vehicles
FOR EACH ROW EXECUTE FUNCTION public.trg_planning_on_kickoff_completed();

-- 4) Backfill dos veículos já homologados que ficaram fora do Planejamento
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT iv.id
    FROM incoming_vehicles iv
    JOIN homologation_cards h
      ON h.deleted_at IS NULL AND h.status = 'homologado'
     AND UPPER(TRIM(h.brand)) = UPPER(TRIM(iv.brand))
     AND (
       UPPER(TRIM(h.model)) = UPPER(TRIM(iv.vehicle))
       OR UPPER(TRIM(iv.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(h.model, ' ', 1))) || '%'
     )
    WHERE iv.kickoff_completed = true
      AND iv.sale_summary_id IS NOT NULL
  LOOP
    PERFORM public.ensure_planning_customer_for_vehicle(r.id);
  END LOOP;
END $$;