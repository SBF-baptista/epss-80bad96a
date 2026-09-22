ALTER TABLE public.kickoff_history ADD COLUMN IF NOT EXISTS approved_by_email text;

UPDATE public.kickoff_history kh
SET approved_by_email = u.email
FROM public.usuarios u
WHERE u.id = kh.approved_by AND kh.approved_by_email IS NULL;