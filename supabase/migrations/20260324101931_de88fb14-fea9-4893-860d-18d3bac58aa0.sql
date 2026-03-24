INSERT INTO incoming_vehicles (
  brand, vehicle, year, plate, company_name, cpf, phone,
  usage_type, sale_summary_id, pending_contract_id,
  address_street, address_number, address_district, address_city, address_zip_code, address_complement,
  quantity, processed, processing_notes
) VALUES (
  'HONDA', 'CG 160 START', 2019, 'QTO2117', 'CONTROL CONSTRUCOES SA', '02949016000170', '99121034',
  'telemetria_gps', 10943, 205985,
  'AVENIDA MINISTRO JOSE AMERICO DE ALMEIDA', '442', 'TORRE', 'JOÃO PESSOA', '58040300', 'SALA 804 CXPST 049',
  1, false, 'Inserted from Segsale API - sale_summary_id 10943'
);