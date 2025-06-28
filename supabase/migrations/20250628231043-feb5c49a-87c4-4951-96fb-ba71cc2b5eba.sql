
-- Primeiro, vamos adicionar dados de exemplo para testar o dashboard
-- Vamos inserir alguns pedidos de exemplo com veículos e rastreadores

-- Inserir pedidos de exemplo (assumindo que já existe um usuário autenticado)
INSERT INTO public.pedidos (usuario_id, numero_pedido, data, configuracao, status) VALUES
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-001', '2024-06-01 10:00:00', 'HCV MERCEDES', 'novos'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-002', '2024-06-03 14:30:00', 'HCV VOLVO', 'producao'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-003', '2024-06-05 09:15:00', 'LCV FIAT', 'aguardando'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-004', '2024-06-07 16:45:00', 'HCV SCANIA', 'enviado'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-005', '2024-06-10 11:20:00', 'HCV DAF', 'standby'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-006', '2024-06-12 08:30:00', 'LCV RENAULT', 'producao'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-007', '2024-06-15 13:10:00', 'HCV IVECO', 'novos'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-008', '2024-06-18 15:25:00', 'HCV FORD', 'enviado'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-009', '2024-06-20 10:40:00', 'LCV PEUGEOT', 'aguardando'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-010', '2024-06-22 12:15:00', 'HCV MERCEDES', 'standby'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-011', '2024-06-25 09:00:00', 'HCV VOLVO', 'producao'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-012', '2024-06-27 14:20:00', 'LCV FIAT', 'enviado');

-- Inserir veículos para os pedidos
INSERT INTO public.veiculos (pedido_id, tipo, marca, modelo, quantidade) VALUES
  -- PED-001
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-001'), 'Caminhão', 'Mercedes-Benz', 'Actros 2546', 2),
  -- PED-002
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-002'), 'Caminhão', 'Volvo', 'FH 540', 1),
  -- PED-003
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-003'), 'Van', 'Fiat', 'Ducato', 3),
  -- PED-004
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-004'), 'Caminhão', 'Scania', 'R 450', 1),
  -- PED-005
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-005'), 'Caminhão', 'DAF', 'XF 480', 2),
  -- PED-006
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-006'), 'Van', 'Renault', 'Master', 4),
  -- PED-007
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-007'), 'Caminhão', 'Iveco', 'Stralis 570', 1),
  -- PED-008
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-008'), 'Caminhão', 'Ford', 'Cargo 2429', 2),
  -- PED-009
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-009'), 'Van', 'Peugeot', 'Boxer', 2),
  -- PED-010
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-010'), 'Caminhão', 'Mercedes-Benz', 'Atego 1719', 1),
  -- PED-011
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-011'), 'Caminhão', 'Volvo', 'FM 370', 3),
  -- PED-012
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-012'), 'Van', 'Fiat', 'Fiorino', 5);

-- Inserir rastreadores para os pedidos
INSERT INTO public.rastreadores (pedido_id, modelo, quantidade) VALUES
  -- PED-001
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-001'), 'Ruptella Smart5', 2),
  -- PED-002
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-002'), 'Teltonika FMB920', 1),
  -- PED-003
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-003'), 'Queclink GV75', 3),
  -- PED-004
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-004'), 'Ruptella ECO4', 1),
  -- PED-005
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-005'), 'Positron PX300', 2),
  -- PED-006
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-006'), 'Ruptella Smart5', 4),
  -- PED-007
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-007'), 'Teltonika FMB920', 1),
  -- PED-008
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-008'), 'Queclink GV75', 2),
  -- PED-009
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-009'), 'Ruptella ECO4', 2),
  -- PED-010
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-010'), 'Positron PX300', 1),
  -- PED-011
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-011'), 'Ruptella Smart5', 3),
  -- PED-012
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-012'), 'Teltonika FMB920', 5);

-- Adicionar alguns pedidos mais antigos para análise temporal
INSERT INTO public.pedidos (usuario_id, numero_pedido, data, configuracao, status) VALUES
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-013', '2024-05-15 10:00:00', 'HCV MERCEDES', 'enviado'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-014', '2024-05-20 14:30:00', 'HCV VOLVO', 'enviado'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-015', '2024-05-25 09:15:00', 'LCV FIAT', 'enviado'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-016', '2024-04-10 16:45:00', 'HCV SCANIA', 'standby'),
  ((SELECT id FROM public.usuarios LIMIT 1), 'PED-017', '2024-04-15 11:20:00', 'HCV DAF', 'standby');

-- Adicionar veículos e rastreadores para os pedidos adicionais
INSERT INTO public.veiculos (pedido_id, tipo, marca, modelo, quantidade) VALUES
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-013'), 'Caminhão', 'Mercedes-Benz', 'Actros 2651', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-014'), 'Caminhão', 'Volvo', 'FH 460', 2),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-015'), 'Van', 'Fiat', 'Ducato', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-016'), 'Caminhão', 'Scania', 'R 500', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-017'), 'Caminhão', 'DAF', 'XF 530', 1);

INSERT INTO public.rastreadores (pedido_id, modelo, quantidade) VALUES
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-013'), 'Ruptella Smart5', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-014'), 'Teltonika FMB920', 2),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-015'), 'Queclink GV75', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-016'), 'Ruptella ECO4', 1),
  ((SELECT id FROM public.pedidos WHERE numero_pedido = 'PED-017'), 'Positron PX300', 1);
