-- Remove agendamentos dos clientes de exemplo primeiro
DELETE FROM public.kit_schedules 
WHERE customer_id IN (
  SELECT id FROM public.customers 
  WHERE document_number IN ('49061905000', '12345678901', '98765432100')
);

-- Agora remove os clientes de exemplo criados automaticamente
DELETE FROM public.customers 
WHERE document_number IN ('49061905000', '12345678901', '98765432100');