-- Atualizar cliente Maria Oliveira Silva com veículos
UPDATE customers 
SET vehicles = '[
  {
    "plate": "ABC-1234",
    "brand": "Volkswagen",
    "model": "Constellation",
    "year": 2023
  },
  {
    "plate": "XYZ-5678",
    "brand": "Mercedes-Benz",
    "model": "Actros",
    "year": 2022
  },
  {
    "plate": "DEF-9012",
    "brand": "Volvo",
    "model": "FH 540",
    "year": 2024
  }
]'::jsonb,
modules = ARRAY['Módulo de Rastreamento', 'Sensor de Temperatura', 'Telemetria Avançada'],
accessories = ARRAY['Antena GPS', 'Cabo de Alimentação', 'Botão de Pânico']
WHERE name = 'Maria Oliveira Silva';