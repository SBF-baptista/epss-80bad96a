-- Permitir que kit_schedules possam ser criados sem kit
ALTER TABLE kit_schedules 
ALTER COLUMN kit_id DROP NOT NULL;

-- Recriar a função para não requerer kit
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
BEGIN
  -- Only proceed if status changed TO 'homologado' and from a different status
  IF NEW.status = 'homologado' AND (OLD.status IS NULL OR OLD.status != 'homologado') THEN
    
    -- Get the incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL AND incoming_vehicle_record.id_resumo_venda IS NOT NULL THEN
      -- Only process vehicles that come from Segsale
      
      -- Get accessories for this vehicle/company
      SELECT array_agg(accessory_name || ' (qty: ' || quantity::text || ')')
      INTO accessories_list
      FROM accessories
      WHERE company_name = incoming_vehicle_record.company_name
        AND received_at >= incoming_vehicle_record.received_at - INTERVAL '1 day'
        AND received_at <= incoming_vehicle_record.received_at + INTERVAL '1 day';
      
      -- Get default technician
      SELECT id INTO default_technician_id
      FROM technicians
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF default_technician_id IS NOT NULL THEN
        
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
          
          -- Update customer with Segsale ID if missing
          UPDATE customers
          SET id_resumo_venda = incoming_vehicle_record.id_resumo_venda,
              company_name = COALESCE(company_name, incoming_vehicle_record.company_name),
              phone = COALESCE(NULLIF(phone, 'Não informado'), incoming_vehicle_record.phone, phone),
              address_street = COALESCE(NULLIF(address_street, 'Não informado'), incoming_vehicle_record.address_street, address_street),
              address_city = COALESCE(NULLIF(address_city, 'Não informado'), incoming_vehicle_record.address_city, address_city)
          WHERE id = customer_id;
          
          -- Add vehicle if not already present
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
          -- Create new customer with Segsale tracking
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
            vehicles
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
            )
          ) RETURNING id INTO customer_id;
          
          RAISE NOTICE 'Created Segsale customer % for id_resumo_venda %', customer_id, incoming_vehicle_record.id_resumo_venda;
        END IF;
        
        -- Create kit schedule WITHOUT requiring a kit
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
          NULL, -- Kit agora é opcional
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
          incoming_vehicle_record.brand,
          incoming_vehicle_record.vehicle,
          incoming_vehicle_record.year,
          'Placa pendente',
          COALESCE(accessories_list, ARRAY[]::text[]),
          'Agendamento Segsale #' || incoming_vehicle_record.id_resumo_venda || ' - ' || NEW.brand || ' ' || NEW.model
        );
        
        RAISE NOTICE 'Kit schedule created from Segsale homologation for customer % (id_resumo_venda: %)', customer_id, incoming_vehicle_record.id_resumo_venda;
      ELSE
        RAISE NOTICE 'Cannot create schedule: missing technician';
      END IF;
    ELSE
      RAISE NOTICE 'Skipping homologation %: no Segsale data (id_resumo_venda is NULL)', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;