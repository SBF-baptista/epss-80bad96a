ALTER TABLE public.kit_schedules ALTER COLUMN technician_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.skip_homologation_to_logistics(p_card_id uuid, p_kit_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.homologation_cards%ROWTYPE;
  v public.incoming_vehicles%ROWTYPE;
  k public.homologation_kits%ROWTYPE;
  uid uuid := auth.uid();
  sid uuid;
  words int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (has_role(uid,'admin') OR has_module_access(uid,'homologation','edit')) THEN
    RAISE EXCEPTION 'Sem permissão para avançar a homologação';
  END IF;
  words := coalesce(array_length(regexp_split_to_array(trim(coalesce(p_reason,'')), '\s+'),1),0);
  IF trim(coalesce(p_reason,'')) = '' OR words < 30 THEN
    RAISE EXCEPTION 'O motivo precisa ter no mínimo 30 palavras (atual: %)', CASE WHEN trim(coalesce(p_reason,''))='' THEN 0 ELSE words END;
  END IF;
  SELECT * INTO c FROM homologation_cards WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card não encontrado'; END IF;
  IF c.status <> 'homologar' THEN RAISE EXCEPTION 'Só é possível pular a partir de "A homologar"'; END IF;
  SELECT * INTO k FROM homologation_kits WHERE id = p_kit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecione um kit válido'; END IF;
  SELECT * INTO v FROM incoming_vehicles WHERE id = c.incoming_vehicle_id;

  UPDATE homologation_cards
     SET status = 'homologado',
         notes = trim(coalesce(notes,'') || E'\n[Próxima etapa sem teste] ' || p_reason),
         updated_at = now()
   WHERE id = p_card_id;

  IF v.id IS NOT NULL THEN
    SELECT id INTO sid FROM kit_schedules WHERE incoming_vehicle_id = v.id AND status <> 'cancelled' LIMIT 1;
  END IF;
  IF sid IS NULL THEN
    INSERT INTO kit_schedules(kit_id, scheduled_date, status, notes, created_by, customer_name, customer_document_number,
      customer_phone, installation_address_street, installation_address_number, installation_address_neighborhood,
      installation_address_city, installation_address_postal_code, installation_address_complement,
      vehicle_plate, vehicle_brand, vehicle_model, vehicle_year, incoming_vehicle_id)
    VALUES (k.id, CURRENT_DATE, 'scheduled', 'Homologação pulada: ' || p_reason, uid,
      coalesce(v.company_name, c.brand || ' ' || c.model), v.cpf, v.phone, v.address_street, v.address_number,
      v.address_district, v.address_city, v.address_zip_code, v.address_complement,
      v.plate, coalesce(v.brand, c.brand), coalesce(v.vehicle, c.model), coalesce(v.year, c.year), v.id)
    RETURNING id INTO sid;
  ELSE
    UPDATE kit_schedules SET kit_id = k.id WHERE id = sid;
  END IF;

  INSERT INTO app_logs(user_id, action, module, details)
  VALUES (uid, 'Próxima etapa do processo (sem teste)', 'Homologação',
          'Card ' || p_card_id || ' → homologado; kit ' || k.name || '; motivo: ' || p_reason);
  RETURN sid;
END $$;

REVOKE ALL ON FUNCTION public.skip_homologation_to_logistics(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.skip_homologation_to_logistics(uuid,uuid,text) TO authenticated;