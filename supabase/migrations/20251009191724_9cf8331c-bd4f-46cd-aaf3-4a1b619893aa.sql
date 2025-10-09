-- Fix all database functions to use new column names (sale_summary_id instead of id_resumo_venda)

-- Drop and recreate create_planning_customer_from_homologation function
DROP FUNCTION IF EXISTS public.create_planning_customer_from_homologation() CASCADE;

CREATE OR REPLACE FUNCTION public.create_planning_customer_from_homologation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  incoming_vehicle_record RECORD;
  v_customer_id uuid;
  existing_customer_id uuid;
  default_kit_id uuid;
  default_technician_id uuid;
  schedule_exists boolean;
  accessories_list text[];
BEGIN
  -- Busca dados do incoming_vehicle vinculado
  SELECT * INTO incoming_vehicle_record
  FROM incoming_vehicles
  WHERE id = NEW.incoming_vehicle_id;

  -- Se não encontrou o incoming_vehicle, pula
  IF incoming_vehicle_record IS NULL THEN
    RAISE NOTICE 'Incoming vehicle % não encontrado para homologação %', NEW.incoming_vehicle_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Só processa se tiver sale_summary_id (Segsale)
  IF incoming_vehicle_record.sale_summary_id IS NULL THEN
    RAISE NOTICE 'Incoming vehicle % não tem sale_summary_id, pulando', NEW.incoming_vehicle_id;
    RETURN NEW;
  END IF;

  -- CASO 1: Status mudou PARA 'homologado' (adiciona ao Planning + cria agendamento)
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation % mudou para homologado, adicionando cliente ao Planejamento e criando agendamento', NEW.id;

    -- Tenta encontrar cliente existente por sale_summary_id ou CPF/CNPJ
    existing_customer_id := NULL;
    
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE sale_summary_id = incoming_vehicle_record.sale_summary_id
    LIMIT 1;
    
    IF existing_customer_id IS NULL AND incoming_vehicle_record.cpf IS NOT NULL AND incoming_vehicle_record.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', '')
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      -- Atualiza cliente existente e marca para Planejamento
      v_customer_id := existing_customer_id;

      UPDATE customers
      SET 
        sale_summary_id = COALESCE(sale_summary_id, incoming_vehicle_record.sale_summary_id),
        company_name = COALESCE(company_name, incoming_vehicle_record.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), incoming_vehicle_record.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), incoming_vehicle_record.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), incoming_vehicle_record.address_city, address_city),
        show_in_planning = true
      WHERE id = v_customer_id;

      -- Adiciona veículo se não existir
      UPDATE customers
      SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'brand', incoming_vehicle_record.brand,
          'model', incoming_vehicle_record.vehicle,
          'year', COALESCE(incoming_vehicle_record.year, 2024),
          'plate', 'Placa pendente',
          'scheduled', false
        )
      )
      WHERE id = v_customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', incoming_vehicle_record.brand,
            'model', incoming_vehicle_record.vehicle
          )
        ));

      RAISE NOTICE 'Cliente % atualizado e marcado para Planejamento', v_customer_id;
    ELSE
      -- Cria novo cliente para Planejamento
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
        COALESCE(incoming_vehicle_record.company_name, 'Cliente não identificado'),
        COALESCE(REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', ''), '00000000000'),
        CASE 
          WHEN LENGTH(REPLACE(REPLACE(REPLACE(COALESCE(incoming_vehicle_record.cpf, ''), '.', ''), '-', ''), '/', '')) = 14 THEN 'cnpj'
          ELSE 'cpf'
        END,
        COALESCE(incoming_vehicle_record.phone, 'Não informado'),
        LOWER(REPLACE(COALESCE(incoming_vehicle_record.company_name, 'cliente'), ' ', '')) || '@email.com',
        COALESCE(incoming_vehicle_record.address_street, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_number, 'S/N'),
        COALESCE(incoming_vehicle_record.address_district, 'Não informado'),
        COALESCE(incoming_vehicle_record.address_city, 'Não informado'),
        'SP',
        COALESCE(incoming_vehicle_record.address_zip_code, '00000-000'),
        incoming_vehicle_record.address_complement,
        incoming_vehicle_record.company_name,
        incoming_vehicle_record.sale_summary_id,
        jsonb_build_array(
          jsonb_build_object(
            'brand', incoming_vehicle_record.brand,
            'model', incoming_vehicle_record.vehicle,
            'year', COALESCE(incoming_vehicle_record.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        ),
        true
      ) RETURNING id INTO v_customer_id;

      RAISE NOTICE 'Novo cliente % criado para Planejamento', v_customer_id;
    END IF;

    -- NOVO: Criar agendamento automático no Kanban
    -- Buscar acessórios vinculados
    SELECT array_agg(accessory_name || ' (qty: ' || quantity::text || ')')
    INTO accessories_list
    FROM accessories
    WHERE company_name = incoming_vehicle_record.company_name
      AND received_at >= incoming_vehicle_record.received_at - INTERVAL '1 day'
      AND received_at <= incoming_vehicle_record.received_at + INTERVAL '1 day';

    -- Buscar kit padrão (primeiro da homologação ou primeiro disponível)
    SELECT id INTO default_kit_id
    FROM homologation_kits
    WHERE homologation_card_id = NEW.id
    LIMIT 1;

    IF default_kit_id IS NULL THEN
      SELECT id INTO default_kit_id
      FROM homologation_kits
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    -- Buscar técnico padrão (primeiro disponível)
    SELECT id INTO default_technician_id
    FROM technicians
    ORDER BY created_at DESC
    LIMIT 1;

    -- Se temos kit e técnico, criar agendamento
    IF default_kit_id IS NOT NULL AND default_technician_id IS NOT NULL THEN
      -- Verificar se já existe agendamento para este veículo
      SELECT EXISTS (
        SELECT 1 FROM kit_schedules ks
        WHERE ks.customer_id = v_customer_id
          AND ks.vehicle_brand = incoming_vehicle_record.brand
          AND ks.vehicle_model = incoming_vehicle_record.vehicle
          AND ks.status IN ('scheduled', 'confirmed', 'in_progress')
      ) INTO schedule_exists;

      IF NOT schedule_exists THEN
        INSERT INTO kit_schedules (
          kit_id,
          technician_id,
          scheduled_date,
          status,
          customer_id,
          customer_name,
          customer_document_number,
          customer_phone,
          customer_email,
          installation_address_street,
          installation_address_number,
          installation_address_neighborhood,
          installation_address_city,
          installation_address_state,
          installation_address_postal_code,
          installation_address_complement,
          vehicle_brand,
          vehicle_model,
          vehicle_year,
          vehicle_plate,
          accessories,
          notes
        ) VALUES (
          default_kit_id,
          default_technician_id,
          CURRENT_DATE + INTERVAL '7 days',
          'scheduled',
          v_customer_id,
          COALESCE(incoming_vehicle_record.company_name, 'Cliente não identificado'),
          COALESCE(incoming_vehicle_record.cpf, 'Não informado'),
          COALESCE(incoming_vehicle_record.phone, 'Não informado'),
          LOWER(REPLACE(COALESCE(incoming_vehicle_record.company_name, 'cliente'), ' ', '')) || '@email.com',
          COALESCE(incoming_vehicle_record.address_street, 'Não informado'),
          COALESCE(incoming_vehicle_record.address_number, 'S/N'),
          COALESCE(incoming_vehicle_record.address_district, 'Não informado'),
          COALESCE(incoming_vehicle_record.address_city, 'Não informado'),
          'SP',
          COALESCE(incoming_vehicle_record.address_zip_code, '00000-000'),
          incoming_vehicle_record.address_complement,
          incoming_vehicle_record.brand,
          incoming_vehicle_record.vehicle,
          incoming_vehicle_record.year,
          'Placa pendente',
          COALESCE(accessories_list, ARRAY[]::text[]),
          'Agendamento criado automaticamente a partir da homologação #' || NEW.id || ' (sale_summary_id: ' || incoming_vehicle_record.sale_summary_id || ')'
        );

        RAISE NOTICE 'Agendamento automático criado para cliente % (homologação %)', v_customer_id, NEW.id;
      ELSE
        RAISE NOTICE 'Agendamento já existe para veículo % % do cliente %', incoming_vehicle_record.brand, incoming_vehicle_record.vehicle, v_customer_id;
      END IF;
    ELSE
      RAISE NOTICE 'Não foi possível criar agendamento: kit_id=%, technician_id=%', default_kit_id, default_technician_id;
    END IF;
  END IF;

  -- CASO 2: Status mudou DE 'homologado' para outro (remove do Planning)
  IF OLD IS NOT NULL AND OLD.status = 'homologado' AND NEW.status != 'homologado' THEN
    RAISE NOTICE 'Homologation % saiu de homologado, removendo cliente do Planejamento', NEW.id;

    -- Remove do Planning (marca como false)
    UPDATE customers
    SET show_in_planning = false
    WHERE sale_summary_id = incoming_vehicle_record.sale_summary_id;

    RAISE NOTICE 'Cliente com sale_summary_id % removido do Planejamento', incoming_vehicle_record.sale_summary_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS create_kit_schedule_from_homologation ON homologation_cards;
CREATE TRIGGER create_kit_schedule_from_homologation
  AFTER INSERT OR UPDATE ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_planning_customer_from_homologation();

COMMENT ON FUNCTION public.create_planning_customer_from_homologation() IS 'Fixed to use sale_summary_id instead of id_resumo_venda';