-- Modify the homologation trigger to NOT create orders for Segsale vehicles
-- Orders should only be created after kit installation is complete

DROP TRIGGER IF EXISTS on_homologation_approved ON homologation_cards;
DROP TRIGGER IF EXISTS trigger_create_order_on_homologation ON homologation_cards;
DROP FUNCTION IF EXISTS create_order_on_homologation() CASCADE;

-- New function that creates orders only for non-Segsale vehicles
CREATE OR REPLACE FUNCTION create_order_on_homologation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  incoming_vehicle_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
  actual_tracker_model TEXT;
  sequence_number INTEGER;
BEGIN
  RAISE NOTICE 'Homologation trigger fired: status changed from % to % for card %', OLD.status, NEW.status, NEW.id;
  
  -- Only proceed if status changed TO 'homologado' and no order exists yet
  IF NEW.status = 'homologado' AND OLD.status != 'homologado' AND NEW.created_order_id IS NULL THEN
    RAISE NOTICE 'Processing homologation approval for card %', NEW.id;
    
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    -- Skip order creation if this is a Segsale vehicle (has id_resumo_venda)
    -- Segsale vehicles should only get orders after kit installation
    IF incoming_vehicle_record IS NOT NULL AND incoming_vehicle_record.id_resumo_venda IS NOT NULL THEN
      RAISE NOTICE 'Skipping automatic order creation for Segsale vehicle % (id_resumo_venda: %)', NEW.id, incoming_vehicle_record.id_resumo_venda;
      RETURN NEW;
    END IF;
    
    -- Continue with order creation for non-Segsale vehicles
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
$$;

CREATE TRIGGER on_homologation_approved
  AFTER UPDATE OF status ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_order_on_homologation();

-- Add trigger to handle kit schedule cleanup when homologation status changes
CREATE OR REPLACE FUNCTION handle_homologation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If status changed FROM 'homologado' to something else, cancel associated kit schedules
  IF OLD.status = 'homologado' AND NEW.status != 'homologado' THEN
    UPDATE kit_schedules
    SET status = 'cancelled',
        notes = COALESCE(notes, '') || ' | Cancelado automaticamente: homologação revertida em ' || NOW()
    WHERE notes ILIKE '%' || NEW.id::text || '%'
      AND status IN ('scheduled', 'confirmed');
    
    RAISE NOTICE 'Cancelled kit schedules for homologation card % due to status change', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_homologation_status_change
  AFTER UPDATE OF status ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION handle_homologation_status_change();