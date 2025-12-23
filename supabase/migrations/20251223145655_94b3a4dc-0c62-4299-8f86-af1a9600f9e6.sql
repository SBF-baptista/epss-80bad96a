-- Drop the trigger first (correct name)
DROP TRIGGER IF EXISTS trigger_auto_complete_installer_tests ON public.homologation_cards;

-- Now drop the function with CASCADE to clean up any remaining dependencies
DROP FUNCTION IF EXISTS public.auto_complete_installer_tests() CASCADE;

-- Update any RLS policies that reference 'installer' or 'order_manager' roles
-- Drop and recreate the insert policy with correct roles
DROP POLICY IF EXISTS "Authenticated users can create homologation cards" ON public.homologation_cards;

CREATE POLICY "Authenticated users can create homologation cards"
ON public.homologation_cards
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'gestor')
  OR has_role(auth.uid(), 'operador_homologacao')
);