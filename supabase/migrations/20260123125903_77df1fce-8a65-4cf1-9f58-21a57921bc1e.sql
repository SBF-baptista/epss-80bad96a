-- Create table for access profiles (permission templates)
CREATE TABLE public.access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_role app_role NOT NULL DEFAULT 'visualizador',
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for access_profiles
CREATE POLICY "Admins can manage access profiles"
ON public.access_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view access profiles"
ON public.access_profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add profile_id to link users to profiles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS access_profile_id UUID REFERENCES public.access_profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_profile ON public.user_roles(access_profile_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_access_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_access_profiles_timestamp
BEFORE UPDATE ON public.access_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_access_profile_timestamp();