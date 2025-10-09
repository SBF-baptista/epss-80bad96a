-- Backfill existing incoming_vehicles with homologation to create Planning customers
DO $$
DECLARE
  rec RECORD;
  homologated_card RECORD;
  customer_id uuid;
  existing_customer_id uuid;
  affected integer := 0;
BEGIN
  -- Process all Segsale incoming_vehicles that have homologated cards
  FOR rec IN 
    SELECT DISTINCT ON (iv.id) iv.*
    FROM incoming_vehicles iv
    WHERE iv.id_resumo_venda IS NOT NULL
  LOOP
    -- Look for homologated card matching this brand/model
    SELECT * INTO homologated_card
    FROM homologation_cards
    WHERE status = 'homologado'
      AND UPPER(TRIM(brand)) = UPPER(TRIM(rec.brand))
      AND (
        UPPER(TRIM(model)) = UPPER(TRIM(rec.vehicle))
        OR UPPER(TRIM(model)) LIKE '%' || UPPER(TRIM(SPLIT_PART(rec.vehicle, ' ', 1))) || '%'
        OR UPPER(TRIM(rec.vehicle)) LIKE '%' || UPPER(TRIM(SPLIT_PART(model, ' ', 1))) || '%'
      )
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Only create customer if we have a homologated card
    IF homologated_card IS NOT NULL THEN
      RAISE NOTICE 'Processing backfill for incoming_vehicle % (id_resumo_venda %, brand=%, model=%)', rec.id, rec.id_resumo_venda, rec.brand, rec.vehicle;

      -- Try to find existing customer
      existing_customer_id := NULL;
      IF rec.cpf IS NOT NULL AND rec.cpf != '' THEN
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE document_number = REPLACE(REPLACE(REPLACE(rec.cpf, '.', ''), '-', ''), '/', '')
          AND (id_resumo_venda = rec.id_resumo_venda OR id_resumo_venda IS NULL)
        LIMIT 1;
      END IF;

      IF existing_customer_id IS NOT NULL THEN
        customer_id := existing_customer_id;

        -- Update existing customer
        UPDATE customers
        SET 
          id_resumo_venda = COALESCE(id_resumo_venda, rec.id_resumo_venda),
          company_name = COALESCE(company_name, rec.company_name),
          phone = COALESCE(NULLIF(phone, 'Não informado'), rec.phone, phone),
          address_street = COALESCE(NULLIF(address_street, 'Não informado'), rec.address_street, address_street),
          address_city = COALESCE(NULLIF(address_city, 'Não informado'), rec.address_city, address_city),
          show_in_planning = true
        WHERE id = customer_id;

        -- Append vehicle if not present
        UPDATE customers
        SET vehicles = COALESCE(vehicles, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'brand', rec.brand,
            'model', rec.vehicle,
            'year', COALESCE(rec.year, 2024),
            'plate', 'Placa pendente',
            'scheduled', false
          )
        )
        WHERE id = customer_id
          AND NOT (vehicles @> jsonb_build_array(
            jsonb_build_object(
              'brand', rec.brand,
              'model', rec.vehicle
            )
          ));

        RAISE NOTICE 'Updated existing customer % for id_resumo_venda %', customer_id, rec.id_resumo_venda;
      ELSE
        -- Create new Planning customer
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
          rec.id_resumo_venda,
          jsonb_build_array(
            jsonb_build_object(
              'brand', rec.brand,
              'model', rec.vehicle,
              'year', COALESCE(rec.year, 2024),
              'plate', 'Placa pendente',
              'scheduled', false
            )
          ),
          true
        ) RETURNING id INTO customer_id;

        RAISE NOTICE 'Created new Planning customer % for id_resumo_venda % (backfill)', customer_id, rec.id_resumo_venda;
      END IF;

      affected := affected + 1;
    ELSE
      RAISE NOTICE 'Skipping incoming_vehicle % - no homologated card found', rec.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: processed % incoming_vehicles with homologation', affected;
END $$;