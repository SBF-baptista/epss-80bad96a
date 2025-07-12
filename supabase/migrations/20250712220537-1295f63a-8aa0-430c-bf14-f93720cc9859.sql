-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'installer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update homologation_cards policies to include installer role
DROP POLICY IF EXISTS "Authenticated users can create homologation cards" ON public.homologation_cards;
CREATE POLICY "Authenticated users can create homologation cards"
ON public.homologation_cards
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'::text AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'installer')
  )
);

DROP POLICY IF EXISTS "Authenticated users can update homologation cards" ON public.homologation_cards;
CREATE POLICY "Authenticated users can update homologation cards"
ON public.homologation_cards
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (public.has_role(auth.uid(), 'installer') AND status IN ('execucao_teste', 'homologado'))
);

-- Insert default admin role for existing user (sergio.filho@segsat.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger to automatically move installer test executions to homologated
CREATE OR REPLACE FUNCTION public.auto_complete_installer_tests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If an installer updated the status to execucao_teste, automatically move to homologado
  IF NEW.status = 'execucao_teste' AND OLD.status != 'execucao_teste' THEN
    -- Check if the user is an installer
    IF public.has_role(auth.uid(), 'installer') THEN
      -- Automatically move to homologado status
      NEW.status = 'homologado';
      NEW.updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-completing installer tests
DROP TRIGGER IF EXISTS trigger_auto_complete_installer_tests ON public.homologation_cards;
CREATE TRIGGER trigger_auto_complete_installer_tests
BEFORE UPDATE ON public.homologation_cards
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_installer_tests();