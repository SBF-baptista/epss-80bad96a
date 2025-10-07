-- Add customer contact and address fields to incoming_vehicles
ALTER TABLE incoming_vehicles 
  ADD COLUMN cpf TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN address_district TEXT,
  ADD COLUMN address_street TEXT,
  ADD COLUMN address_number TEXT,
  ADD COLUMN address_zip_code TEXT,
  ADD COLUMN address_complement TEXT;