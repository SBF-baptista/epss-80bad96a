-- ============================================================================
-- PARTE 1: Recriar Triggers de Planning Customer
-- ============================================================================

-- Trigger 1: Criar customer no Planning quando homologação for aprovada
CREATE OR REPLACE TRIGGER create_planning_customer_after_homologation
  AFTER INSERT OR UPDATE ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_planning_customer_from_homologation();

-- Trigger 2: Criar customer automaticamente quando incoming_vehicle for homologado
CREATE OR REPLACE TRIGGER auto_create_planning_from_incoming
  AFTER INSERT OR UPDATE ON incoming_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_planning_customer_from_incoming();

-- ============================================================================
-- PARTE 2: Função de Backfill para Customers Faltantes
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_planning_customers()
RETURNS TABLE(
  incoming_vehicle_id uuid,
  sale_summary_id integer,
  customer_created boolean,
  customer_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_customer_id uuid;
  existing_customer_id uuid;
BEGIN
  -- Processar todos os incoming_vehicles que:
  -- 1. Têm sale_summary_id (são do Segsale)
  -- 2. Estão homologados (homologation_status = 'homologado')
  -- 3. Não têm customer no Planning ainda
  
  FOR rec IN 
    SELECT DISTINCT iv.*
    FROM incoming_vehicles iv
    WHERE iv.sale_summary_id IS NOT NULL
      AND iv.homologation_status = 'homologado'
      AND NOT EXISTS (
        SELECT 1 FROM customers c
        WHERE c.sale_summary_id = iv.sale_summary_id
          AND c.show_in_planning = true
      )
    ORDER BY iv.received_at DESC
  LOOP
    existing_customer_id := NULL;
    
    -- Tentar encontrar customer existente por CPF
    IF rec.cpf IS NOT NULL AND rec.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(rec.cpf, '.', ''), '-', ''), '/', '')
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      -- Atualizar customer existente
      v_customer_id := existing_customer_id;
      
      UPDATE customers
      SET 
        sale_summary_id = COALESCE(sale_summary_id, rec.sale_summary_id),
        company_name = COALESCE(company_name, rec.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), rec.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), rec.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), rec.address_city, address_city),
        show_in_planning = true
      WHERE id = v_customer_id;

      -- Adicionar veículo se não existir
      UPDATE customers
      SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', rec.brand,
          'model', rec.vehicle,
          'year', COALESCE(rec.year, 2024),
          'plate', COALESCE(rec.plate, 'Placa pendente'),
          'scheduled', false
        )
      )
      WHERE id = v_customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', rec.brand,
            'model', rec.vehicle
          )
        ));

      RETURN QUERY SELECT rec.id, rec.sale_summary_id, false, v_customer_id;
    ELSE
      -- Criar novo customer
      INSERT INTO customers (
        name,
        document_number,
        document_type,
        phone,
        email,
        address_street,
        address_number,
        address_neighborhood,
        address_city,
        address_state,
        address_postal_code,
        address_complement,
        company_name,
        sale_summary_id,
        vehicles,
        show_in_planning
      ) VALUES (
        COALESCE(rec.company_name, 'Cliente não identificado'),
        COALESCE(REPLACE(REPLACE(REPLACE(rec.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
        CASE 
          WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(rec.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
          ELSE 'cpf'
        END,
        COALESCE(rec.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(rec.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(rec.address_street, 'Não informado'),
        COALESCE(rec.address_number, 'S/N'),
        COALESCE(rec.address_district, 'Não informado'),
        COALESCE(rec.address_city, 'Não informado'),
        'SP',
        COALESCE(rec.address_zip_code, '00000-000'),
        rec.address_complement,
        rec.company_name,
        rec.sale_summary_id,
        jsonb_build_array(
          jsonb_build_object(
            'brand', rec.brand,
            'model', rec.vehicle,
            'year', COALESCE(rec.year, 2024),
            'plate', COALESCE(rec.plate, 'Placa pendente'),
            'scheduled', false
          )
        ),
        true
      ) RETURNING id INTO v_customer_id;

      RETURN QUERY SELECT rec.id, rec.sale_summary_id, true, v_customer_id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- PARTE 3: Executar Backfill
-- ============================================================================

-- Executar a função de backfill para criar os customers faltantes
SELECT * FROM backfill_planning_customers();

-- ============================================================================
-- PARTE 4: Corrigir Vinculação de Acessórios Órfãos
-- ============================================================================

-- Vincular acessórios que têm company_name e received_at próximo ao incoming_vehicle
UPDATE accessories a
SET vehicle_id = iv.id
FROM incoming_vehicles iv
WHERE a.vehicle_id IS NULL
  AND a.company_name IS NOT NULL
  AND a.company_name = iv.company_name
  AND a.received_at >= (iv.received_at - INTERVAL '1 day')
  AND a.received_at <= (iv.received_at + INTERVAL '1 day')
  AND NOT EXISTS (
    SELECT 1 FROM accessories a2
    WHERE a2.vehicle_id = iv.id
      AND a2.accessory_name = a.accessory_name
  );