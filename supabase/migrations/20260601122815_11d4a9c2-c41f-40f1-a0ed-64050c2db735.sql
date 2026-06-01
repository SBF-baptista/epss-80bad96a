
-- Re-point the incoming vehicle to the already homologated card and remove the duplicate
UPDATE public.incoming_vehicles
SET created_homologation_id = '2fa32758-372c-43bb-b74f-91f8d72288c1',
    homologation_status = 'homologado'
WHERE created_homologation_id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339';

-- Move any photos/files linked to the duplicate card
UPDATE public.homologation_photos SET homologation_card_id = '2fa32758-372c-43bb-b74f-91f8d72288c1' WHERE homologation_card_id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339';
UPDATE public.homologation_files SET homologation_card_id = '2fa32758-372c-43bb-b74f-91f8d72288c1' WHERE homologation_card_id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339';
UPDATE public.homologation_kits SET homologation_card_id = '2fa32758-372c-43bb-b74f-91f8d72288c1' WHERE homologation_card_id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339';

-- Delete the duplicate (case-variant) card
DELETE FROM public.homologation_cards WHERE id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339';
