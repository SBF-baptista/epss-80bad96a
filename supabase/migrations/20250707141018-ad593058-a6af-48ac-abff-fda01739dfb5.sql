-- Check and fix the foreign key constraint that's causing the issue
-- First, let's see what the current constraint looks like
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='pedidos' 
  AND kcu.column_name='usuario_id';

-- Drop the existing foreign key constraint
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_usuario_id_fkey;

-- Recreate the foreign key constraint that allows NULL values
-- This references the usuarios table, not auth.users
ALTER TABLE public.pedidos 
ADD CONSTRAINT pedidos_usuario_id_fkey 
FOREIGN KEY (usuario_id) 
REFERENCES public.usuarios(id) 
ON DELETE SET NULL;