DO $$
DECLARE
 v public.incoming_vehicles%ROWTYPE;
 sid uuid;
 kid uuid;
 actor uuid := '53baeebc-077b-4613-9d0f-3c1a26a0823f';
BEGIN
 SELECT * INTO STRICT v FROM public.incoming_vehicles WHERE id='71d86ee7-1c65-4add-bf7a-96e69acc84a1' AND sale_summary_id=11685 AND plate='ZEROGXE' FOR UPDATE;
 IF EXISTS (SELECT 1 FROM public.kit_schedules WHERE incoming_vehicle_id=v.id OR (vehicle_plate=v.plate AND customer_name=v.company_name)) THEN
  RAISE EXCEPTION 'O veículo já tem um registro logístico; operação abortada para evitar duplicação.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.kit_item_options WHERE item_type='tracker' AND item_name='FMC150') THEN RAISE EXCEPTION 'Rastreador FMC150 não cadastrado.'; END IF;
 INSERT INTO public.homologation_kits(name,description,category,configurations)
 VALUES ('[TESTE] Telemetria GPS - ZEROGXE - Venda 11685','Kit de teste solicitado para simular passagem pela produção; não comprova homologação real.','telemetria',ARRAY[]::text[]) RETURNING id INTO kid;
 INSERT INTO public.homologation_kit_accessories(kit_id,item_name,quantity,item_type,description)
 VALUES (kid,'FMC150',1,'equipment','Equipamento do catálogo local; composição de teste.');
 INSERT INTO public.kit_schedules(kit_id,technician_id,scheduled_date,status,notes,created_by,customer_name,customer_document_number,customer_phone,installation_address_street,installation_address_number,installation_address_neighborhood,installation_address_city,installation_address_postal_code,installation_address_complement,vehicle_plate,vehicle_brand,vehicle_model,vehicle_year,incoming_vehicle_id,configuration,equipment_model,counting_notes)
 VALUES (kid,'6ec8efa0-5cd7-4a31-8aac-2b3656b9afbf',CURRENT_DATE,'scheduled','[TESTE SOLICITADO] Simulação das etapas até Conferência da Expedição. Não representa instalação, homologação ou produção real; sem envio externo. Técnico usado somente para atender ao cadastro de teste.',actor,v.company_name,v.cpf,v.phone,v.address_street,v.address_number,v.address_district,v.address_city,v.address_zip_code,v.address_complement,v.plate,v.brand,v.vehicle,v.year,v.id,'Telemetria GPS','FMC150','[TESTE] Contagem simulada: 1 FMC150. Identificadores fictícios, não utilizar em equipamento real.') RETURNING id INTO sid;
 UPDATE public.kit_schedules SET status='counting' WHERE id=sid;
 INSERT INTO public.production_check_items(kit_schedule_id,stage,item_key,item_category,item_name,expected_quantity,counted_quantity,is_checked,created_by,checked_by,checked_at)
 VALUES (sid,'counting','equipamentos-fmc150-0','Equipamentos','FMC150',1,1,true,actor,actor,now());
 UPDATE public.kit_schedules SET status='in_progress',counting_completed_by=actor,counting_completed_by_email='teste@exemplo.invalid',counting_completed_at=now() WHERE id=sid;
 INSERT INTO public.production_items(kit_schedule_id,imei,serial_number,production_line_code,created_by)
 VALUES (sid,'TESTE-ZEROGXE-11685','TESTE-SERIAL-ZEROGXE-11685','TESTE-SIMULACAO',actor);
 UPDATE public.kit_schedules SET status='verifying' WHERE id=sid;
 INSERT INTO public.production_check_items(kit_schedule_id,stage,item_key,item_category,item_name,expected_quantity,counted_quantity,is_checked,created_by,checked_by,checked_at)
 VALUES (sid,'verification','equipamentos-fmc150-0','Equipamentos','FMC150',1,1,true,actor,actor,now());
 UPDATE public.kit_schedules SET status='expedition_check' WHERE id=sid;
END $$;