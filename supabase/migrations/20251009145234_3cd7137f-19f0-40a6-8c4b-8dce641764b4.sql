-- Remove triggers antigos
DROP TRIGGER IF EXISTS trg_hc_status_planning ON public.homologation_cards;
DROP TRIGGER IF EXISTS trg_hc_status_change_cleanup ON public.homologation_cards;
DROP TRIGGER IF EXISTS trg_incoming_auto_planning ON public.incoming_vehicles;
DROP TRIGGER IF EXISTS on_homologation_status_change_to_homologado ON public.homologation_cards;
DROP TRIGGER IF EXISTS on_homologation_status_change ON public.homologation_cards;
DROP TRIGGER IF EXISTS trg_workflow_chain_homologated ON public.workflow_chain;

-- Função para criar cliente no Planejamento quando homologation_cards.status = 'homologado'
CREATE OR REPLACE FUNCTION public.create_planning_customer_from_homologation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  incoming_vehicle_record RECORD;
  customer_id uuid;
  existing_customer_id uuid;
BEGIN
  -- Só processa se o status mudou PARA 'homologado'
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation % mudou para homologado, criando cliente no Planejamento', NEW.id;

    -- Busca dados do incoming_vehicle vinculado
    SELECT * INTO incoming_vehicle_record
    FROM incoming_vehicles
    WHERE id = NEW.incoming_vehicle_id;

    -- Se não encontrou o incoming_vehicle, pula
    IF incoming_vehicle_record IS NULL THEN
      RAISE NOTICE 'Incoming vehicle % não encontrado para homologação %', NEW.incoming_vehicle_id, NEW.id;
      RETURN NEW;
    END IF;

    -- Só processa se tiver id_resumo_venda (Segsale)
    IF incoming_vehicle_record.id_resumo_venda IS NULL THEN
      RAISE NOTICE 'Incoming vehicle % não tem id_resumo_venda, pulando criação de cliente', NEW.incoming_vehicle_id;
      RETURN NEW;
    END IF;

    -- Tenta encontrar cliente existente por id_resumo_venda ou CPF/CNPJ
    existing_customer_id := NULL;
    
    SELECT id INTO existing_customer_id
    FROM customers
    WHERE id_resumo_venda = incoming_vehicle_record.id_resumo_venda
    LIMIT 1;
    
    IF existing_customer_id IS NULL AND incoming_vehicle_record.cpf IS NOT NULL AND incoming_vehicle_record.cpf != '' THEN
      SELECT id INTO existing_customer_id
      FROM customers
      WHERE document_number = REPLACE(REPLACE(REPLACE(incoming_vehicle_record.cpf, '.', ''), '-', ''), '/', '')
      LIMIT 1;
    END IF;

    IF existing_customer_id IS NOT NULL THEN
      -- Atualiza cliente existente e marca para Planejamento
      customer_id := existing_customer_id;

      UPDATE customers
      SET 
        id_resumo_venda = COALESCE(id_resumo_venda, incoming_vehicle_record.id_resumo_venda),
        company_name = COALESCE(company_name, incoming_vehicle_record.company_name),
        phone = COALESCE(NULLIF(phone, 'Não informado'), incoming_vehicle_record.phone, phone),
        address_street = COALESCE(NULLIF(address_street, 'Não informado'), incoming_vehicle_record.address_street, address_street),
        address_city = COALESCE(NULLIF(address_city, 'Não informado'), incoming_vehicle_record.address_city, address_city),
        show_in_planning = true
      WHERE id = customer_id;

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
      WHERE id = customer_id
        AND NOT (vehicles @> jsonb_build_array(
          jsonb_build_object(
            'brand', incoming_vehicle_record.brand,
            'model', incoming_vehicle_record.vehicle
          )
        ));

      RAISE NOTICE 'Cliente % atualizado e marcado para Planejamento', customer_id;
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
        id_resumo_venda,
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
        incoming_vehicle_record.id_resumo_venda,
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
      ) RETURNING id INTO customer_id;

      RAISE NOTICE 'Novo cliente % criado para Planejamento', customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger na homologation_cards para criar cliente quando status = 'homologado'
CREATE TRIGGER trg_homologation_create_planning_customer
  AFTER INSERT OR UPDATE OF status ON public.homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_planning_customer_from_homologation();

-- Backfill: processa todos os registros já homologados
UPDATE customers c
SET show_in_planning = true
FROM incoming_vehicles iv
WHERE c.id_resumo_venda = iv.id_resumo_venda
  AND iv.id IN (
    SELECT incoming_vehicle_id 
    FROM homologation_cards 
    WHERE status = 'homologado' 
      AND incoming_vehicle_id IS NOT NULL
  )
  AND c.show_in_planning = false;