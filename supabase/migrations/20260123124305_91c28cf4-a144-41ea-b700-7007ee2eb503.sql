-- 1. Drop existing enum values and recreate with new values
-- First, we need to handle this carefully since enum values can't be easily removed

-- Create new enum for the new role types
DO $$ 
BEGIN
    -- Check if we need to add new values
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'visualizador' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'visualizador';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operador' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE app_role ADD VALUE 'operador';
    END IF;
END $$;

-- 2. Create enum for permission levels
CREATE TYPE public.permission_level AS ENUM ('none', 'view', 'edit', 'approve', 'admin');

-- 3. Create enum for modules
CREATE TYPE public.app_module AS ENUM (
    'kickoff',
    'customer_tracking', 
    'homologation',
    'kits',
    'accessories_supplies',
    'planning',
    'scheduling',
    'kanban',
    'orders',
    'dashboard',
    'technicians',
    'users'
);

-- 4. Create table for granular user permissions per module
CREATE TABLE public.user_module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module app_module NOT NULL,
    permission permission_level NOT NULL DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, module)
);

-- 5. Enable RLS on user_module_permissions
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Create security definer function to check module permissions
CREATE OR REPLACE FUNCTION public.get_module_permission(_user_id UUID, _module app_module)
RETURNS permission_level
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT permission FROM public.user_module_permissions 
         WHERE user_id = _user_id AND module = _module),
        'none'::permission_level
    )
$$;

-- 7. Create function to check if user can view a module
CREATE OR REPLACE FUNCTION public.can_view_module(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_module_permissions 
        WHERE user_id = _user_id 
        AND module = _module 
        AND permission IN ('view', 'edit', 'approve', 'admin')
    )
    OR public.has_role(_user_id, 'admin'::app_role)
$$;

-- 8. Create function to check if user can edit in a module
CREATE OR REPLACE FUNCTION public.can_edit_module(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_module_permissions 
        WHERE user_id = _user_id 
        AND module = _module 
        AND permission IN ('edit', 'approve', 'admin')
    )
    OR public.has_role(_user_id, 'admin'::app_role)
$$;

-- 9. Create function to check if user can approve in a module
CREATE OR REPLACE FUNCTION public.can_approve_module(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_module_permissions 
        WHERE user_id = _user_id 
        AND module = _module 
        AND permission IN ('approve', 'admin')
    )
    OR public.has_role(_user_id, 'admin'::app_role)
$$;

-- 10. RLS Policies for user_module_permissions
-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_module_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions" 
ON public.user_module_permissions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert permissions (via service role)
CREATE POLICY "Service role can insert permissions" 
ON public.user_module_permissions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Only admins can update permissions (via service role)
CREATE POLICY "Service role can update permissions" 
ON public.user_module_permissions 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Only admins can delete permissions (via service role)
CREATE POLICY "Service role can delete permissions" 
ON public.user_module_permissions 
FOR DELETE 
USING (auth.role() = 'service_role');

-- 11. Ensure pedro.albuquerque@segsat.com is admin
-- First, find the user and make them admin
DO $$
DECLARE
    pedro_id UUID;
BEGIN
    -- Get Pedro's user ID
    SELECT id INTO pedro_id FROM auth.users WHERE email = 'pedro.albuquerque@segsat.com';
    
    IF pedro_id IS NOT NULL THEN
        -- Remove any existing roles
        DELETE FROM public.user_roles WHERE user_id = pedro_id;
        
        -- Insert admin role
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (pedro_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Give admin permission on all modules
        INSERT INTO public.user_module_permissions (user_id, module, permission)
        SELECT pedro_id, m.module, 'admin'::permission_level
        FROM unnest(ARRAY['kickoff', 'customer_tracking', 'homologation', 'kits', 
                          'accessories_supplies', 'planning', 'scheduling', 'kanban', 
                          'orders', 'dashboard', 'technicians', 'users']::app_module[]) AS m(module)
        ON CONFLICT (user_id, module) DO UPDATE SET permission = 'admin';
    END IF;
END $$;

-- 12. Create trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_user_module_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_module_permissions_updated_at
    BEFORE UPDATE ON public.user_module_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_module_permissions_updated_at();