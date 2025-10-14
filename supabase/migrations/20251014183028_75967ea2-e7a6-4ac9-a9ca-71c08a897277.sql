-- Create table to track integration state
CREATE TABLE IF NOT EXISTS integration_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text UNIQUE NOT NULL,
  last_processed_id integer,
  last_poll_at timestamp with time zone,
  status text DEFAULT 'active',
  error_count integer DEFAULT 0,
  last_error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert initial state for Segsale integration
INSERT INTO integration_state (integration_name, last_processed_id, status)
VALUES ('segsale', 0, 'active')
ON CONFLICT (integration_name) DO NOTHING;

-- Enable RLS
ALTER TABLE integration_state ENABLE ROW LEVEL SECURITY;

-- Policy for service role (edge functions)
CREATE POLICY "Service role can manage integration_state"
  ON integration_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users to view
CREATE POLICY "Authenticated users can view integration_state"
  ON integration_state
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_integration_state_updated_at
  BEFORE UPDATE ON integration_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();