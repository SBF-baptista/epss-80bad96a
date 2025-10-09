-- Update trigger to only manage Planning customers, not create schedules
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
  -- Only process Segsale vehicles (with id_resumo_venda)
  IF NEW.id_resumo_venda IS NULL THEN
    RAISE NOTICE 'Skipping non-Segsale vehicle %', NEW.id;
    RETURN NEW;
  END IF;

  -- CASE 1: Status is 'homologado' - add to Planning (NO automatic schedule)
  IF NEW.homologation_status = 'homologado' THEN
    RAISE NOTICE 'Incoming vehicle % is homologado, adding to Planning', NEW.id;

    -- Try to find existing customer by id_resumo_venda or CPF/CNPJ
    existing_customer_id := NULL;
    
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE id_resumo_venda = NEW.id_resumo_venda
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
        id_resumo_venda = COALESCE(id_resumo_venda, NEW.id_resumo_venda),
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

      RAISE NOTICE 'Updated existing Planning customer % for id_resumo_venda %', v_customer_id, NEW.id_resumo_venda;
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
        NEW.id_resumo_venda,
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

      RAISE NOTICE 'Created new Planning customer % for id_resumo_venda %', v_customer_id, NEW.id_resumo_venda;
    END IF;

    -- NOTE: No automatic schedule creation - must be done manually in Planning page

  -- CASE 2: Status is NOT 'homologado' - remove from Planning
  ELSIF OLD IS NOT NULL AND OLD.homologation_status = 'homologado' AND NEW.homologation_status != 'homologado' THEN
    RAISE NOTICE 'Incoming vehicle % no longer homologado, removing from Planning', NEW.id;

    -- Mark customer as not visible in Planning
    UPDATE customers
    SET show_in_planning = false
    WHERE id_resumo_venda = NEW.id_resumo_venda;

    RAISE NOTICE 'Customer with id_resumo_venda % removed from Planning', NEW.id_resumo_venda;
  END IF;

  RETURN NEW;
END;
$function$;