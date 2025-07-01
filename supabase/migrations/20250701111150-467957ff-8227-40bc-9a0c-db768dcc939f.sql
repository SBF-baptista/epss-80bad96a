
-- Add a column to link homologation cards back to incoming vehicles
ALTER TABLE public.homologation_cards 
ADD COLUMN incoming_vehicle_id UUID REFERENCES public.incoming_vehicles(id);

-- Add index for better performance on lookups
CREATE INDEX idx_homologation_cards_incoming_vehicle_id ON homologation_cards(incoming_vehicle_id);

-- Add a column to track if an order was created from homologation
ALTER TABLE public.homologation_cards 
ADD COLUMN created_order_id UUID REFERENCES public.pedidos(id);

-- Add index for better performance
CREATE INDEX idx_homologation_cards_created_order_id ON homologation_cards(created_order_id);

-- Add a trigger function to automatically create orders when homologation status changes to 'homologado'
CREATE OR REPLACE FUNCTION create_order_on_homologation()
RETURNS TRIGGER AS $$
DECLARE
  incoming_vehicle_record RECORD;
  order_number TEXT;
  new_order_id UUID;
  automation_rule RECORD;
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
        
        -- Create the order
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
          '00000000-0000-0000-0000-000000000000'
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_create_order_on_homologation
  AFTER UPDATE ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_order_on_homologation();

-- Add a view to easily see the complete workflow chain
CREATE OR REPLACE VIEW workflow_chain AS
SELECT 
  iv.id as incoming_vehicle_id,
  iv.vehicle,
  iv.brand,
  iv.year,
  iv.quantity,
  iv.usage_type,
  iv.received_at,
  iv.processed as incoming_processed,
  hc.id as homologation_id,
  hc.status as homologation_status,
  hc.created_at as homologation_created_at,
  hc.updated_at as homologation_updated_at,
  p.id as order_id,
  p.numero_pedido as order_number,
  p.status as order_status,
  p.data as order_created_at,
  iv.processing_notes
FROM incoming_vehicles iv
LEFT JOIN homologation_cards hc ON hc.incoming_vehicle_id = iv.id
LEFT JOIN pedidos p ON p.id = hc.created_order_id OR p.id = iv.created_order_id
ORDER BY iv.received_at DESC;
