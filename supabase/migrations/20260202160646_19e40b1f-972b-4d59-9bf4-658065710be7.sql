-- =============================================================================
-- MIGRATION: Update RLS policies to use granular module permissions
-- =============================================================================

-- Step 1: Create the has_module_access function
-- This function checks if a user has access to a specific module at a minimum permission level
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module app_module, _min_permission permission_level)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin always has access
    public.has_role(_user_id, 'admin'::app_role)
    OR
    -- Gestor always has view access
    (public.has_role(_user_id, 'gestor'::app_role) AND _min_permission IN ('view', 'edit'))
    OR
    -- Check module permissions with level hierarchy
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = _user_id
        AND ump.module = _module
        AND (
          CASE _min_permission
            WHEN 'none' THEN ump.permission IN ('none', 'view', 'edit', 'approve', 'admin')
            WHEN 'view' THEN ump.permission IN ('view', 'edit', 'approve', 'admin')
            WHEN 'edit' THEN ump.permission IN ('edit', 'approve', 'admin')
            WHEN 'approve' THEN ump.permission IN ('approve', 'admin')
            WHEN 'admin' THEN ump.permission = 'admin'
            ELSE false
          END
        )
    )
$$;

-- =============================================================================
-- Step 2: Update homologation_cards RLS policies
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Only authorized roles can view homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Only authorized roles can manage homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Authenticated users can create homologation cards" ON public.homologation_cards;

-- Create new policies using has_module_access
CREATE POLICY "Users with homologation view access can view cards"
ON public.homologation_cards
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with homologation edit access can manage cards"
ON public.homologation_cards
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Users with homologation edit access can create cards"
ON public.homologation_cards
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

-- =============================================================================
-- Step 3: Update incoming_vehicles RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Only authorized roles can view incoming vehicles" ON public.incoming_vehicles;
DROP POLICY IF EXISTS "Only authorized roles can manage incoming vehicles" ON public.incoming_vehicles;

CREATE POLICY "Users with kickoff view access can view incoming vehicles"
ON public.incoming_vehicles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with kickoff edit access can manage incoming vehicles"
ON public.incoming_vehicles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level)
);

-- =============================================================================
-- Step 4: Update accessories RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Only authorized roles can view accessories" ON public.accessories;
DROP POLICY IF EXISTS "Only authorized roles can manage accessories" ON public.accessories;

CREATE POLICY "Users with accessories view access can view"
ON public.accessories
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'accessories_supplies'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'kanban'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with accessories edit access can manage"
ON public.accessories
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'accessories_supplies'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

-- =============================================================================
-- Step 5: Update automation_rules_extended RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Only authorized roles can view automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Only authorized roles can manage automation rules" ON public.automation_rules_extended;

CREATE POLICY "Users with homologation view access can view automation rules"
ON public.automation_rules_extended
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with homologation edit access can manage automation rules"
ON public.automation_rules_extended
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

-- =============================================================================
-- Step 6: Update customers RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Only authorized roles can view customers" ON public.customers;
DROP POLICY IF EXISTS "Only authorized roles can update customers" ON public.customers;
DROP POLICY IF EXISTS "Only authorized roles can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Only authorized roles can delete customers" ON public.customers;

CREATE POLICY "Users with kickoff or scheduling view access can view customers"
ON public.customers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'scheduling'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'planning'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'customer_tracking'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with kickoff or scheduling edit access can update customers"
ON public.customers
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'scheduling'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'planning'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Users with kickoff or scheduling edit access can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'scheduling'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Only admins can delete customers"
ON public.customers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- Step 7: Update kit_schedules RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Only authorized roles can view kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Only authorized roles can manage kit schedules" ON public.kit_schedules;

CREATE POLICY "Users with scheduling view access can view kit schedules"
ON public.kit_schedules
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'gestor'::app_role) OR
  public.has_module_access(auth.uid(), 'scheduling'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'planning'::app_module, 'view'::permission_level) OR
  public.has_module_access(auth.uid(), 'customer_tracking'::app_module, 'view'::permission_level)
);

CREATE POLICY "Users with scheduling edit access can manage kit schedules"
ON public.kit_schedules
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_module_access(auth.uid(), 'scheduling'::app_module, 'edit'::permission_level) OR
  public.has_module_access(auth.uid(), 'planning'::app_module, 'edit'::permission_level)
);