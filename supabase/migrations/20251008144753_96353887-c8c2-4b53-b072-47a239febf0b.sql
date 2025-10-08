-- Update trigger to create customers and link schedules properly
DROP FUNCTION IF EXISTS public.create_kit_schedule_from_homologation() CASCADE;

CREATE OR REPLACE FUNCTION public.create_kit_schedule_from_homologation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  accessories_list text[];
  default_kit_id uuid;
  default_technician_id uuid;
  customer_id uuid;
  existing_customer_id uuid;
  vehicle_info jsonb;
BEGIN
  -- Only proceed if status changed TO 'homologado' and no schedule was created yet
  IF NEW.status = 'homologado' AND (OLD.status IS NULL OR OLD.status != 'homologado') THEN
    
    -- Get the incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL THEN
      -- Get accessories for this vehicle/company
      SELECT array_agg(accessory_name || ' (qty: ' || quantity::text || ')')
      INTO accessories_list
      FROM accessories
      WHERE company_name = incoming_vehicle_record.company_name
        AND received_at >= incoming_vehicle_record.received_at - INTERVAL '1 day'
        AND received_at <= incoming_vehicle_record.received_at + INTERVAL '1 day';
      
      -- Get default kit (first available)
      SELECT id INTO default_kit_id
      FROM homologation_kits
      WHERE homologation_card_id = NEW.id
      LIMIT 1;
      
      -- If no kit linked to this card, get any kit
      IF default_kit_id IS NULL THEN
        SELECT id INTO default_kit_id
        FROM homologation_kits
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;
      
      -- Get default technician (first available)
      SELECT id INTO default_technician_id
      FROM technicians
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Only create schedule if we have required data
      IF default_kit_id IS NOT NULL AND default_technician_id IS NOT NULL THEN
        
        -- Try to find existing customer by CPF/CNPJ
        IF incoming_vehicle_record.cpf IS NOT NULL THEN
          SELECT id INTO existing_customer_id
          FROM customers
          WHERE document_number = REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', '')
          LIMIT 1;
        END IF;
        
        -- If customer exists, use it; otherwise create new one
        IF existing_customer_id IS NOT NULL THEN
          customer_id := existing_customer_id;
          RAISE NOTICE 'Using existing customer % for company %', customer_id, incoming_vehicle_record.company_name;
          
          -- Update customer vehicles to include this new vehicle if not already there
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
            'SP', -- Default state
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
          
          RAISE NOTICE 'Created new customer % for company %', customer_id, incoming_vehicle_record.company_name;
        END IF;
        
        -- Now create the kit schedule linked to the customer
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
          incoming_vehicle_record.brand,
          incoming_vehicle_record.vehicle,
          incoming_vehicle_record.year,
          'Placa pendente',
          COALESCE(accessories_list, ARRAY[]::text[]),
          'Agendamento criado automaticamente a partir da homologação #' || NEW.id || ' - ' || NEW.brand || ' ' || NEW.model
        );
        
        RAISE NOTICE 'Kit schedule created from homologation card % for customer %', NEW.id, customer_id;
      ELSE
        RAISE NOTICE 'Cannot create schedule: missing kit (%) or technician (%)', default_kit_id, default_technician_id;
      END IF;
    ELSE
      RAISE NOTICE 'No incoming vehicle found for homologation card %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_schedule_on_homologation ON public.homologation_cards;
CREATE TRIGGER create_schedule_on_homologation
  AFTER UPDATE ON public.homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_kit_schedule_from_homologation();