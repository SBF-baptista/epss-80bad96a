-- Drop existing policy and create a more permissive one
DROP POLICY IF EXISTS "Allow authenticated users full access to automation rules exten" ON public.automation_rules_extended;

-- Create new policies for automation_rules_extended
CREATE POLICY "Allow authenticated users to view automation rules" 
ON public.automation_rules_extended 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert automation rules" 
ON public.automation_rules_extended 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update automation rules" 
ON public.automation_rules_extended 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete automation rules" 
ON public.automation_rules_extended 
FOR DELETE 
USING (auth.role() = 'authenticated');