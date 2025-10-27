-- Restore admin role for the current user (from logs)
INSERT INTO public.user_roles (user_id, role)
VALUES ('03394ce4-4c52-4b5d-94b8-e57026654c14', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;