-- Create function to create kit schedule from homologated card
CREATE OR REPLACE FUNCTION create_kit_schedule_from_homologation()
RETURNS TRIGGER AS $$
DECLARE
  incoming_vehicle_record RECORD;
  accessories_list text[];
  default_kit_id uuid;
  default_technician_id uuid;
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
      
      -- Get default kit (first available) - in production you'd want better logic
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
      
      -- Get default technician (first available) - in production you'd want better logic
      SELECT id INTO default_technician_id
      FROM technicians
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Only create schedule if we have required data
      IF default_kit_id IS NOT NULL AND default_technician_id IS NOT NULL THEN
        INSERT INTO kit_schedules (
          kit_id,
          technician_id,
          scheduled_date,
          status,
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
          accessories,
          notes
        ) VALUES (
          default_kit_id,
          default_technician_id,
          CURRENT_DATE + INTERVAL '7 days', -- Schedule for 7 days from now by default
          'scheduled',
          incoming_vehicle_record.company_name,
          COALESCE(incoming_vehicle_record.cpf, 'Não informado'),
          COALESCE(incoming_vehicle_record.phone, 'Não informado'),
          'contato@' || lower(replace(incoming_vehicle_record.company_name, ' ', '')) || '.com', -- Generate placeholder email
          COALESCE(incoming_vehicle_record.address_street, 'Não informado'),
          COALESCE(incoming_vehicle_record.address_number, 'S/N'),
          COALESCE(incoming_vehicle_record.address_district, 'Não informado'),
          COALESCE(incoming_vehicle_record.address_city, 'Não informado'),
          'SP', -- Default state, should be dynamic in production
          COALESCE(incoming_vehicle_record.address_zip_code, '00000-000'),
          incoming_vehicle_record.address_complement,
          incoming_vehicle_record.brand,
          incoming_vehicle_record.vehicle,
          incoming_vehicle_record.year,
          COALESCE(accessories_list, ARRAY[]::text[]),
          'Agendamento criado automaticamente a partir da homologação #' || NEW.id || ' - ' || NEW.brand || ' ' || NEW.model
        );
        
        RAISE NOTICE 'Kit schedule created from homologation card % for company %', NEW.id, incoming_vehicle_record.company_name;
      ELSE
        RAISE NOTICE 'Cannot create schedule: missing kit (%) or technician (%)', default_kit_id, default_technician_id;
      END IF;
    ELSE
      RAISE NOTICE 'No incoming vehicle found for homologation card %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create kit schedule when card is homologated
DROP TRIGGER IF EXISTS create_schedule_on_homologation ON homologation_cards;

CREATE TRIGGER create_schedule_on_homologation
  AFTER UPDATE ON homologation_cards
  FOR EACH ROW
  WHEN (NEW.status = 'homologado' AND (OLD.status IS NULL OR OLD.status != 'homologado'))
  EXECUTE FUNCTION create_kit_schedule_from_homologation();