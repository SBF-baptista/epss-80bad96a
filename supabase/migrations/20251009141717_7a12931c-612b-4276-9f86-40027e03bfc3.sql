-- Update function to handle fallback to a matching Segsale incoming_vehicle when current link lacks id_resumo_venda
CREATE OR REPLACE FUNCTION public.create_kit_schedule_from_homologation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  segsale_vehicle_record RECORD;
  customer_id uuid;
  existing_customer_id uuid;
  source_vehicle RECORD;
BEGIN
  -- Only proceed if status changed TO 'homologado' from ANY other status (or NULL for new records)
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation card % status changed to homologado, preparing Planning customer (prefer Segsale)', NEW.id;

    -- Get the incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;

    -- If no incoming vehicle linked, nothing we can do
    IF incoming_vehicle_record IS NULL THEN
      RAISE NOTICE 'Skipping homologation %: no incoming_vehicle linked', NEW.id;
      RETURN NEW;
    END IF;

    -- If the linked incoming vehicle has no id_resumo_venda, try to find a matching Segsale incoming vehicle
    IF incoming_vehicle_record.id_resumo_venda IS NULL THEN
      SELECT * INTO segsale_vehicle_record
      FROM incoming_vehicles iv
      WHERE iv.id_resumo_venda IS NOT NULL
        AND UPPER(TRIM(iv.brand)) = UPPER(TRIM(NEW.brand))
        AND (
          UPPER(TRIM(iv.vehicle)) = UPPER(TRIM(NEW.model))
          OR UPPER(TRIM(iv.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(NEW.model, ' ', 1))) || '%'
          OR UPPER(TRIM(NEW.model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(iv.vehicle, ' ', 1))) || '%'
        )
        AND (
          (incoming_vehicle_record.company_name IS NOT NULL AND iv.company_name = incoming_vehicle_record.company_name)
          OR (incoming_vehicle_record.cpf IS NOT NULL AND incoming_vehicle_record.cpf != '' AND iv.cpf = incoming_vehicle_record.cpf)
        )
      ORDER BY iv.received_at DESC
      LIMIT 1;

      IF segsale_vehicle_record IS NOT NULL THEN
        -- Re-link homologation to the Segsale incoming vehicle
        UPDATE homologation_cards
        SET incoming_vehicle_id = segsale_vehicle_record.id
        WHERE id = NEW.id;
        RAISE NOTICE 'Re-linked homologation % to Segsale incoming_vehicle % (id_resumo_venda=%)', NEW.id, segsale_vehicle_record.id, segsale_vehicle_record.id_resumo_venda;
      ELSE
        RAISE NOTICE 'No matching Segsale incoming_vehicle found for homologation %; keeping original link', NEW.id;
      END IF;
    END IF;

    -- Decide which vehicle record to use for Planning customer generation
    SELECT * INTO source_vehicle
    FROM incoming_vehicles 
    WHERE id = (SELECT incoming_vehicle_id FROM homologation_cards WHERE id = NEW.id);

    -- Only process if we have Segsale data (id_resumo_venda)
    IF source_vehicle IS NOT NULL AND source_vehicle.id_resumo_venda IS NOT NULL THEN
      -- Try to find existing customer by CPF/CNPJ and id_resumo_venda
      IF source_vehicle.cpf IS NOT NULL AND source_vehicle.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(source_vehicle.cpf, '.', ''), '-', ''), '/', '')
          AND (id_resumo_venda = source_vehicle.id_resumo_venda OR id_resumo_venda IS NULL)
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;

        -- Update customer core data and mark for Planning
        UPDATE customers
        SET 
          id_resumo_venda = COALESCE(id_resumo_venda, source_vehicle.id_resumo_venda),
          company_name = COALESCE(company_name, source_vehicle.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), source_vehicle.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), source_vehicle.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), source_vehicle.address_city, address_city),
          show_in_planning = true  -- Always set to true for Segsale customers
        WHERE id = customer_id;

        -- Append vehicle if not present
        UPDATE customers
        SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'brand', source_vehicle.brand,
            'model', source_vehicle.vehicle,
            'year', COALESCE(source_vehicle.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        )
        WHERE id = customer_id
          AND NOT (vehicles @> jsonb_build_array(
            jsonb_build_object(
              'brand', source_vehicle.brand,
              'model', source_vehicle.vehicle
            )
          ));
      ELSE
        -- Create new customer for Segsale and mark for Planning
        INSERT INTO customers (
          name,
          document_number,
          document_type,
          phone,
          email,
          address_street,
          address_number,
          address_neighborhood,
          address_city,
          address_state,
          address_postal_code,
          address_complement,
          company_name,
          id_resumo_venda,
          vehicles,
          show_in_planning
        ) VALUES (
          COALESCE(source_vehicle.company_name, 'Cliente não identificado'),
          COALESCE(REPLACE(REPLACE(REPLACE(source_vehicle.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
          CASE 
            WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(source_vehicle.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
            ELSE 'cpf'
          END,
          COALESCE(source_vehicle.phone, 'Não informado'),
          LOWER(REPLACE(COALESCE(source_vehicle.company_name, 'cliente'), ' ', '')) || '@email.com',
          COALESCE(source_vehicle.address_street, 'Não informado'),
          COALESCE(source_vehicle.address_number, 'S/N'),
          COALESCE(source_vehicle.address_district, 'Não informado'),
          COALESCE(source_vehicle.address_city, 'Não informado'),
          'SP',
          COALESCE(source_vehicle.address_zip_code, '00000-000'),
          source_vehicle.address_complement,
          source_vehicle.company_name,
          source_vehicle.id_resumo_venda,
          jsonb_build_array(
            jsonb_build_object(
              'brand', source_vehicle.brand,
              'model', source_vehicle.vehicle,
              'year', COALESCE(source_vehicle.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            )
          ),
          true  -- show_in_planning = true for all Segsale customers
        ) RETURNING id INTO customer_id;

        RAISE NOTICE 'Created Segsale customer % for id_resumo_venda % and marked for Planning', customer_id, source_vehicle.id_resumo_venda;
      END IF;

      -- DO NOT create kit_schedules automatically anymore
      RAISE NOTICE 'Skipping automatic kit_schedule creation for homologation % (manual scheduling required in Planning)', NEW.id;
    ELSE
      RAISE NOTICE 'Skipping homologation %: no Segsale data (no matching id_resumo_venda found)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill function to relink and create/update Planning customers for already homologated cards
CREATE OR REPLACE FUNCTION public.relink_homologations_to_segsale_incoming()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  src RECORD;
  base_iv RECORD;
  customer_id uuid;
  existing_customer_id uuid;
  affected integer := 0;
BEGIN
  FOR rec IN 
    SELECT hc.*
    FROM homologation_cards hc
    LEFT JOIN incoming_vehicles iv ON iv.id = hc.incoming_vehicle_id
    WHERE hc.status = 'homologado'
      AND (iv.id IS NULL OR iv.id_resumo_venda IS NULL)
  LOOP
    -- Use existing linked incoming as base for matching
    SELECT * INTO base_iv FROM incoming_vehicles WHERE id = rec.incoming_vehicle_id;

    -- Find Segsale incoming matching brand/model and company/cpf
    SELECT * INTO src
    FROM incoming_vehicles iv2
    WHERE iv2.id_resumo_venda IS NOT NULL
      AND UPPER(TRIM(iv2.brand)) = UPPER(TRIM(rec.brand))
      AND (
        UPPER(TRIM(iv2.vehicle)) = UPPER(TRIM(rec.model))
        OR UPPER(TRIM(iv2.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(rec.model, ' ', 1))) || '%'
        OR UPPER(TRIM(rec.model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(iv2.vehicle, ' ', 1))) || '%'
      )
      AND (
        (base_iv.company_name IS NOT NULL AND iv2.company_name = base_iv.company_name)
        OR (base_iv.cpf IS NOT NULL AND base_iv.cpf != '' AND iv2.cpf = base_iv.cpf)
      )
    ORDER BY iv2.received_at DESC
    LIMIT 1;

    IF src IS NOT NULL THEN
      -- Relink card
      UPDATE homologation_cards SET incoming_vehicle_id = src.id WHERE id = rec.id;

      -- Upsert customer and mark for planning
      existing_customer_id := NULL;
      IF src.cpf IS NOT NULL AND src.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(src.cpf, '.', ''), '-', ''), '/', '')
          AND (id_resumo_venda = src.id_resumo_venda OR id_resumo_venda IS NULL)
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;
        UPDATE customers
        SET 
          id_resumo_venda = COALESCE(id_resumo_venda, src.id_resumo_venda),
          company_name = COALESCE(company_name, src.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), src.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), src.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), src.address_city, address_city),
          show_in_planning = true
        WHERE id = customer_id;

        UPDATE customers
        SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'brand', src.brand,
            'model', src.vehicle,
            'year', COALESCE(src.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        )
        WHERE id = customer_id
          AND NOT (vehicles @> jsonb_build_array(
            jsonb_build_object(
              'brand', src.brand,
              'model', src.vehicle
            )
          ));
      ELSE
        INSERT INTO customers (
          name,
          document_number,
          document_type,
          phone,
          email,
          address_street,
          address_number,
          address_neighborhood,
          address_city,
          address_state,
          address_postal_code,
          address_complement,
          company_name,
          id_resumo_venda,
          vehicles,
          show_in_planning
        ) VALUES (
          COALESCE(src.company_name, 'Cliente não identificado'),
          COALESCE(REPLACE(REPLACE(REPLACE(src.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
          CASE 
            WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(src.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
            ELSE 'cpf'
          END,
          COALESCE(src.phone, 'Não informado'),
          LOWER(REPLACE(COALESCE(src.company_name, 'cliente'), ' ', '')) || '@email.com',
          COALESCE(src.address_street, 'Não informado'),
          COALESCE(src.address_number, 'S/N'),
          COALESCE(src.address_district, 'Não informado'),
          COALESCE(src.address_city, 'Não informado'),
          'SP',
          COALESCE(src.address_zip_code, '00000-000'),
          src.address_complement,
          src.company_name,
          src.id_resumo_venda,
          jsonb_build_array(
            jsonb_build_object(
              'brand', src.brand,
              'model', src.vehicle,
              'year', COALESCE(src.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            )
          ),
          true
        ) RETURNING id INTO customer_id;
      END IF;

      affected := affected + 1;
      RAISE NOTICE 'Backfilled Planning customer for homologation %, using incoming % (id_resumo_venda=%)', rec.id, src.id, src.id_resumo_venda;
    ELSE
      RAISE NOTICE 'No Segsale match found for homologation % during backfill', rec.id;
    END IF;
  END LOOP;

  RETURN affected;
END;
$$;

-- Execute backfill now
SELECT public.relink_homologations_to_segsale_incoming();