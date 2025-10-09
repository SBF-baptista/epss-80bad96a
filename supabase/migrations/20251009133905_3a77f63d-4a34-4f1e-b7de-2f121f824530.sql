-- Add show_in_planning flag to customers to control Planning visibility
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS show_in_planning boolean NOT NULL DEFAULT false;

-- Update function: create_kit_schedule_from_homologation
-- Now it will ONLY create/update the customer for Segsale vehicles and mark it for Planning (show_in_planning = true).
-- It will NOT auto-create kit_schedules anymore. Orders will only appear after manual scheduling in Planning.
CREATE OR REPLACE FUNCTION public.create_kit_schedule_from_homologation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  accessories_list text[];
  default_technician_id uuid;
  customer_id uuid;
  existing_customer_id uuid;
  existing_schedule_count int;
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
          show_in_planning = true
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
          show_in_planning
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
          true
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

-- Update function: handle_homologation_status_change
-- Add logic to remove customers from Planning when homologation is reverted from 'homologado'
CREATE OR REPLACE FUNCTION public.handle_homologation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
BEGIN
  -- If status changed FROM 'homologado' to something else, cancel associated kit schedules (existing behavior)
  IF OLD.status = 'homologado' AND NEW.status != 'homologado' THEN
    UPDATE kit_schedules
    SET status = 'cancelled',
        notes = COALESCE(notes, '') || ' | Cancelado automaticamente: homologação revertida em ' || NOW()
    WHERE notes ILIKE '%' || NEW.id::text || '%'
      AND status IN ('scheduled', 'confirmed');

    RAISE NOTICE 'Cancelled kit schedules for homologation card % due to status change', NEW.id;

    -- Also mark related Segsale customer as not visible in Planning
    IF NEW.incoming_vehicle_id IS NOT NULL THEN
      SELECT * INTO incoming_vehicle_record
      FROM incoming_vehicles
      WHERE id = NEW.incoming_vehicle_id;

      IF incoming_vehicle_record.id_resumo_venda IS NOT NULL THEN
        UPDATE customers
        SET show_in_planning = false
        WHERE id_resumo_venda = incoming_vehicle_record.id_resumo_venda;
        RAISE NOTICE 'Customer(s) with id_resumo_venda % removed from Planning due to homologation revert', incoming_vehicle_record.id_resumo_venda;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;