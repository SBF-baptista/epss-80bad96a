-- Step 1: Remove all existing foreign key constraints on pedidos.usuario_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop all foreign key constraints on pedidos.usuario_id
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pedidos'::regclass 
        AND contype = 'f'
        AND conkey @> ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.pedidos'::regclass AND attname = 'usuario_id')]
    LOOP
        EXECUTE format('ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Ensure usuario_id column is nullable
ALTER TABLE public.pedidos ALTER COLUMN usuario_id DROP NOT NULL;

-- Step 3: Recreate the foreign key constraint with proper NULL handling
ALTER TABLE public.pedidos 
ADD CONSTRAINT pedidos_usuario_id_fkey 
FOREIGN KEY (usuario_id) 
REFERENCES public.usuarios(id) 
ON DELETE SET NULL
ON UPDATE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Update RLS policies to properly handle NULL usuario_id
DROP POLICY IF EXISTS "Allow service role and user inserts" ON public.pedidos;
DROP POLICY IF EXISTS "Allow service role and user selects" ON public.pedidos;
DROP POLICY IF EXISTS "Allow service role and user updates" ON public.pedidos;

-- Recreate policies with better NULL handling
CREATE POLICY "Allow service role and user inserts" 
ON public.pedidos 
FOR INSERT 
WITH CHECK (
    -- Allow service role to insert anything
    auth.role() = 'service_role'::text 
    OR 
    -- Allow authenticated users to insert their own orders
    (auth.role() = 'authenticated'::text AND auth.uid() = usuario_id) 
    OR 
    -- Allow authenticated users to insert system orders (NULL usuario_id)
    (auth.role() = 'authenticated'::text AND usuario_id IS NULL)
);

CREATE POLICY "Allow service role and user selects" 
ON public.pedidos 
FOR SELECT 
USING (
    -- Allow service role to see everything
    auth.role() = 'service_role'::text 
    OR 
    -- Allow authenticated users to see their own orders
    (auth.role() = 'authenticated'::text AND auth.uid() = usuario_id) 
    OR 
    -- Allow authenticated users to see system orders (NULL usuario_id)
    (auth.role() = 'authenticated'::text AND usuario_id IS NULL)
);

CREATE POLICY "Allow service role and user updates" 
ON public.pedidos 
FOR UPDATE 
USING (
    -- Allow service role to update everything
    auth.role() = 'service_role'::text 
    OR 
    -- Allow authenticated users to update their own orders
    (auth.role() = 'authenticated'::text AND auth.uid() = usuario_id) 
    OR 
    -- Allow authenticated users to update system orders (NULL usuario_id)
    (auth.role() = 'authenticated'::text AND usuario_id IS NULL)
);

-- Step 5: Create some test automation rules if they don't exist
INSERT INTO public.automation_rules_extended (
    category, brand, model, model_year, tracker_model, configuration, notes
) VALUES 
    ('test', 'TOYOTA', 'COROLLA', '2024', 'TRACKER_MODEL_001', 'CONFIG_TEST_TOYOTA', 'Test rule for Toyota Corolla'),
    ('test', 'HONDA', 'CIVIC', '2024', 'TRACKER_MODEL_002', 'CONFIG_TEST_HONDA', 'Test rule for Honda Civic')
ON CONFLICT DO NOTHING;

-- Step 6: Verify the trigger function is properly set up
-- Update the trigger function to add more logging
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