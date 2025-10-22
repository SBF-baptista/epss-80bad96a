-- Revert role names back to original values
-- Step 1: Convert role column to text temporarily
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE text;

-- Step 2: Update the role values back to original names
UPDATE public.user_roles 
SET role = 'installer' 
WHERE role = 'operator';

UPDATE public.user_roles 
SET role = 'order_manager' 
WHERE role = 'manager';

-- Step 3: Drop the current enum
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Step 4: Recreate the enum with original values
CREATE TYPE public.app_role AS ENUM ('admin', 'installer', 'order_manager');

-- Step 5: Convert the role column back to enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- Step 6: Recreate the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 7: Recreate the get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;