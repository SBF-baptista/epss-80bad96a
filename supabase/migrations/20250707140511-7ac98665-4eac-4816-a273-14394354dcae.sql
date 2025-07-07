-- Create system user for automatic order creation
INSERT INTO public.usuarios (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'system@automation.internal')
ON CONFLICT (id) DO NOTHING;