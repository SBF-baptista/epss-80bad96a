-- Verificar e corrigir o usuário sistema
-- Primeiro, verificar se já existe
DO $$
BEGIN
    -- Inserir o usuário sistema se não existir
    INSERT INTO public.usuarios (id, email)
    VALUES ('00000000-0000-0000-0000-000000000000', 'system@automation.internal')
    ON CONFLICT (id) DO NOTHING;
    
    -- Verificar se foi inserido com sucesso
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = '00000000-0000-0000-0000-000000000000') THEN
        RAISE EXCEPTION 'Failed to create system user';
    END IF;
    
    RAISE NOTICE 'System user verified/created successfully';
END
$$;