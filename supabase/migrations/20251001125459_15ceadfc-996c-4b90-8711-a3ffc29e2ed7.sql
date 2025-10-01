-- Fix RLS policies for kit_schedules to prevent unauthorized customer data access
DROP POLICY IF EXISTS "Users can view their own kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Admins can view all kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Technicians can view assigned kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Users can create kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Users can update their own kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Users can delete their own kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Admins can update any kit schedules" ON kit_schedules;
DROP POLICY IF EXISTS "Admins can delete any kit schedules" ON kit_schedules;

-- Create restrictive RLS policies for kit_schedules
CREATE POLICY "Users can view their own kit schedules"
ON kit_schedules FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all kit schedules"
ON kit_schedules FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create kit schedules"
ON kit_schedules FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own kit schedules"
ON kit_schedules FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any kit schedules"
ON kit_schedules FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own kit schedules"
ON kit_schedules FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete any kit schedules"
ON kit_schedules FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix RLS policies for production_items to restrict manufacturing data
DROP POLICY IF EXISTS "Users can view production items" ON production_items;
DROP POLICY IF EXISTS "Users can create production items" ON production_items;
DROP POLICY IF EXISTS "Users can update production items" ON production_items;
DROP POLICY IF EXISTS "Users can delete production items" ON production_items;

CREATE POLICY "Admins can view all production items"
ON production_items FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Order managers can view production items"
ON production_items FOR SELECT
USING (has_role(auth.uid(), 'order_manager'));

CREATE POLICY "Admins can create production items"
ON production_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Order managers can create production items"
ON production_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'order_manager'));

CREATE POLICY "Admins can update production items"
ON production_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Order managers can update production items"
ON production_items FOR UPDATE
USING (has_role(auth.uid(), 'order_manager'));

CREATE POLICY "Admins can delete production items"
ON production_items FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix security definer functions to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_auto_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  sequence_number INTEGER;
BEGIN
  SELECT nextval('auto_order_sequence') INTO sequence_number;
  RETURN 'AUTO-' || LPAD(sequence_number::TEXT, 3, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_complete_installer_tests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'execucao_teste' AND OLD.status != 'execucao_teste' THEN
    IF public.has_role(auth.uid(), 'installer') THEN
      NEW.status = 'homologado';
      NEW.updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;