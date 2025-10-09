-- Fix all database functions to use new column names (sale_summary_id and pending_contract_id)

-- 1. Update auto_schedule_from_incoming_vehicle trigger
CREATE OR REPLACE FUNCTION public.auto_schedule_from_incoming_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  existing_customer_id uuid;
BEGIN
  -- Only process Segsale vehicles (with sale_summary_id)
  IF NEW.sale_summary_id IS NULL THEN
    RAISE NOTICE 'Skipping non-Segsale vehicle %', NEW.id;
    RETURN NEW;
  END IF;

  -- CASE 1: Status is 'homologado' - add to Planning (NO automatic schedule)
  IF NEW.homologation_status = 'homologado' THEN
    RAISE NOTICE 'Incoming vehicle % is homologado, adding to Planning', NEW.id;

    -- Try to find existing customer by sale_summary_id or CPF/CNPJ
    existing_customer_id := NULL;
    
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE sale_summary_id = NEW.sale_summary_id
    LIMIT 1;
    
    IF existing_customer_id IS NULL AND NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), '/', '')
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      v_customer_id := existing_customer_id;

      -- Update customer and mark for Planning
      UPDATE customers
      SET 
        sale_summary_id = COALESCE(sale_summary_id, NEW.sale_summary_id),
        company_name = COALESCE(company_name, NEW.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), NEW.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), NEW.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), NEW.address_city, address_city),
        show_in_planning = true
      WHERE id = v_customer_id;

      -- Append vehicle if not present
      UPDATE customers
      SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', NEW.brand,
          'model', NEW.vehicle,
          'year', COALESCE(NEW.year, 2024),
          'plate', 'Placa pendente',
          'scheduled', false
        )
      )
      WHERE id = v_customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', NEW.brand,
            'model', NEW.vehicle
          )
        ));

      RAISE NOTICE 'Updated existing Planning customer % for sale_summary_id %', v_customer_id, NEW.sale_summary_id;
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
        sale_summary_id,
        vehicles,
        show_in_planning
      ) VALUES (
        COALESCE(NEW.company_name, 'Cliente não identificado'),
        COALESCE(REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
        CASE 
          WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(NEW.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
          ELSE 'cpf'
        END,
        COALESCE(NEW.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(NEW.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(NEW.address_street, 'Não informado'),
        COALESCE(NEW.address_number, 'S/N'),
        COALESCE(NEW.address_district, 'Não informado'),
        COALESCE(NEW.address_city, 'Não informado'),
        'SP',
        COALESCE(NEW.address_zip_code, '00000-000'),
        NEW.address_complement,
        NEW.company_name,
        NEW.sale_summary_id,
        jsonb_build_array(
          jsonb_build_object(
            'brand', NEW.brand,
            'model', NEW.vehicle,
            'year', COALESCE(NEW.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        ),
        true
      ) RETURNING id INTO v_customer_id;

      RAISE NOTICE 'Created new Planning customer % for sale_summary_id %', v_customer_id, NEW.sale_summary_id;
    END IF;

  -- CASE 2: Status is NOT 'homologado' - remove from Planning
  ELSIF OLD IS NOT NULL AND OLD.homologation_status = 'homologado' AND NEW.homologation_status != 'homologado' THEN
    RAISE NOTICE 'Incoming vehicle % no longer homologado, removing from Planning', NEW.id;

    -- Mark customer as not visible in Planning
    UPDATE customers
    SET show_in_planning = false
    WHERE sale_summary_id = NEW.sale_summary_id;

    RAISE NOTICE 'Customer with sale_summary_id % removed from Planning', NEW.sale_summary_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Update handle_homologation_status_change trigger
CREATE OR REPLACE FUNCTION public.handle_homologation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
BEGIN
  IF OLD.status = 'homologado' AND NEW.status != 'homologado' THEN
    UPDATE kit_schedules
    SET status = 'cancelled',
        notes = COALESCE(notes, '') || ' | Cancelado automaticamente: homologação revertida em ' || NOW()
    WHERE notes ILIKE '%' || NEW.id::text || '%'
      AND status IN ('scheduled', 'confirmed');

    RAISE NOTICE 'Cancelled kit schedules for homologation card % due to status change', NEW.id;

    IF NEW.incoming_vehicle_id IS NOT NULL THEN
      SELECT * INTO incoming_vehicle_record
      FROM incoming_vehicles
      WHERE id = NEW.incoming_vehicle_id;

      IF incoming_vehicle_record.sale_summary_id IS NOT NULL THEN
        UPDATE customers
        SET show_in_planning = false
        WHERE sale_summary_id = incoming_vehicle_record.sale_summary_id;
        RAISE NOTICE 'Customer(s) with sale_summary_id % removed from Planning due to homologation revert', incoming_vehicle_record.sale_summary_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Update create_kit_schedule_from_homologation trigger
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
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation card % status changed to homologado, preparing Planning customer (prefer Segsale)', NEW.id;

    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;

    IF incoming_vehicle_record IS NULL THEN
      RAISE NOTICE 'Skipping homologation %: no incoming_vehicle linked', NEW.id;
      RETURN NEW;
    END IF;

    IF incoming_vehicle_record.sale_summary_id IS NULL THEN
      SELECT * INTO segsale_vehicle_record
      FROM incoming_vehicles iv
      WHERE iv.sale_summary_id IS NOT NULL
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
        UPDATE homologation_cards
        SET incoming_vehicle_id = segsale_vehicle_record.id
        WHERE id = NEW.id;
        RAISE NOTICE 'Re-linked homologation % to Segsale incoming_vehicle % (sale_summary_id=%)', NEW.id, segsale_vehicle_record.id, segsale_vehicle_record.sale_summary_id;
      ELSE
        RAISE NOTICE 'No matching Segsale incoming_vehicle found for homologation %; keeping original link', NEW.id;
      END IF;
    END IF;

    SELECT * INTO source_vehicle
    FROM incoming_vehicles 
    WHERE id = (SELECT incoming_vehicle_id FROM homologation_cards WHERE id = NEW.id);

    IF source_vehicle IS NOT NULL AND source_vehicle.sale_summary_id IS NOT NULL THEN
      existing_customer_id := NULL;
      
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE sale_summary_id = source_vehicle.sale_summary_id
      LIMIT 1;
      
      IF existing_customer_id IS NULL AND source_vehicle.cpf IS NOT NULL AND source_vehicle.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(source_vehicle.cpf, '.', ''), '-', ''), '/', '')
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;

        UPDATE customers
        SET 
          sale_summary_id = COALESCE(sale_summary_id, source_vehicle.sale_summary_id),
          company_name = COALESCE(company_name, source_vehicle.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), source_vehicle.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), source_vehicle.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), source_vehicle.address_city, address_city),
          show_in_planning = true
        WHERE id = customer_id;

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

        RAISE NOTICE 'Updated existing customer % (show_in_planning=true) for sale_summary_id %', customer_id, source_vehicle.sale_summary_id;
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
          sale_summary_id,
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
          source_vehicle.sale_summary_id,
          jsonb_build_array(
            jsonb_build_object(
              'brand', source_vehicle.brand,
              'model', source_vehicle.vehicle,
              'year', COALESCE(source_vehicle.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            )
          ),
          true
        ) RETURNING id INTO customer_id;

        RAISE NOTICE 'Created new Segsale customer % for sale_summary_id % and marked for Planning', customer_id, source_vehicle.sale_summary_id;
      END IF;

      RAISE NOTICE 'Planning customer processed for homologation %', NEW.id;
    ELSE
      RAISE NOTICE 'Skipping homologation %: no Segsale data (no matching sale_summary_id found)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Update relink_homologations_to_segsale_incoming function
CREATE OR REPLACE FUNCTION public.relink_homologations_to_segsale_incoming()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND (iv.id IS NULL OR iv.sale_summary_id IS NULL)
  LOOP
    SELECT * INTO base_iv FROM incoming_vehicles WHERE id = rec.incoming_vehicle_id;

    SELECT * INTO src
    FROM incoming_vehicles iv2
    WHERE iv2.sale_summary_id IS NOT NULL
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
      UPDATE homologation_cards SET incoming_vehicle_id = src.id WHERE id = rec.id;

      existing_customer_id := NULL;
      IF src.cpf IS NOT NULL AND src.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(src.cpf, '.', ''), '-', ''), '/', '')
          AND (sale_summary_id = src.sale_summary_id OR sale_summary_id IS NULL)
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;
        UPDATE customers
        SET 
          sale_summary_id = COALESCE(sale_summary_id, src.sale_summary_id),
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
          sale_summary_id,
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
          src.sale_summary_id,
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
      RAISE NOTICE 'Backfilled Planning customer for homologation %, using incoming % (sale_summary_id=%)', rec.id, src.id, src.sale_summary_id;
    ELSE
      RAISE NOTICE 'No Segsale match found for homologation % during backfill', rec.id;
    END IF;
  END LOOP;

  RETURN affected;
END;
$function$;

-- 5. Update auto_create_planning_customer_from_incoming function
CREATE OR REPLACE FUNCTION public.auto_create_planning_customer_from_incoming()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  homologated_card RECORD;
  customer_id uuid;
  existing_customer_id uuid;
BEGIN
  IF NEW.sale_summary_id IS NULL THEN
    RAISE NOTICE 'Skipping auto-planning for incoming_vehicle %: no sale_summary_id', NEW.id;
    RETURN NEW;
  END IF;

  SELECT * INTO homologated_card
  FROM homologation_cards
  WHERE status = 'homologado'
    AND UPPER(TRIM(brand)) = UPPER(TRIM(NEW.brand))
    AND (
      UPPER(TRIM(model)) = UPPER(TRIM(NEW.vehicle))
      OR UPPER(TRIM(model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(NEW.vehicle, ' ', 1))) || '%'
      OR UPPER(TRIM(NEW.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(model, ' ', 1))) || '%'
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF homologated_card IS NOT NULL THEN
    RAISE NOTICE 'Found homologated card % for incoming_vehicle %, auto-creating Planning customer', homologated_card.id, NEW.id;

    IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), '/', '')
        AND (sale_summary_id = NEW.sale_summary_id OR sale_summary_id IS NULL)
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      customer_id := existing_customer_id;

      UPDATE customers
      SET 
        sale_summary_id = COALESCE(sale_summary_id, NEW.sale_summary_id),
        company_name = COALESCE(company_name, NEW.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), NEW.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), NEW.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), NEW.address_city, address_city),
        show_in_planning = true
      WHERE id = customer_id;

      UPDATE customers
      SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', NEW.brand,
          'model', NEW.vehicle,
          'year', COALESCE(NEW.year, 2024),
          'plate', 'Placa pendente',
          'scheduled', false
        )
      )
      WHERE id = customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', NEW.brand,
            'model', NEW.vehicle
          )
        ));

      RAISE NOTICE 'Updated existing Planning customer % for sale_summary_id %', customer_id, NEW.sale_summary_id;
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
        sale_summary_id,
        vehicles,
        show_in_planning
      ) VALUES (
        COALESCE(NEW.company_name, 'Cliente não identificado'),
        COALESCE(REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
        CASE 
          WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(NEW.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
          ELSE 'cpf'
        END,
        COALESCE(NEW.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(NEW.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(NEW.address_street, 'Não informado'),
        COALESCE(NEW.address_number, 'S/N'),
        COALESCE(NEW.address_district, 'Não informado'),
        COALESCE(NEW.address_city, 'Não informado'),
        'SP',
        COALESCE(NEW.address_zip_code, '00000-000'),
        NEW.address_complement,
        NEW.company_name,
        NEW.sale_summary_id,
        jsonb_build_array(
          jsonb_build_object(
            'brand', NEW.brand,
            'model', NEW.vehicle,
            'year', COALESCE(NEW.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        ),
        true
      ) RETURNING id INTO customer_id;

      RAISE NOTICE 'Created new Planning customer % for sale_summary_id % (auto from homologated)', customer_id, NEW.sale_summary_id;
    END IF;
  ELSE
    RAISE NOTICE 'No homologated card found for incoming_vehicle % (brand=%, model=%)', NEW.id, NEW.brand, NEW.vehicle;
  END IF;

  RETURN NEW;
END;
$function$;