
INSERT INTO public.homologation_cards (id, brand, model, year, status, configuration, incoming_vehicle_id, created_at, updated_at)
VALUES (
  'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339',
  'Audi',
  'R8 4.2 V8 426cv Quattro R-tronic',
  2012,
  'homologado',
  'OBD-II',
  '5a48fdf8-7872-4e1e-9723-fa1f332b19ee',
  '2026-05-26 19:03:26.514246+00',
  now()
);

UPDATE public.incoming_vehicles
SET created_homologation_id = 'c1f819e0-93f0-4ce9-adc3-50aa8b4cc339',
    homologation_status = 'homologado'
WHERE id = '5a48fdf8-7872-4e1e-9723-fa1f332b19ee';
