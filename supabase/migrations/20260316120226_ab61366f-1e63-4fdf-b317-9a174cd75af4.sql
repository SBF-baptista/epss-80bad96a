-- Delete Pedro Albuquerque kit_schedule and related status history
DELETE FROM public.kit_schedule_status_history WHERE kit_schedule_id = 'a1113f5f-cb89-4eac-965d-b4319e99c01d';
DELETE FROM public.kit_schedules WHERE id = 'a1113f5f-cb89-4eac-965d-b4319e99c01d';