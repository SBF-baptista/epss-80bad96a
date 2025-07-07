-- Remover completamente a foreign key constraint para permitir sistema funcionar com NULL
-- E verificar se usuario_id é nullable

-- Primeiro, verificar se a coluna já é nullable
DO $$
BEGIN
    -- Tornar usuario_id nullable se não for
    BEGIN
        ALTER TABLE public.pedidos ALTER COLUMN usuario_id DROP NOT NULL;
        RAISE NOTICE 'Column usuario_id is now nullable';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Column usuario_id was already nullable or error occurred: %', SQLERRM;
    END;
    
    -- Remover a foreign key constraint temporariamente
    ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_usuario_id_fkey;
    RAISE NOTICE 'Foreign key constraint removed';
    
    -- Recriar a constraint permitindo NULL values
    ALTER TABLE public.pedidos 
    ADD CONSTRAINT pedidos_usuario_id_fkey 
    FOREIGN KEY (usuario_id) 
    REFERENCES public.usuarios(id) 
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE 'Foreign key constraint recreated with NULL support';
END
$$;