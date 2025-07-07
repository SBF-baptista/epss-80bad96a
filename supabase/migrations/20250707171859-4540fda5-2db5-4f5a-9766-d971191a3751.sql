-- Update the trigger function to use sergio.filho@segsat.com user ID for system orders
CREATE OR REPLACE FUNCTION public.create_order_on_homologation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
  new_automation_rule_id INTEGER;
BEGIN
  RAISE NOTICE 'Homologation trigger fired: status changed from % to % for card %', OLD.status, NEW.status, NEW.id;
  
  -- Only proceed if status changed to 'homologado' and no order exists yet
  IF NEW.status = 'homologado' AND OLD.status != 'homologado' AND NEW.created_order_id IS NULL THEN
    RAISE NOTICE 'Processing homologation approval for card %', NEW.id;
    
    -- Get the related incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL THEN
      RAISE NOTICE 'Found incoming vehicle: % % (year: %)', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle, incoming_vehicle_record.year;
      
      -- Look for automation rule
      SELECT * INTO automation_rule
      FROM automation_rules_extended
      WHERE UPPER(brand) = UPPER(incoming_vehicle_record.brand)
        AND UPPER(model) = UPPER(incoming_vehicle_record.vehicle)
      LIMIT 1;
      
      IF automation_rule IS NOT NULL THEN
        RAISE NOTICE 'Found automation rule: % (config: %)', automation_rule.id, automation_rule.configuration;
        
        -- Generate order number
        SELECT COALESCE(
          'AUTO-' || LPAD((
            SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 6) AS INTEGER)), 0) + 1
            FROM pedidos 
            WHERE numero_pedido LIKE 'AUTO-%'
          )::TEXT, 3, '0'),
          'AUTO-001'
        ) INTO order_number;
        
        RAISE NOTICE 'Generated order number: %', order_number;
        
        -- Create the order with sergio.filho@segsat.com user_id for system orders
        INSERT INTO pedidos (
          numero_pedido,
          configuracao,
          status,
          data,
          usuario_id
        ) VALUES (
          order_number,
          automation_rule.configuration,
          'novos',
          NOW(),
          'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'::uuid  -- sergio.filho@segsat.com
        ) RETURNING id INTO new_order_id;
        
        RAISE NOTICE 'Created order with ID: %', new_order_id;
        
        -- Create vehicle record
        INSERT INTO veiculos (
          pedido_id,
          marca,
          modelo,
          quantidade,
          tipo
        ) VALUES (
          new_order_id,
          incoming_vehicle_record.brand,
          incoming_vehicle_record.vehicle,
          incoming_vehicle_record.quantity,
          incoming_vehicle_record.year::TEXT
        );
        
        RAISE NOTICE 'Created vehicle record for order %', new_order_id;
        
        -- Create tracker record
        INSERT INTO rastreadores (
          pedido_id,
          modelo,
          quantidade
        ) VALUES (
          new_order_id,
          automation_rule.tracker_model,
          incoming_vehicle_record.quantity
        );
        
        RAISE NOTICE 'Created tracker record for order %', new_order_id;
        
        -- Update homologation card with created order ID
        UPDATE homologation_cards 
        SET created_order_id = new_order_id 
        WHERE id = NEW.id;
        
        -- Update incoming vehicle with order info
        UPDATE incoming_vehicles 
        SET 
          created_order_id = new_order_id,
          processing_notes = COALESCE(processing_notes, '') || ' | Order ' || order_number || ' created from homologation approval.'
        WHERE id = incoming_vehicle_record.id;
        
        RAISE NOTICE 'Successfully created automatic order % from homologation %', order_number, NEW.id;
        
      ELSE
        RAISE NOTICE 'No automation rule found for % %', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle;
      END IF;
    ELSE
      RAISE NOTICE 'No incoming vehicle found for homologation card %', NEW.id;
    END IF;
    
    -- Create automation rule from homologated configuration (existing functionality)
    IF NEW.configuration IS NOT NULL THEN
      SELECT * INTO automation_rule
      FROM automation_rules_extended
      WHERE UPPER(brand) = UPPER(NEW.brand)
        AND UPPER(model) = UPPER(NEW.model)
        AND (model_year = NEW.year::TEXT OR (model_year IS NULL AND NEW.year IS NULL))
      LIMIT 1;
      
      IF automation_rule IS NULL THEN
        INSERT INTO automation_rules_extended (
          category,
          brand,
          model,
          model_year,
          tracker_model,
          configuration,
          notes
        ) VALUES (
          'homologacao_aprovada',
          UPPER(NEW.brand),
          UPPER(NEW.model),
          NEW.year::TEXT,
          'CONFIGURACAO_HOMOLOGADA',
          NEW.configuration,
          'Regra criada automaticamente a partir da homologação aprovada em ' || NOW()::DATE
        ) RETURNING id INTO new_automation_rule_id;
        
        RAISE NOTICE 'Created automation rule % for homologated vehicle % %', 
          new_automation_rule_id, NEW.brand, NEW.model;
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Trigger conditions not met: status=%, old_status=%, created_order_id=%', NEW.status, OLD.status, NEW.created_order_id;
  END IF;
  
  RETURN NEW;
END;
$function$;