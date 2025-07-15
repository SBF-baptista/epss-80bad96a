-- Create a function that atomically generates order number and creates the order
-- This prevents race conditions by handling the entire process in a single transaction
CREATE OR REPLACE FUNCTION create_automatic_order_atomic(
  p_vehicle_brand TEXT,
  p_vehicle_model TEXT,
  p_vehicle_year INTEGER DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_company_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'::uuid
)
RETURNS TABLE(
  order_id UUID,
  order_number TEXT,
  configuration TEXT,
  tracker_model TEXT
) AS $$
DECLARE
  automation_rule RECORD;
  new_order_number TEXT;
  new_order_id UUID;
  max_attempts INTEGER := 10;
  current_attempt INTEGER := 1;
BEGIN
  -- Find automation rule (case insensitive matching)
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

  -- If no rule found, create a default one
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

  -- Atomic order creation with retry logic
  WHILE current_attempt <= max_attempts LOOP
    BEGIN
      -- Generate new order number using sequence
      SELECT 'AUTO-' || LPAD(nextval('auto_order_sequence')::TEXT, 3, '0') INTO new_order_number;
      
      -- Try to insert the order atomically
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
      
      -- If we reach here, the insert succeeded, break the loop
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      -- If duplicate key error occurs, try again with a new sequence number
      current_attempt := current_attempt + 1;
      
      IF current_attempt > max_attempts THEN
        RAISE EXCEPTION 'Failed to create unique order number after % attempts', max_attempts;
      END IF;
      
      -- Small delay to reduce contention
      PERFORM pg_sleep(0.01 * current_attempt);
    END;
  END LOOP;

  -- Create vehicle record
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

  -- Create tracker record
  INSERT INTO rastreadores (
    pedido_id,
    modelo,
    quantidade
  ) VALUES (
    new_order_id,
    automation_rule.tracker_model,
    p_quantity
  );

  -- Return the results
  RETURN QUERY SELECT 
    new_order_id as order_id,
    new_order_number as order_number,
    automation_rule.configuration as configuration,
    automation_rule.tracker_model as tracker_model;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;