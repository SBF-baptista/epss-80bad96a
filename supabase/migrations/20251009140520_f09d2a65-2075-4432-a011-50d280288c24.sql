
-- Fix the trigger to always set show_in_planning = true for Segsale customers
-- Also backfill existing Segsale customers without show_in_planning

-- First, backfill existing customers from homologated cards that should be in Planning
DO $$
DECLARE
  hc_record RECORD;
  iv_record RECORD;
  existing_customer_id uuid;
  doc_number text;
BEGIN
  -- Loop through all homologated cards with Segsale data
  FOR hc_record IN 
    SELECT hc.*, iv.id_resumo_venda, iv.cpf, iv.company_name, iv.phone, iv.address_street, 
           iv.address_number, iv.address_district, iv.address_city, iv.address_zip_code, 
           iv.address_complement, iv.year, iv.brand, iv.vehicle
    FROM homologation_cards hc
    JOIN incoming_vehicles iv ON hc.incoming_vehicle_id = iv.id
    WHERE hc.status = 'homologado'
      AND iv.id_resumo_venda IS NOT NULL
  LOOP
    -- Clean document number
    IF hc_record.cpf IS NOT NULL AND hc_record.cpf != '' THEN
      doc_number := REPLACE(REPLACE(REPLACE(hc_record.cpf, '.', ''), '-', ''), '/', '');
    ELSE
      doc_number := 'NO_CPF_' || UPPER(REPLACE(COALESCE(hc_record.company_name, 'CLIENTE'), ' ', '_')) || '_' || hc_record.id::text;
    END IF;

    -- Check if customer exists
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE document_number = doc_number
       OR id_resumo_venda = hc_record.id_resumo_venda
    LIMIT 1;

    IF existing_customer_id IS NOT NULL THEN
      -- Update existing customer
      UPDATE customers
      SET 
        id_resumo_venda = COALESCE(id_resumo_venda, hc_record.id_resumo_venda),
        show_in_planning = true,
        company_name = COALESCE(company_name, hc_record.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), hc_record.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), hc_record.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), hc_record.address_city, address_city),
        vehicles = COALESCE(vehicles, '[]'::jsonb) || 
          CASE 
            WHEN NOT (vehicles @> jsonb_build_array(jsonb_build_object('brand', hc_record.brand, 'model', hc_record.model)))
            THEN jsonb_build_array(jsonb_build_object(
              'brand', hc_record.brand,
              'model', hc_record.model,
              'year', COALESCE(hc_record.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            ))
            ELSE '[]'::jsonb
          END
      WHERE id = existing_customer_id;
      
      RAISE NOTICE 'Updated existing customer % for id_resumo_venda %', existing_customer_id, hc_record.id_resumo_venda;
    ELSE
      -- Create new customer
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
        COALESCE(hc_record.company_name, 'Cliente não identificado'),
        doc_number,
        CASE 
          WHEN LENGTH(doc_number) = 14 AND doc_number NOT LIKE 'NO_CPF_%' THEN 'cnpj'
          WHEN LENGTH(doc_number) = 11 AND doc_number NOT LIKE 'NO_CPF_%' THEN 'cpf'
          ELSE 'cpf'
        END,
        COALESCE(hc_record.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(hc_record.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(hc_record.address_street, 'Não informado'),
        COALESCE(hc_record.address_number, 'S/N'),
        COALESCE(hc_record.address_district, 'Não informado'),
        COALESCE(hc_record.address_city, 'Não informado'),
        'SP',
        COALESCE(hc_record.address_zip_code, '00000-000'),
        hc_record.address_complement,
        hc_record.company_name,
        hc_record.id_resumo_venda,
        jsonb_build_array(
          jsonb_build_object(
            'brand', hc_record.brand,
            'model', hc_record.model,
            'year', COALESCE(hc_record.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        ),
        true  -- show_in_planning = true for Segsale customers
      );
      
      RAISE NOTICE 'Created new customer for id_resumo_venda % and marked for Planning', hc_record.id_resumo_venda;
    END IF;
  END LOOP;
END $$;

-- Now drop and recreate the trigger function with the fix
DROP FUNCTION IF EXISTS public.create_kit_schedule_from_homologation() CASCADE;

CREATE OR REPLACE FUNCTION public.create_kit_schedule_from_homologation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  customer_id uuid;
  existing_customer_id uuid;
BEGIN
  -- Only proceed if status changed TO 'homologado' from ANY other status (or NULL for new records)
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation card % status changed to homologado, preparing Planning customer (Segsale only)', NEW.id;

    -- Get the incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;

    -- Only process Segsale vehicles (have id_resumo_venda)
    IF incoming_vehicle_record IS NOT NULL AND incoming_vehicle_record.id_resumo_venda IS NOT NULL THEN
      -- Try to find existing customer by CPF/CNPJ and id_resumo_venda
      IF incoming_vehicle_record.cpf IS NOT NULL AND incoming_vehicle_record.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', '')
          AND (id_resumo_venda = incoming_vehicle_record.id_resumo_venda OR id_resumo_venda IS NULL)
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;

        -- Update customer core data and mark for Planning
        UPDATE customers
        SET 
          id_resumo_venda = COALESCE(id_resumo_venda, incoming_vehicle_record.id_resumo_venda),
          company_name = COALESCE(company_name, incoming_vehicle_record.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), incoming_vehicle_record.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), incoming_vehicle_record.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), incoming_vehicle_record.address_city, address_city),
          show_in_planning = true  -- CRITICAL FIX: Always set to true for Segsale customers
        WHERE id = customer_id;

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
          show_in_planning  -- CRITICAL FIX: Always set to true for Segsale customers
        ) VALUES (
          COALESCE(incoming_vehicle_record.company_name, 'Cliente não identificado'),
          COALESCE(REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
          CASE 
            WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(incoming_vehicle_record.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
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
          incoming_vehicle_record.id_resumo_venda,
          jsonb_build_array(
            jsonb_build_object(
              'brand', incoming_vehicle_record.brand,
              'model', incoming_vehicle_record.vehicle,
              'year', COALESCE(incoming_vehicle_record.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            )
          ),
          true  -- show_in_planning = true for all Segsale customers
        ) RETURNING id INTO customer_id;

        RAISE NOTICE 'Created Segsale customer % for id_resumo_venda % and marked for Planning', customer_id, incoming_vehicle_record.id_resumo_venda;
      END IF;

      -- DO NOT create kit_schedules automatically anymore
      RAISE NOTICE 'Skipping automatic kit_schedule creation for homologation % (manual scheduling required in Planning)', NEW.id;
    ELSE
      RAISE NOTICE 'Skipping homologation %: no Segsale data (id_resumo_venda is NULL or no incoming_vehicle)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_homologation_status_change_to_homologado
  AFTER INSERT OR UPDATE OF status ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_kit_schedule_from_homologation();
