-- Fix overly permissive RLS policies by implementing role-based access control
-- Issue: PUBLIC_DATA_EXPOSURE and CLIENT_SIDE_AUTH

-- 1. Update customers table policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Only authorized roles can view customers"
ON public.customers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_agendamento')
);

CREATE POLICY "Only authorized roles can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_agendamento')
);

CREATE POLICY "Only authorized roles can update customers"
ON public.customers
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_agendamento')
);

CREATE POLICY "Only authorized roles can delete customers"
ON public.customers
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 2. Update accessories table policies
DROP POLICY IF EXISTS "Users can view accessories" ON public.accessories;
DROP POLICY IF EXISTS "Users can insert accessories" ON public.accessories;
DROP POLICY IF EXISTS "Users can update accessories" ON public.accessories;
DROP POLICY IF EXISTS "Users can delete accessories" ON public.accessories;

CREATE POLICY "Only authorized roles can view accessories"
ON public.accessories
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_homologacao') OR
  has_role(auth.uid(), 'operador_suprimentos')
);

CREATE POLICY "Only authorized roles can manage accessories"
ON public.accessories
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_homologacao')
);

-- 3. Update homologation_cards table policies
DROP POLICY IF EXISTS "Authenticated users can view homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Authenticated users can insert homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Authenticated users can update homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Authenticated users can delete homologation cards" ON public.homologation_cards;

CREATE POLICY "Only authorized roles can view homologation cards"
ON public.homologation_cards
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_homologacao')
);

CREATE POLICY "Only authorized roles can manage homologation cards"
ON public.homologation_cards
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_homologacao')
);

-- 4. Update incoming_vehicles table policies
DROP POLICY IF EXISTS "Authenticated users can view incoming vehicles" ON public.incoming_vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert incoming vehicles" ON public.incoming_vehicles;
DROP POLICY IF EXISTS "Authenticated users can update incoming vehicles" ON public.incoming_vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete incoming vehicles" ON public.incoming_vehicles;

CREATE POLICY "Only authorized roles can view incoming vehicles"
ON public.incoming_vehicles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_kickoff') OR
  has_role(auth.uid(), 'operador_homologacao')
);

CREATE POLICY "Only authorized roles can manage incoming vehicles"
ON public.incoming_vehicles
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_kickoff')
);

-- 5. Update automation_rules_extended table policies
DROP POLICY IF EXISTS "Authenticated users can view automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Authenticated users can insert automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Authenticated users can update automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Authenticated users can delete automation rules" ON public.automation_rules_extended;

CREATE POLICY "Only authorized roles can view automation rules"
ON public.automation_rules_extended
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_homologacao')
);

CREATE POLICY "Only authorized roles can manage automation rules"
ON public.automation_rules_extended
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_homologacao')
);

-- 6. Update kit_schedules table policies
DROP POLICY IF EXISTS "Authenticated users can view kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can update kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete kit schedules" ON public.kit_schedules;

CREATE POLICY "Only authorized roles can view kit schedules"
ON public.kit_schedules
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_agendamento')
);

CREATE POLICY "Only authorized roles can manage kit schedules"
ON public.kit_schedules
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'operador_agendamento')
);