-- Add notes column to automation_rules_extended table
ALTER TABLE public.automation_rules_extended 
ADD COLUMN notes TEXT;

-- Create an index for better performance on notes searches
CREATE INDEX idx_automation_rules_extended_notes ON automation_rules_extended(notes);