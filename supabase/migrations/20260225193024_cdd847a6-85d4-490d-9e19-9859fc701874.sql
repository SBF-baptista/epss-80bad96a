-- Delete the most recent kickoff history for Pedro Albuquerque
DELETE FROM public.kickoff_history WHERE id = '320f7236-ebd4-40b4-a385-1adb92768a9d';

-- Reset the vehicle back to pending kickoff
UPDATE public.incoming_vehicles 
SET kickoff_completed = false, 
    created_homologation_id = NULL, 
    homologation_status = 'homologar', 
    processing_notes = 'Reset para novo kickoff - registro anterior deletado'
WHERE sale_summary_id = 366 AND kickoff_completed = true;