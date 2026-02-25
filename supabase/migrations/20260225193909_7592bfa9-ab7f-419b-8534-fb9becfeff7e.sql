
-- Delete the homologation card referencing this kickoff_history record
DELETE FROM public.homologation_cards WHERE incoming_vehicle_id = 'ddd9a031-8512-4ea6-a941-37444092e609';

-- Now delete the kickoff_history record
DELETE FROM public.kickoff_history WHERE id = 'ddd9a031-8512-4ea6-a941-37444092e609';
