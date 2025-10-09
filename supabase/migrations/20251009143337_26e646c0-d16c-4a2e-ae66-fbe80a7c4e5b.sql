-- Fix trigger to ensure customers reappear in Planning when card returns to homologado
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
      -- Try to find existing customer by CPF/CNPJ OR by id_resumo_venda
      existing_customer_id := NULL;
      
      -- First try by id_resumo_venda (most reliable for Segsale)
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE id_resumo_venda = source_vehicle.id_resumo_venda
      LIMIT 1;
      
      -- If not found, try by CPF/CNPJ
      IF existing_customer_id IS NULL AND source_vehicle.cpf IS NOT NULL AND source_vehicle.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(source_vehicle.cpf, '.', ''), '-', ''), '/', '')
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;

        -- CRITICAL FIX: Always mark existing customer for Planning when returning to homologado
        UPDATE customers
        SET 
          id_resumo_venda = COALESCE(id_resumo_venda, source_vehicle.id_resumo_venda),
          company_name = COALESCE(company_name, source_vehicle.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), source_vehicle.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), source_vehicle.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), source_vehicle.address_city, address_city),
          show_in_planning = true  -- CRITICAL: Always set to true when returning to homologado
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

        RAISE NOTICE 'Updated existing customer % (show_in_planning=true) for id_resumo_venda %', customer_id, source_vehicle.id_resumo_venda;
      ELSE
        -- Create new Planning customer
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

        RAISE NOTICE 'Created new Segsale customer % for id_resumo_venda % and marked for Planning', customer_id, source_vehicle.id_resumo_venda;
      END IF;

      RAISE NOTICE 'Planning customer processed for homologation %', NEW.id;
    ELSE
      RAISE NOTICE 'Skipping homologation %: no Segsale data (no matching id_resumo_venda found)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;