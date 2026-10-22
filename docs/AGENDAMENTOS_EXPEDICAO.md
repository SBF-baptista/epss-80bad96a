# Endpoint agendamentos e Expedição

`GET https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/agendamentos`

A resposta `{ "agendamentos": [...] }` reúne instalações agendadas e veículos marcados como **Enviado** na Expedição. POST continua sendo uma consulta com filtros no corpo; não cria registros.

Ao salvar o envio, o próprio `kit_schedules` passa a `shipped`; o endpoint lê esse estado diretamente. Não há uma segunda gravação ou requisição no navegador que possa perder o envio. Não é criado um agendamento fictício.

Veículos enviados retornam `status: "enviado"`, `kit_schedule_id`, `placa`, `cliente`, `marca_veiculo`, `modelo_veiculo`, `ano_veiculo`, `modelo_rastreador`, `tipo_contrato`, `contractcode` e `enviado_em`. Dados ausentes ficam `null`. `data`, `hora`, `servico` e `tecnico` ficam `null` até a instalação ser agendada; datas e técnicos de produção não são usados como instalação.

Quando existe uma instalação vinculada ao mesmo `kit_schedule_id`, ela substitui a entrada pendente e retorna `status: "agendado"`. A identificação do contrato segue `kit_schedule_id → incoming_vehicle_id → pending_contract_id`; placas iguais em vendas distintas não misturam contratos. A busca por placa permanece somente para registros legados sem vínculo.

Filtros existentes: `placa`, `cliente`, `tecnico`, `tipo_contrato`, `data_inicio`, `data_fim`, `limit`, `page`. Datas e técnico filtram instalações, excluindo pendentes sem esses valores. A paginação ocorre após reunir as duas fontes.