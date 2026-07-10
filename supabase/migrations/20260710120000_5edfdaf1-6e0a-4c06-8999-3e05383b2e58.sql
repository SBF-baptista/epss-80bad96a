
DO $$
DECLARE
  v RECORD;
  existing_id UUID;
  existing_status homologation_status;
  new_id UUID;
  final_id UUID;
  final_status homologation_status;
  created_count INT := 0;
  reused_count INT := 0;
BEGIN
  FOR v IN
    SELECT id, plate, brand, vehicle, year, company_name, quantity, created_homologation_id
    FROM public.incoming_vehicles
    WHERE sale_summary_id IN (11309, 11310, 11311)
      AND kickoff_completed = false
      AND created_homologation_id IS NULL
  LOOP
    -- Try to reuse an existing (deleted_at IS NULL) card matching brand/model/year
    SELECT id, status
      INTO existing_id, existing_status
    FROM public.homologation_cards
    WHERE upper(trim(brand)) = upper(trim(v.brand))
      AND upper(trim(model)) = upper(trim(coalesce(v.vehicle,'')))
      AND coalesce(year, 0) = coalesce(v.year, 0)
      AND deleted_at IS NULL
    ORDER BY (status = 'homologado') DESC, updated_at DESC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      -- Link the existing card to this incoming vehicle (only if unlinked or linked to a different one)
      UPDATE public.homologation_cards
         SET incoming_vehicle_id = v.id
       WHERE id = existing_id
         AND (incoming_vehicle_id IS NULL OR incoming_vehicle_id <> v.id);
      final_id := existing_id;
      final_status := existing_status;
      reused_count := reused_count + 1;
      RAISE NOTICE 'REUSED card % (status=%) for vehicle % %/%', existing_id, existing_status, v.plate, v.brand, v.vehicle;
    ELSE
      INSERT INTO public.homologation_cards (brand, model, year, status, incoming_vehicle_id, notes)
      VALUES (
        upper(trim(v.brand)),
        upper(trim(coalesce(v.vehicle,''))),
        v.year,
        'homologar',
        v.id,
        format('Criado do kickoff para %s. Aguardando homologação. (reprocessamento manual)', v.company_name)
      )
      RETURNING id INTO new_id;
      final_id := new_id;
      final_status := 'homologar';
      created_count := created_count + 1;
      RAISE NOTICE 'CREATED card % for vehicle % %/%', new_id, v.plate, v.brand, v.vehicle;
    END IF;

    UPDATE public.incoming_vehicles
       SET kickoff_completed = true,
           created_homologation_id = final_id,
           homologation_status = final_status,
           processing_notes = 'Reprocessado manualmente via migração (kickoffs 11309/11310/11311).'
     WHERE id = v.id;
  END LOOP;

  RAISE NOTICE 'DONE: created=% reused=%', created_count, reused_count;
END $$;
