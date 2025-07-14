-- Create a function to generate AUTO order numbers using the sequence
CREATE OR REPLACE FUNCTION generate_auto_order_number()
RETURNS TEXT AS $$
DECLARE
  sequence_number INTEGER;
BEGIN
  -- Get the next value from the sequence
  SELECT nextval('auto_order_sequence') INTO sequence_number;
  
  -- Return formatted order number
  RETURN 'AUTO-' || LPAD(sequence_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;