-- Disable the automatic trigger that creates conflicting orders
DROP TRIGGER IF EXISTS create_order_on_homologation_trigger ON homologation_cards;

-- Remove the function that was creating duplicate orders
DROP FUNCTION IF EXISTS create_order_on_homologation();