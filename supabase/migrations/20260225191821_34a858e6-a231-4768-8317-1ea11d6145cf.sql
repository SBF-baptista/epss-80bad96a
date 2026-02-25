-- Reset the vehicle so it appears again in the Kickoff screen
-- This is a one-time data fix, not a schema change
UPDATE public.incoming_vehicles 
SET kickoff_completed = false, 
    created_homologation_id = NULL, 
    homologation_status = 'homologar', 
    processing_notes = 'Reset para reprocessamento do kickoff - card anterior foi deletado'
WHERE id = 'ddd9a031-8512-4ea6-a941-37444092e609';
