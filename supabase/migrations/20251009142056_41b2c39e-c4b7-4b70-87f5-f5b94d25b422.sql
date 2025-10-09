-- Create trigger to auto-create Planning customer when incoming_vehicle matches existing homologated card
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
  -- Only process Segsale vehicles (with id_resumo_venda)
  IF NEW.id_resumo_venda IS NULL THEN
    RAISE NOTICE 'Skipping auto-planning for incoming_vehicle %: no id_resumo_venda', NEW.id;
    RETURN NEW;
  END IF;

  -- Look for an existing homologated card matching this brand/model
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

  -- If we found a homologated card, auto-create Planning customer
  IF homologated_card IS NOT NULL THEN
    RAISE NOTICE 'Found homologated card % for incoming_vehicle %, auto-creating Planning customer', homologated_card.id, NEW.id;

    -- Try to find existing customer by CPF/CNPJ and id_resumo_venda
    IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(NEW.cpf, '.', ''), '-', ''), '/', '')
        AND (id_resumo_venda = NEW.id_resumo_venda OR id_resumo_venda IS NULL)
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      customer_id := existing_customer_id;

      -- Update customer core data and mark for Planning
      UPDATE customers
      SET 
        id_resumo_venda = COALESCE(id_resumo_venda, NEW.id_resumo_venda),
        company_name = COALESCE(company_name, NEW.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), NEW.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), NEW.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), NEW.address_city, address_city),
        show_in_planning = true
      WHERE id = customer_id;

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
      WHERE id = customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', NEW.brand,
            'model', NEW.vehicle
          )
        ));

      RAISE NOTICE 'Updated existing Planning customer % for id_resumo_venda %', customer_id, NEW.id_resumo_venda;
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
      ) RETURNING id INTO customer_id;

      RAISE NOTICE 'Created new Planning customer % for id_resumo_venda % (auto from homologated)', customer_id, NEW.id_resumo_venda;
    END IF;
  ELSE
    RAISE NOTICE 'No homologated card found for incoming_vehicle % (brand=%, model=%)', NEW.id, NEW.brand, NEW.vehicle;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on incoming_vehicles table
DROP TRIGGER IF EXISTS trigger_auto_create_planning_customer ON incoming_vehicles;
CREATE TRIGGER trigger_auto_create_planning_customer
  AFTER INSERT ON incoming_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_planning_customer_from_incoming();