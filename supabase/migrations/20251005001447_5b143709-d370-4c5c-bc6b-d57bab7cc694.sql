-- Fix security issues: RLS policies and function security

-- ============================================
-- 1. Fix Function Search Path (Security Issue)
-- ============================================

-- Recreate has_role function with proper search_path using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recreate get_user_role function with proper search_path using CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ============================================
-- 2. Fix Critical RLS Issues - usuarios table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can view all users" ON public.usuarios;

-- Create new strict policies - users can only see/update their own data
CREATE POLICY "Users can view only their own profile"
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update only their own profile"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admin can view all users
CREATE POLICY "Admins can view all users"
ON public.usuarios
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. Fix Critical RLS Issues - customers table
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

-- Only admins and order_managers can access customer data
CREATE POLICY "Only admins and order managers can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 4. Fix Critical RLS Issues - shipment_recipients table
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view shipment recipients from their orders or admins" ON public.shipment_recipients;
DROP POLICY IF EXISTS "Users can create shipment recipients or admins can create any" ON public.shipment_recipients;
DROP POLICY IF EXISTS "Users can update shipment recipients from their orders or admin" ON public.shipment_recipients;

-- Only admins and order_managers can access shipment recipient data
CREATE POLICY "Only admins and order managers can view recipients"
ON public.shipment_recipients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can create recipients"
ON public.shipment_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can update recipients"
ON public.shipment_recipients
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 5. Fix RLS Issues - kit_schedules table
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Users can create kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Users can update their own kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Users can delete their own kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Admins can view all kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Admins can update any kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Admins can delete any kit schedules" ON public.kit_schedules;

-- Only admins and order_managers can access kit schedules
CREATE POLICY "Only admins and order managers can view schedules"
ON public.kit_schedules
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can create schedules"
ON public.kit_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can update schedules"
ON public.kit_schedules
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

CREATE POLICY "Only admins and order managers can delete schedules"
ON public.kit_schedules
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 6. Fix RLS Issues - pedidos (orders) table
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their orders and automatic orders" ON public.pedidos;

-- Keep admin and existing restrictive policies, add role-based access
CREATE POLICY "Order managers can view all orders"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 7. Fix RLS Issues - homologation_cards table
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view all homologation cards" ON public.homologation_cards;

-- Restrict to authorized roles
CREATE POLICY "Only authorized roles can view homologation cards"
ON public.homologation_cards
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'installer') OR
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 8. Fix RLS Issues - incoming_vehicles table
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view incoming vehicles" ON public.incoming_vehicles;

-- Restrict to authorized roles
CREATE POLICY "Only admins and order managers can view incoming vehicles"
ON public.incoming_vehicles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 9. Fix RLS Issues - homologation_photos table
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view all homologation photos" ON public.homologation_photos;

-- Restrict to authenticated users with proper roles
CREATE POLICY "Only authorized roles can view homologation photos"
ON public.homologation_photos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'installer') OR
  public.has_role(auth.uid(), 'order_manager')
);

-- ============================================
-- 10. Fix RLS Issues - kit_item_options table
-- ============================================

-- Drop overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can view all kit item options" ON public.kit_item_options;

-- Restrict to authorized roles
CREATE POLICY "Only admins and order managers can view kit item options"
ON public.kit_item_options
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'order_manager')
);