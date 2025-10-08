
-- Create kits for already homologated vehicles that don't have kits yet
DO $$
DECLARE
    v_card record;
    v_kit_id uuid;
    v_kit_name text;
    v_accessories record;
BEGIN
    -- Loop through homologated cards without kits
    FOR v_card IN 
        SELECT 
            hc.id as card_id,
            hc.brand,
            hc.model,
            hc.year,
            iv.company_name,
            iv.usage_type
        FROM homologation_cards hc
        LEFT JOIN incoming_vehicles iv ON iv.id = hc.incoming_vehicle_id
        LEFT JOIN homologation_kits hk ON hk.homologation_card_id = hc.id
        WHERE hc.status = 'homologado' 
          AND hk.id IS NULL
          AND iv.company_name IS NOT NULL
    LOOP
        -- Create kit name
        v_kit_name := 'Kit ' || v_card.brand || ' ' || v_card.model;
        IF v_card.year IS NOT NULL THEN
            v_kit_name := v_kit_name || ' ' || v_card.year::text;
        END IF;

        -- Insert kit
        INSERT INTO homologation_kits (homologation_card_id, name, description)
        VALUES (
            v_card.card_id,
            v_kit_name,
            'Kit criado automaticamente para ' || v_card.company_name || 
            CASE WHEN v_card.usage_type IS NOT NULL 
                 THEN ' - ' || v_card.usage_type 
                 ELSE '' 
            END
        )
        RETURNING id INTO v_kit_id;

        -- Insert accessories for this kit
        INSERT INTO homologation_kit_accessories (kit_id, item_name, item_type, quantity, description)
        SELECT 
            v_kit_id,
            a.accessory_name,
            'accessory',
            a.quantity,
            'Importado do Segsale - ' || COALESCE(a.usage_type, '')
        FROM accessories a
        WHERE a.company_name = v_card.company_name;

        RAISE NOTICE 'Created kit: % for card: %', v_kit_name, v_card.card_id;
    END LOOP;
END $$;
