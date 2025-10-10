-- 1. First, clean up orphaned references (accessories pointing to non-existent orders)
UPDATE accessories
SET pedido_id = NULL
WHERE pedido_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = accessories.pedido_id);

-- 2. Update create_order_on_homologation to link accessories when creating order
CREATE OR REPLACE FUNCTION public.create_order_on_homologation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  incoming_vehicle_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
  actual_tracker_model TEXT;
  sequence_number INTEGER;
BEGIN
  RAISE NOTICE 'Homologation trigger fired: status changed from % to % for card %', OLD.status, NEW.status, NEW.id;
  
  IF NEW.status = 'homologado' AND OLD.status != 'homologado' AND NEW.created_order_id IS NULL THEN
    RAISE NOTICE 'Processing homologation approval for card %', NEW.id;
    
    SELECT * INTO incoming_vehicle_record 
    FROM incoming_vehicles 
    WHERE id = NEW.incoming_vehicle_id;
    
    IF incoming_vehicle_record IS NOT NULL AND incoming_vehicle_record.sale_summary_id IS NOT NULL THEN
      RAISE NOTICE 'Skipping automatic order creation for Segsale vehicle % (sale_summary_id: %)', NEW.id, incoming_vehicle_record.sale_summary_id;
      RETURN NEW;
    END IF;
    
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
      
      -- NEW: Link accessories by vehicle_id
      UPDATE accessories 
      SET pedido_id = new_order_id 
      WHERE pedido_id IS NULL 
        AND vehicle_id = incoming_vehicle_record.id;
      
      RAISE NOTICE 'Linked vehicle accessories to order %', new_order_id;
      
      -- NEW: Link accessories by incoming_vehicle_group_id (homologation group)
      UPDATE accessories 
      SET pedido_id = new_order_id 
      WHERE pedido_id IS NULL 
        AND incoming_vehicle_group_id = NEW.id;
      
      RAISE NOTICE 'Linked group accessories to order %', new_order_id;
      
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

-- 3. Backfill: Link existing accessories by vehicle_id (only if order exists)
UPDATE accessories a
SET pedido_id = iv.created_order_id
FROM incoming_vehicles iv
WHERE a.pedido_id IS NULL
  AND a.vehicle_id = iv.id
  AND iv.created_order_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = iv.created_order_id);

-- 4. Backfill: Link existing accessories by homologation_id (only if order exists)
UPDATE accessories a
SET pedido_id = iv.created_order_id
FROM incoming_vehicles iv
WHERE a.pedido_id IS NULL
  AND a.incoming_vehicle_group_id = iv.created_homologation_id
  AND iv.created_order_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = iv.created_order_id);