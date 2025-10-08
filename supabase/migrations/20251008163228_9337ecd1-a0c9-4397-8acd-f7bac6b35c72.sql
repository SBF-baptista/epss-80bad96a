-- Update backfill function to handle duplicate customers better
CREATE OR REPLACE FUNCTION public.backfill_schedules_from_homologations()
RETURNS TABLE(card_id uuid, created_customer boolean, created_schedule boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
  incoming_vehicle_record RECORD;
  accessories_list text[];
  default_kit_id uuid;
  default_technician_id uuid;
  customer_id uuid;
  existing_customer_id uuid;
  schedule_exists boolean;
  unique_doc_number text;
BEGIN
  FOR rec IN 
    SELECT hc.*
    FROM homologation_cards hc
    WHERE hc.status = 'homologado'
  LOOP
    -- Get incoming vehicle
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = rec.incoming_vehicle_id;

    -- If no incoming vehicle, skip
    IF incoming_vehicle_record IS NULL THEN
      CONTINUE;
    END IF;

    -- Accessories near received_at window
    SELECT array_agg(accessory_name || ' (qty: ' || quantity::text || ')')
    INTO accessories_list
    FROM accessories
    WHERE company_name = incoming_vehicle_record.company_name
      AND received_at >= incoming_vehicle_record.received_at - INTERVAL '1 day'
      AND received_at <= incoming_vehicle_record.received_at + INTERVAL '1 day';

    -- Find a kit
    SELECT id INTO default_kit_id
    FROM homologation_kits
    WHERE homologation_card_id = rec.id
    LIMIT 1;

    IF default_kit_id IS NULL THEN
      SELECT id INTO default_kit_id
      FROM homologation_kits
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    -- Find a technician
    SELECT id INTO default_technician_id
    FROM technicians
    ORDER BY created_at DESC
    LIMIT 1;

    -- If missing requirements, skip
    IF default_kit_id IS NULL OR default_technician_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Try to find or create customer
    existing_customer_id := NULL;
    
    -- Create a unique document number to avoid duplicates
    IF incoming_vehicle_record.cpf IS NOT NULL AND incoming_vehicle_record.cpf != '' THEN
      unique_doc_number := REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', '');
    ELSE
      -- Use company name + vehicle as unique identifier for customers without CPF
      unique_doc_number := 'NO_CPF_' || UPPER(REPLACE(COALESCE(incoming_vehicle_record.company_name, 'CLIENTE'), ' ', '_')) || '_' || rec.id::text;
    END IF;
    
    -- Try to find existing customer
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE document_number = unique_doc_number
    LIMIT 1;

    IF existing_customer_id IS NOT NULL THEN
      customer_id := existing_customer_id;
      -- Append vehicle if not present
      UPDATE customers
      SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', incoming_vehicle_record.brand,
          'model', incoming_vehicle_record.vehicle,
          'year', COALESCE(incoming_vehicle_record.year, 2024),
          'plate', 'Placa pendente',
          'scheduled', false
        )
      )
      WHERE id = customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', incoming_vehicle_record.brand,
            'model', incoming_vehicle_record.vehicle
          )
        ));
    ELSE
      -- Create new customer with unique document number
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
        vehicles
      ) VALUES (
        COALESCE(incoming_vehicle_record.company_name, 'Cliente não identificado'),
        unique_doc_number,
        CASE 
          WHEN LENGTH(unique_doc_number) = 14 AND unique_doc_number NOT LIKE 'NO_CPF_%' THEN 'cnpj'
          WHEN LENGTH(unique_doc_number) = 11 AND unique_doc_number NOT LIKE 'NO_CPF_%' THEN 'cpf'
          ELSE 'cpf'
        END,
        COALESCE(incoming_vehicle_record.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(incoming_vehicle_record.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(incoming_vehicle_record.address_street, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_number, 'S/N'),
        COALESCE(incoming_vehicle_record.address_district, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_city, 'Não informado'),
        'SP',
        COALESCE(incoming_vehicle_record.address_zip_code, '00000-000'),
        incoming_vehicle_record.address_complement,
        incoming_vehicle_record.company_name,
        jsonb_build_array(
          jsonb_build_object(
            'brand', incoming_vehicle_record.brand,
            'model', incoming_vehicle_record.vehicle,
            'year', COALESCE(incoming_vehicle_record.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        )
      ) RETURNING id INTO customer_id;
    END IF;

    -- Avoid duplicate schedules for this card
    SELECT EXISTS (
      SELECT 1 FROM kit_schedules 
      WHERE notes ILIKE '%' || rec.id::text || '%'
    ) INTO schedule_exists;

    IF NOT schedule_exists THEN
      INSERT INTO kit_schedules (
        kit_id,
        technician_id,
        scheduled_date,
        status,
        customer_id,
        customer_name,
        customer_document_number,
        customer_phone,
        customer_email,
        installation_address_street,
        installation_address_number,
        installation_address_neighborhood,
        installation_address_city,
        installation_address_state,
        installation_address_postal_code,
        installation_address_complement,
        vehicle_brand,
        vehicle_model,
        vehicle_year,
        vehicle_plate,
        accessories,
        notes
      ) VALUES (
        default_kit_id,
        default_technician_id,
        CURRENT_DATE + INTERVAL '7 days',
        'scheduled',
        customer_id,
        COALESCE(incoming_vehicle_record.company_name, 'Cliente não identificado'),
        COALESCE(incoming_vehicle_record.cpf, 'Não informado'),
        COALESCE(incoming_vehicle_record.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(incoming_vehicle_record.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(incoming_vehicle_record.address_street, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_number, 'S/N'),
        COALESCE(incoming_vehicle_record.address_district, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_city, 'Não informado'),
        'SP',
        COALESCE(incoming_vehicle_record.address_zip_code, '00000-000'),
        incoming_vehicle_record.address_complement,
        rec.brand,
        rec.model,
        rec.year,
        'Placa pendente',
        COALESCE(accessories_list, ARRAY[]::text[]),
        'Agendamento criado automaticamente (backfill) a partir da homologação #' || rec.id
      );
    END IF;

    RETURN QUERY SELECT rec.id, (existing_customer_id IS NULL) AS created_customer, (NOT schedule_exists) AS created_schedule;
  END LOOP;
END;
$$;