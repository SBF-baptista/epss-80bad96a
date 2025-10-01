-- Fix remaining security definer functions to include search_path
CREATE OR REPLACE FUNCTION public.create_order_on_homologation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
  new_automation_rule_id INTEGER;
  actual_tracker_model TEXT;
  sequence_number INTEGER;
BEGIN
  RAISE NOTICE 'Homologation trigger fired: status changed from % to % for card %', OLD.status, NEW.status, NEW.id;
  
  IF NEW.status = 'homologado' AND OLD.status != 'homologado' AND NEW.created_order_id IS NULL THEN
    RAISE NOTICE 'Processing homologation approval for card %', NEW.id;
    
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL THEN
      RAISE NOTICE 'Found incoming vehicle: % % (year: %)', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle, incoming_vehicle_record.year;
      
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
      
      IF automation_rule IS NULL THEN
        RAISE NOTICE 'No automation rule found for % %, creating default rule', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle;
        
        CASE 
          WHEN NEW.configuration IS NOT NULL THEN
            actual_tracker_model := 'Ruptella Smart5';
          WHEN UPPER(incoming_vehicle_record.brand) IN ('FORD', 'VOLKSWAGEN', 'VOLVO', 'SCANIA', 'IVECO') THEN
            actual_tracker_model := 'Ruptella Smart5';
          ELSE
            actual_tracker_model := 'Ruptella Smart5';
        END CASE;
        
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
      
      SELECT nextval('auto_order_sequence') INTO sequence_number;
      order_number := 'AUTO-' || LPAD(sequence_number::TEXT, 3, '0');
      
      RAISE NOTICE 'Generated order number using sequence: % (sequence value: %)', order_number, sequence_number;
      
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
        incoming_vehicle_record.company_name
      ) RETURNING id INTO new_order_id;
      
      RAISE NOTICE 'Created order with ID: %', new_order_id;
      
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
      
      UPDATE homologation_cards 
      SET created_order_id = new_order_id 
      WHERE id = NEW.id;
      
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

CREATE OR REPLACE FUNCTION public.create_automatic_order_atomic(p_vehicle_brand text, p_vehicle_model text, p_vehicle_year integer DEFAULT NULL::integer, p_quantity integer DEFAULT 1, p_company_name text DEFAULT NULL::text, p_user_id uuid DEFAULT 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'::uuid)
RETURNS TABLE(order_id uuid, order_number text, configuration text, tracker_model text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  automation_rule RECORD;
  new_order_number TEXT;
  new_order_id UUID;
  max_attempts INTEGER := 10;
  current_attempt INTEGER := 1;
BEGIN
  SELECT * INTO automation_rule
  FROM automation_rules_extended
  WHERE UPPER(TRIM(brand)) = UPPER(TRIM(p_vehicle_brand))
    AND (
      UPPER(TRIM(model)) = UPPER(TRIM(p_vehicle_model))
      OR UPPER(TRIM(model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(p_vehicle_model, ' ', 1))) || '%'
      OR UPPER(TRIM(p_vehicle_model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(model, ' ', 1))) || '%'
    )
  ORDER BY 
    CASE 
      WHEN UPPER(TRIM(model)) = UPPER(TRIM(p_vehicle_model)) THEN 1
      ELSE 2 
    END
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
      'homologacao_automatica',
      UPPER(TRIM(p_vehicle_brand)),
      UPPER(TRIM(p_vehicle_model)),
      COALESCE(p_vehicle_year::TEXT, ''),
      'Ruptella Smart5',
      'FMS250',
      'Regra criada automaticamente durante criação de pedido em ' || NOW()::DATE
    ) RETURNING * INTO automation_rule;
  END IF;

  WHILE current_attempt <= max_attempts LOOP
    BEGIN
      SELECT 'AUTO-' || LPAD(nextval('auto_order_sequence')::TEXT, 3, '0') INTO new_order_number;
      
      INSERT INTO pedidos (
        numero_pedido,
        configuracao,
        status,
        data,
        usuario_id,
        company_name
      ) VALUES (
        new_order_number,
        automation_rule.configuration,
        'novos',
        NOW(),
        p_user_id,
        p_company_name
      ) RETURNING id INTO new_order_id;
      
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      current_attempt := current_attempt + 1;
      
      IF current_attempt > max_attempts THEN
        RAISE EXCEPTION 'Failed to create unique order number after % attempts', max_attempts;
      END IF;
      
      PERFORM pg_sleep(0.01 * current_attempt);
    END;
  END LOOP;

  INSERT INTO veiculos (
    pedido_id,
    marca,
    modelo,
    quantidade,
    tipo
  ) VALUES (
    new_order_id,
    p_vehicle_brand,
    p_vehicle_model,
    p_quantity,
    p_vehicle_year::TEXT
  );

  INSERT INTO rastreadores (
    pedido_id,
    modelo,
    quantidade
  ) VALUES (
    new_order_id,
    automation_rule.tracker_model,
    p_quantity
  );

  RETURN QUERY SELECT 
    new_order_id as order_id,
    new_order_number as order_number,
    automation_rule.configuration as configuration,
    automation_rule.tracker_model as tracker_model;
END;
$function$;