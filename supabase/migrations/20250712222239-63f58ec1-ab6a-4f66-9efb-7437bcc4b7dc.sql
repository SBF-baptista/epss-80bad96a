-- Assign admin role to the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('53baeebc-077b-4613-9d0f-3c1a26a0823f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;