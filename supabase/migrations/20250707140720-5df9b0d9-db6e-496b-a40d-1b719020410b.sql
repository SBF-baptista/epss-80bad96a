-- Update the homologation trigger to use NULL user_id for system orders
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
  -- Only proceed if status changed to 'homologado' and no order exists yet
  IF NEW.status = 'homologado' AND OLD.status != 'homologado' AND NEW.created_order_id IS NULL THEN
    
    -- Get the related incoming vehicle data
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL THEN
      -- Look for automation rule
      SELECT * INTO automation_rule
      FROM automation_rules_extended
      WHERE UPPER(brand) = UPPER(incoming_vehicle_record.brand)
        AND UPPER(model) = UPPER(incoming_vehicle_record.vehicle)
      LIMIT 1;
      
      IF automation_rule IS NOT NULL THEN
        -- Generate order number
        SELECT COALESCE(
          'AUTO-' || LPAD((
            SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 6) AS INTEGER)), 0) + 1
            FROM pedidos 
            WHERE numero_pedido LIKE 'AUTO-%'
          )::TEXT, 3, '0'),
          'AUTO-001'
        ) INTO order_number;
        
        -- Create the order with NULL user_id for system orders
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
          NULL  -- System-generated order
        ) RETURNING id INTO new_order_id;
        
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
        
      END IF;
    END IF;
    
    -- NEW FUNCTIONALITY: Create automation rule from homologated configuration
    -- Only create if configuration exists and no existing rule is found
    IF NEW.configuration IS NOT NULL THEN
      -- Check if automation rule already exists for this brand/model combination
      SELECT * INTO automation_rule
      FROM automation_rules_extended
      WHERE UPPER(brand) = UPPER(NEW.brand)
        AND UPPER(model) = UPPER(NEW.model)
        AND (model_year = NEW.year::TEXT OR (model_year IS NULL AND NEW.year IS NULL))
      LIMIT 1;
      
      -- If no existing rule found, create a new one
      IF automation_rule IS NULL THEN
        -- Extract tracker model from configuration (assuming it's part of the config string)
        -- This is a simplified approach - you might need to adjust based on your config format
        INSERT INTO automation_rules_extended (
          category,
          brand,
          model,
          model_year,
          tracker_model,
          configuration,
          notes
        ) VALUES (
          'homologacao_aprovada', -- Category to indicate this came from homologation
          UPPER(NEW.brand),
          UPPER(NEW.model),
          NEW.year::TEXT,
          'CONFIGURACAO_HOMOLOGADA', -- Default tracker model - adjust as needed
          NEW.configuration,
          'Regra criada automaticamente a partir da homologação aprovada em ' || NOW()::DATE
        ) RETURNING id INTO new_automation_rule_id;
        
        -- Log the creation
        RAISE NOTICE 'Created automation rule % for homologated vehicle % %', 
          new_automation_rule_id, NEW.brand, NEW.model;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;