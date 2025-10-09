-- Remove automatic kit_schedule creation from homologation trigger
-- Keep only the customer creation/update for Planning visibility

DROP FUNCTION IF EXISTS public.create_planning_customer_from_homologation() CASCADE;

CREATE OR REPLACE FUNCTION public.create_planning_customer_from_homologation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming_vehicle_record RECORD;
  v_customer_id uuid;
  existing_customer_id uuid;
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

  -- CASO 1: Status mudou PARA 'homologado' (adiciona ao Planning SEM criar agendamento)
  IF NEW.status = 'homologado' AND (OLD IS NULL OR OLD.status != 'homologado') THEN
    RAISE NOTICE 'Homologation % mudou para homologado, adicionando cliente ao Planejamento (SEM agendamento automático)', NEW.id;

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

      -- Adiciona veículo se não existir (marca como NÃO agendado)
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

      RAISE NOTICE 'Cliente % atualizado e marcado para Planejamento (agendamento manual)', v_customer_id;
    ELSE
      -- Cria novo cliente para Planejamento (SEM agendamento)
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

      RAISE NOTICE 'Novo cliente % criado para Planejamento (agendamento manual)', v_customer_id;
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
DROP TRIGGER IF EXISTS trigger_create_planning_customer ON homologation_cards;
CREATE TRIGGER trigger_create_planning_customer
  AFTER INSERT OR UPDATE ON homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_planning_customer_from_homologation();