-- Fix automatic order creation for already homologated vehicles from API
-- First, let's update the trigger to be more robust and handle missing automation rules

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
  actual_tracker_model TEXT;
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
      
      -- Look for automation rule (case insensitive matching)
      SELECT * INTO automation_rule
      FROM automation_rules_extended
      WHERE UPPER(TRIM(brand)) = UPPER(TRIM(incoming_vehicle_record.brand))
        AND (
          UPPER(TRIM(model)) = UPPER(TRIM(incoming_vehicle_record.vehicle))
          OR UPPER(TRIM(model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(incoming_vehicle_record.vehicle, ' ', 1))) || '%'
          OR UPPER(TRIM(incoming_vehicle_record.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(model, ' ', 1))) || '%'
        )
      ORDER BY 
        CASE 
          WHEN UPPER(TRIM(model)) = UPPER(TRIM(incoming_vehicle_record.vehicle)) THEN 1
          ELSE 2 
        END
      LIMIT 1;
      
      -- If no exact rule found, create one with default configuration
      IF automation_rule IS NULL THEN
        RAISE NOTICE 'No automation rule found for % %, creating default rule', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle;
        
        -- Determine default configuration based on vehicle type
        CASE 
          WHEN NEW.configuration IS NOT NULL THEN
            actual_tracker_model := 'Ruptella Smart5';
          WHEN UPPER(incoming_vehicle_record.brand) IN ('FORD', 'VOLKSWAGEN', 'VOLVO', 'SCANIA', 'IVECO') THEN
            actual_tracker_model := 'Ruptella Smart5';
          ELSE
            actual_tracker_model := 'Ruptella Smart5';
        END CASE;
        
        -- Create automation rule
        INSERT INTO automation_rules_extended (
          category,
          brand,
          model,
          model_year,
          tracker_model,
          configuration,
          notes
        ) VALUES (
          'homologacao_automatica',
          UPPER(TRIM(incoming_vehicle_record.brand)),
          UPPER(TRIM(incoming_vehicle_record.vehicle)),
          COALESCE(incoming_vehicle_record.year::TEXT, NEW.year::TEXT),
          actual_tracker_model,
          COALESCE(NEW.configuration, 'FMS250'),
          'Regra criada automaticamente durante homologação em ' || NOW()::DATE
        ) RETURNING * INTO automation_rule;
        
        RAISE NOTICE 'Created automation rule % for % %', automation_rule.id, automation_rule.brand, automation_rule.model;
      ELSE
        actual_tracker_model := automation_rule.tracker_model;
        RAISE NOTICE 'Found automation rule: % (config: %)', automation_rule.id, automation_rule.configuration;
      END IF;
      
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
        usuario_id,
        company_name
      ) VALUES (
        order_number,
        automation_rule.configuration,
        'novos',
        NOW(),
        'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'::uuid,  -- sergio.filho@segsat.com
        incoming_vehicle_record.company_name
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
        COALESCE(incoming_vehicle_record.quantity, 1),
        COALESCE(incoming_vehicle_record.year::TEXT, NEW.year::TEXT)
      );
      
      RAISE NOTICE 'Created vehicle record for order %', new_order_id;
      
      -- Create tracker record
      INSERT INTO rastreadores (
        pedido_id,
        modelo,
        quantidade
      ) VALUES (
        new_order_id,
        actual_tracker_model,
        COALESCE(incoming_vehicle_record.quantity, 1)
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
      RAISE NOTICE 'No incoming vehicle found for homologation card % - skipping automatic order creation', NEW.id;
    END IF;
  ELSE
    RAISE NOTICE 'Trigger conditions not met: status=%, old_status=%, created_order_id=%', NEW.status, OLD.status, NEW.created_order_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Now let's retroactively create orders for existing homologated vehicles from API
DO $$
DECLARE
  hc_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
  incoming_vehicle_record RECORD;
  actual_tracker_model TEXT;
BEGIN
  RAISE NOTICE 'Starting retroactive order creation for existing homologated vehicles from API';
  
  -- Process each homologated card that has an incoming vehicle but no order
  FOR hc_record IN (
    SELECT hc.*, iv.brand as iv_brand, iv.vehicle as iv_model, iv.quantity, iv.company_name, iv.year as iv_year
    FROM homologation_cards hc
    INNER JOIN incoming_vehicles iv ON hc.incoming_vehicle_id = iv.id
    WHERE hc.status = 'homologado' 
    AND hc.created_order_id IS NULL
    AND hc.incoming_vehicle_id IS NOT NULL
  ) LOOP
    RAISE NOTICE 'Processing homologated card: % % %', hc_record.id, hc_record.brand, hc_record.model;
    
    -- Look for automation rule
    SELECT * INTO automation_rule
    FROM automation_rules_extended
    WHERE UPPER(TRIM(brand)) = UPPER(TRIM(hc_record.iv_brand))
      AND (
        UPPER(TRIM(model)) = UPPER(TRIM(hc_record.iv_model))
        OR UPPER(TRIM(model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(hc_record.iv_model, ' ', 1))) || '%'
        OR UPPER(TRIM(hc_record.iv_model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(model, ' ', 1))) || '%'
      )
    ORDER BY 
      CASE 
        WHEN UPPER(TRIM(model)) = UPPER(TRIM(hc_record.iv_model)) THEN 1
        ELSE 2 
      END
    LIMIT 1;
    
    -- If no exact rule found, create one
    IF automation_rule IS NULL THEN
      actual_tracker_model := 'Ruptella Smart5';
      
      INSERT INTO automation_rules_extended (
        category,
        brand,
        model,
        model_year,
        tracker_model,
        configuration,
        notes
      ) VALUES (
        'homologacao_automatica',
        UPPER(TRIM(hc_record.iv_brand)),
        UPPER(TRIM(hc_record.iv_model)),
        COALESCE(hc_record.iv_year::TEXT, hc_record.year::TEXT),
        actual_tracker_model,
        COALESCE(hc_record.configuration, 'FMS250'),
        'Regra criada retroativamente durante processamento automático em ' || NOW()::DATE
      ) RETURNING * INTO automation_rule;
      
      RAISE NOTICE 'Created automation rule % for % %', automation_rule.id, automation_rule.brand, automation_rule.model;
    ELSE
      actual_tracker_model := automation_rule.tracker_model;
    END IF;
    
    -- Generate order number
    SELECT COALESCE(
      'AUTO-' || LPAD((
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 6) AS INTEGER)), 0) + 1
        FROM pedidos 
        WHERE numero_pedido LIKE 'AUTO-%'
      )::TEXT, 3, '0'),
      'AUTO-001'
    ) INTO order_number;
    
    -- Create the order
    INSERT INTO pedidos (
      numero_pedido,
      configuracao,
      status,
      data,
      usuario_id,
      company_name
    ) VALUES (
      order_number,
      automation_rule.configuration,
      'novos',
      NOW(),
      'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'::uuid,
      hc_record.company_name
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
      hc_record.iv_brand,
      hc_record.iv_model,
      COALESCE(hc_record.quantity, 1),
      COALESCE(hc_record.iv_year::TEXT, hc_record.year::TEXT)
    );
    
    -- Create tracker record
    INSERT INTO rastreadores (
      pedido_id,
      modelo,
      quantidade
    ) VALUES (
      new_order_id,
      actual_tracker_model,
      COALESCE(hc_record.quantity, 1)
    );
    
    -- Update homologation card
    UPDATE homologation_cards 
    SET created_order_id = new_order_id 
    WHERE id = hc_record.id;
    
    -- Update incoming vehicle
    UPDATE incoming_vehicles 
    SET 
      created_order_id = new_order_id,
      processing_notes = COALESCE(processing_notes, '') || ' | Order ' || order_number || ' created retroactively.'
    WHERE id = hc_record.incoming_vehicle_id;
    
    RAISE NOTICE 'Created retroactive order % for homologation %', order_number, hc_record.id;
  END LOOP;
  
  RAISE NOTICE 'Completed retroactive order creation';
END;
$$;