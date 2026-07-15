# Documentação Técnica — Sistema OPM/SS

> Documento gerado por levantamento direto no código-fonte (`src/`, `supabase/functions/`, migrações) e no banco de dados PostgreSQL (Supabase) do projeto. Não inclui presunções: se algo não foi encontrado explicitamente no repositório, está sinalizado na Seção 6.

Data do levantamento: 15/07/2026.

## Sumário

- [1. Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
- [2. Modelo de dados](#2-modelo-de-dados)
- [3. Endpoints e integrações](#3-endpoints-e-integrações)
  - [3.1 Endpoints internos (Edge Functions)](#31-endpoints-internos-edge-functions)
  - [3.2 Integrações externas](#32-integrações-externas)
- [4. Fluxos de negócio implementados](#4-fluxos-de-negócio-implementados)
- [5. Componentes de interface principais](#5-componentes-de-interface-principais)
- [6. Pendências e inconsistências encontradas](#6-pendências-e-inconsistências-encontradas)

---

## 1. Visão geral da arquitetura

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 5 + TypeScript 5 |
| UI | Tailwind CSS + shadcn/ui (Radix UI) + lucide-react + framer-motion |
| Estado remoto | `@tanstack/react-query` v5 (retries desabilitados para 401/403/404; `staleTime` 10 min) |
| Formulários | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| Roteamento | `react-router-dom` v6 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno) |
| Cliente Supabase | `@supabase/supabase-js` v2 (`src/integrations/supabase/client.ts`) |
| Hospedagem | Lovable (`https://opmss.lovable.app`) |
| Realtime | Supabase Realtime (subscrições governadas em `useCentralRealtime`) |

### Autenticação e sessão

- Provider `AuthProvider` em `src/hooks/useAuth.tsx` mantém `user` e `session` via `supabase.auth.onAuthStateChange`.
- Login por e-mail/senha (páginas `/login`, `/auth`, `/ativar`, `/reset-password`). **Confirmação de e-mail e 2FA estão desabilitados** por limitação de SMTP (memória do projeto).
- Regras de senha: mínimo 8 caracteres, uma maiúscula, um número e um caractere especial (aplicadas em `ResetPassword` / `ActivateAccount`).
- Sessões são persistidas no `localStorage` pelo cliente Supabase; logout usa try/catch para tolerar tokens expirados.
- Papel do usuário resolvido em `UserRoleProvider` (`src/hooks/useUserRole.tsx`) a partir de `user_roles` + `access_profiles`.
- Rotas protegidas por dois componentes:
  - `ProtectedRoute` — exige usuário autenticado.
  - `RoleProtectedRoute` — exige um `requiredModule` / `requiredModules` / `allowedRoles`. Admin sempre passa.
- Atividade (`user_last_seen`) atualizada com throttle de 5 min.

### Estrutura de pastas relevante (`src/`)

```
src/
├── App.tsx                     Rotas + providers globais
├── main.tsx                    Bootstrap Vite
├── index.css                   Tokens de design (HSL) + Tailwind layers
├── integrations/supabase/      Cliente e types gerados
├── hooks/                      useAuth, useUserRole, useCentralRealtime,
│                               useStalledAlerts, useFipeData, useIBGEData…
├── pages/                      Uma página por rota (Kickoff, Homologation,
│                               Planning, Scheduling, Kanban, Dashboard…)
├── components/
│   ├── configuration/          Modais e telas de agendamento/kits
│   ├── customer-tracking/      Timeline e cards de clientes
│   ├── dashboard/              KPIs, funis, gráficos
│   ├── homologation/           Kanban + formulários de homologação
│   ├── kickoff/                Recebimento e detalhes de veículos
│   ├── user-management/        CRUD de usuários, perfis, times
│   ├── shipment/, technicians/, scanner/, homologation-photos/, …
│   └── ui/                     shadcn primitives
├── services/                   Camada de acesso a dados (Supabase + APIs)
└── types/                      Tipos de domínio (permissions, order, …)

supabase/
├── config.toml                 Configuração das Edge Functions
├── functions/<nome>/index.ts   Edge Functions Deno
└── migrations/                 Migrações SQL versionadas
```

---

## 2. Modelo de dados

Inventário completo das tabelas `public.*` do Supabase deste projeto. Cada tabela lista campos, relacionamentos evidentes no schema/código e um resumo em linguagem simples das políticas RLS. O nome exato de cada policy pode ser consultado em `pg_policies`.

> **Observação transversal:** funções de segurança `has_role(uid, role)` e `has_module_access(uid, module, level)` (SECURITY DEFINER) são usadas pela maioria das policies para checar `user_roles`/permissões sem recursão. Admin bypassa todas as restrições. `service_role` (usado por Edge Functions) tem acesso amplo.

### 2.1 Autenticação, papéis e permissões

#### `user_roles`
Papel base do usuário e vínculo com perfil de acesso e time.
- `id`, `user_id` (auth.users), `role` (`app_role` enum), `access_profile_id → access_profiles`, `team_id → teams`, `created_at`.
- **RLS:** usuário vê seus próprios papéis; admins veem e atualizam todos.

#### `access_profiles`
Perfil de acesso reutilizável.
- `id`, `name`, `description`, `base_role` (`app_role`), `permissions` (JSONB — matriz `module → level`), `created_by`, `created_at`, `updated_at`.
- **RLS:** qualquer autenticado lê; apenas admins gerenciam.

#### `access_profile_history`
Histórico de alterações de perfil.
- `id`, `profile_id`, `changed_by`, `changed_by_email`, `changes` (JSONB), `name_before/after`, `description_before/after`, `created_at`.
- **RLS:** admins leem; autenticados inserem (com `changed_by = auth.uid()`).

#### `user_module_permissions`
Sobrescreve permissão por módulo por usuário. Considerado **legado** — a fonte de verdade migrou para `access_profiles.permissions` (memória do projeto), mas a tabela ainda é usada por policies RLS via `has_module_access`.
- `id`, `user_id`, `module` (`app_module` enum), `permission` (`permission_level` enum), `created_at`, `updated_at`.
- **RLS:** usuário vê as próprias; admins veem todas; apenas `service_role` grava.

#### `teams`
Times/agrupamentos.
- `id`, `name`, `description`, `permissions` (JSONB), `created_by`, timestamps.
- **RLS:** todos autenticados leem; apenas admins gerenciam.

#### `user_last_seen`
Última atividade do usuário (throttle de 5 min).
- `user_id` (PK), `last_seen_at`, `updated_at`.
- **RLS:** usuário atualiza a própria linha; admins e service_role leem todas.

#### `usuarios`
Espelho local mínimo de `auth.users`.
- `id`, `email`, `created_at`.
- **RLS:** usuário só lê/atualiza a própria linha.

### 2.2 Kickoff / clientes / veículos recebidos

#### `customers`
Cliente consolidado (usado em Planning e Customer Tracking).
- Identificação: `name`, `document_number`, `document_type`, `company_name`, `sale_summary_id`.
- Contato: `phone`, `email`, `sales_representative`, `package_name`, `contract_number`, `total_value`.
- Endereço: `address_*`.
- Contatos estruturados: `decision_maker_*`, `influencer_*`, `operations_contact_*`, `contacts` (JSONB).
- Instalação: `installation_locations` (JSONB), `has_installation_particularity`, `installation_particularity_details`, `kickoff_notes`.
- Bloqueios: `needs_blocking`, `needs_engine_blocking`, `needs_fuel_blocking`, `needs_accelerator_blocking`.
- Coleções: `vehicles` (JSONB), `accessories` (text[]), `modules` (text[]).
- Flags: `show_in_planning`.
- Auditoria: `created_by`, `created_at`, `updated_at`.
- **RLS:** leitura para quem tem acesso a `kickoff` ou `scheduling`; edição idem; apenas admins deletam. Triggers de sistema podem selecionar/atualizar.

#### `incoming_vehicles`
Veículos que chegaram via `receive-vehicle` e aguardam kickoff.
- `id`, `vehicle`, `brand`, `year`, `usage_type` (enum), `plate`, `quantity`.
- Origem: `company_name`, `cpf`, `phone`, endereço, `sale_summary_id`, `pending_contract_id`.
- Estado: `processed`, `homologation_status` (enum), `kickoff_completed`, `created_order_id`, `created_homologation_id`, `processing_notes`.
- Extras: `camera_extra_quantity`, `camera_extra_locations`, `tomticket_protocol`.
- **RLS:** system insere/atualiza; usuários com `kickoff` edit gerenciam; view operacional pode ler.

#### `kickoff_history`
Snapshot imutável de cada kickoff concluído.
- `sale_summary_id`, `company_name`, `total_vehicles`, `contacts`, `installation_locations`, `installation_particularity_details`, `kickoff_notes`, `vehicles_data`, `camera_extra_sale`, `accessories_sale`, `approved_by`, `approved_at`, timestamps.
- **RLS:** autenticados leem e criam; edit de kickoff atualiza.

#### `accessories`
Acessórios vinculados a `pedidos` e/ou `incoming_vehicles`.
- `incoming_vehicle_group_id`, `company_name`, `usage_type`, `name`, `quantity`, `categories`, `pedido_id → pedidos`, `vehicle_id → veiculos`, `received_at`.
- **RLS:** dono do pedido gerencia; permissão `accessories_supplies` gerencia; visualização derivada dos pedidos.

#### `custom_vehicle_models`
Modelos custom que o usuário cadastra (fora da FIPE).
- `id`, `brand_code`, `brand_name`, `model_name`, `created_by`, `created_at`.
- **RLS:** qualquer um lê; autenticados inserem.

### 2.3 Homologação

#### `homologation_cards`
Card no kanban de homologação.
- `brand`, `model`, `year`, `manufacture_year`, `status` (enum `homologation_status`), `requested_by`, `notes`.
- Vínculos: `incoming_vehicle_id`, `created_order_id`.
- Teste: `configuration`, `test_scheduled_date`, `test_location`, `test_technician`, `test_checklist` (JSONB), `installation_photos` (text[]), `chassis_info`, `electrical_connection_type`, `technical_observations`.
- Soft-delete: `deleted_at`.
- **RLS:** edit de `homologation` gerencia; view lê; admins deletam.

#### `homologation_files`, `homologation_photos`
Anexos de card de homologação. `file_name`, `file_path`, `file_size`, `content_type`, `uploaded_by`, `created_at`. `homologation_photos` inclui `photo_type`.
- **RLS:** autenticados leem, inserem, atualizam e deletam. Bucket associado: `homologation-files` (limite 20MB — memória do projeto).

#### `homologation_kits`
Kit vinculado a um card.
- `homologation_card_id`, `name`, `description`, `category`, `segsale_product`, `segsale_module` (text[]), `segsale_accessory` (text[]), timestamps.
- **RLS:** autenticados gerenciam; policy adicional para triggers.

#### `homologation_kit_accessories`
Itens do kit de homologação. `kit_id`, `item_name`, `item_type`, `description`, `quantity`, `notes`.
- **RLS:** autenticados gerenciam.

#### `automation_rules_extended`
Regras de sugestão automática (marca/modelo/ano → rastreador/configuração).
- `id` (int), `category`, `brand`, `model`, `model_year`, `tracker_model`, `configuration`, `notes`, `created_at`.
- **RLS:** autenticados e permissões `homologation` gerenciam.

#### `automation_rule_photos`
Fotos anexadas a regras. Campos padrão de arquivo + `automation_rule_id`.

#### `item_edit_requests`
Solicitações de edição de kits/acessórios/insumos que exigem aprovação (gestor/admin).
- `item_type`, `item_name`, `original_data` (JSONB), `requested_changes` (JSONB), `reason`, `status`, `requested_by`, `reviewed_by`, `reviewed_at`, `review_notes`, `kit_id`.
- **RLS:** autenticados criam e leem; gestor/admin atualizam.

#### `item_homologation_history`
Histórico de mudança de status de itens homologados. `item_name`, `item_type`, `status`, `changed_at`, `changed_by`.

#### `kit_item_options`
Catálogo global de opções para itens de kit (auto-cadastrado ao digitar).
- `item_name`, `item_type`, `description`, `created_by`.
- **RLS:** insert exige `auth.uid() = created_by`; dono edita/deleta; admins deletam qualquer; module users leem.

### 2.4 Agendamento e logística

#### `installation_schedules`
Agendamento simples de instalação (usado em `Scheduling` / `Planning`).
- Data/hora: `scheduled_date`, `scheduled_time`.
- Técnico: `technician_name`, `technician_whatsapp`, `phone`, `local_contact`.
- Local: `address`, `reference_point`.
- Serviço: `customer`, `plate`, `service`, `vehicle_model`, `vehicle_year`, `tracker_model`, `tipo_contrato`, `observation`, `scheduled_by`.
- Vínculo: `kit_schedule_id → kit_schedules`, `deletion_request_status`, `created_by`, timestamps.
- **RLS:** todos autenticados leem/inserem/atualizam/deletam.

#### `kit_schedules`
Agendamento estruturado com kit, cliente e endereço.
- `kit_id`, `technician_id → technicians`, `scheduled_date`, `installation_time`, `status`, `notes`.
- Cliente: `customer_id`, `customer_name/document_number/phone/email`.
- Endereço: `installation_address_*`.
- Veículo: `vehicle_plate/brand/model/year`, `configuration`.
- Coleções: `accessories` (text[]), `supplies` (text[]), `selected_kit_ids` (uuid[]).
- Rastreio: `tracking_code`, `incoming_vehicle_id`.
- **RLS:** leitura/edição por permissão `scheduling`; system pode inserir.

#### `kit_schedule_status_history`
Auditoria de mudanças de status. `kit_schedule_id`, `previous_status`, `new_status`, `changed_at`, `changed_by`, `notes`.
- **RLS:** autenticados leem; system insere.

#### `technicians`
Técnicos cadastrados. `name`, `phone`, endereço completo, `created_by`, timestamps.
- **RLS:** autenticados gerenciam.

#### `scheduling_service_options`
Opções de serviço (autocomplete auto-persistido no formulário).
- `service_name`, `created_by`, `created_at`.
- **RLS:** autenticados leem e criam.

#### `solicitacoes_exclusao_agendamento`
Solicitações de exclusão que exigem aprovação.
- `agendamento_id`, `veiculo`, `filial_contrato`, `tipo_contrato`, `status`, `solicitado_por/em`, `decidido_por/em`, `motivo`, `resultado_api` (JSONB), `snapshot` (JSONB).
- **RLS:** solicitante e aprovadores leem; aprovadores atualizam; usuário cria as próprias.

#### `installation_confirmations`
Confirmações recebidas de sistemas externos que casam com um agendamento. `plate`, `imei`, `source`, `raw_payload`, `matched_schedule_id`.
- **RLS:** autenticados leem; system insere.

#### `installation_search_history`
Log de buscas de placa em `PlateVerification`. `searched_plate`, `searched_by`, `found`, `result_type`, `result_data`, `created_at`.
- **RLS:** autenticados inserem; admins gerenciam.

#### `instalacoes_recebidas`
Instalações recebidas via API `POST /instalacao`.
- Empresa, contato, endereço, técnico, veículo, tracker, sim, `accessories/photos/checklist/metadata` (JSONB), `raw_payload`, `source`, `request_id`, `status`, campos legados `contrato/filial/placa/imei/tecnico_instalador`.
- **RLS:** admins gerenciam; autenticados leem.

#### `retiradas_recebidas`
Retiradas recebidas via `POST /retirada`. `contrato`, `filial`, `placa`, `imei`, `tecnico_retirada`, `motivo`, `observacoes`, `status`, `raw_payload`, `source`, `request_id`.
- **RLS:** autenticados leem; service_role gerencia.

### 2.5 Logística e produção (Kanban)

#### `pedidos`
Pedido de produção/logística.
- `numero_pedido`, `data`, `configuracao`, `status` (enum), `usuario_id`, `company_name`.
- Produção: `production_started_at`, `production_completed_at`, `production_notes`.
- Envio: `shipment_recipient_id → shipment_recipients`, endereço de envio, `shipment_prepared_at`, `correios_tracking_code`.
- **RLS:** dono vê/edita; operador agendamento vê "enviado"; permissão operacional lê.

#### `veiculos`
Veículo do pedido. `pedido_id`, `tipo`, `marca`, `modelo`, `quantidade`.
- **RLS:** derivada do pedido dono; view operacional lê.

#### `rastreadores`
Rastreadores do pedido. `pedido_id`, `modelo`, `quantidade`.
- **RLS:** idem `veiculos`.

#### `production_items`
Itens escaneados na produção. `pedido_id`, `kit_schedule_id`, `imei`, `serial_number`, `production_line_code`, `scanned_at`, `created_by`.
- **RLS:** autenticados gerenciam.

#### `shipment_recipients`
Destinatários pré-cadastrados de envio. Nome, endereço completo, `phone`.
- **RLS:** autenticados gerenciam.

### 2.6 Integrações e monitoramento

#### `integration_state`
Estado de integrações incrementais (cursor por integração).
- `integration_name` (unique), `last_processed_id`, `last_poll_at`, `status`, `error_count`, `last_error`, `metadata` (JSONB).
- **RLS:** autenticados leem; service_role gerencia.

#### `ruptela_vehicles_cache`
Cache do scraper Ruptela. `cache_key`, `payload` (JSONB), `fetched_at`.
- **RLS:** autenticados leem (write só por service_role via edge function).

#### `api_endpoints`
Endpoints monitorados em `ApiMonitoring`. Nome, URL, método, sistema, headers, body padrão, ativo, tempo esperado, criador.
- **RLS:** apenas admins gerenciam.

#### `api_execution_logs`
Execuções registradas em `ApiMonitoring`. `endpoint_id`, status HTTP, tempo, request/response, erro, `executed_by`, `executed_at`.
- **RLS:** apenas admins gerenciam.

#### `app_logs`
Log operacional interno. Muitos campos: `action`, `module`, `action_type`, `origin`, `impact_level`, `status`, entidade, estado anterior/novo, campos alterados, erro, device/browser/session, flags LGPD/critical/reversible, ambiente, duração, papel/perfil do usuário.
- **RLS:** apenas admins leem/deletam; system insere.

#### `whatsapp_message_logs`
Log de mensagens enviadas via `send-whatsapp` / `send-daily-agenda`. `message_sid`, `recipient_name/phone`, `template_type`, `message_content`, `initial_status`, `final_status`, `error_code/message`, `friendly_message`, `dispatch_type`, `sent_at`.
- **RLS:** autenticados leem; service_role insere.

#### `simulator_simulations`
Simulações de kickoff salvas pelo usuário. `user_id`, `file_name`, `total_rows`, `supported_count`, `payload` (JSONB).
- **RLS:** o próprio usuário gerencia.

#### `workflow_chain` (view/tabela vista no schema)
Aparece no schema como visão de encadeamento `incoming_vehicle_id → …` (não há CRUD direto no código). Ver Seção 6.

---

## 3. Endpoints e integrações

### 3.1 Endpoints internos (Edge Functions)

Todas as Edge Functions ficam em `supabase/functions/<nome>/index.ts` e são publicadas em `https://<project-ref>.supabase.co/functions/v1/<nome>`. O flag `verify_jwt` está em `supabase/config.toml`.

| Função | Método | JWT | Autenticação adicional | Entrada | Resposta | Origem no código |
|---|---|---|---|---|---|---|
| `receive-vehicle` | POST | não | header `x-api-key` = `VEHICLE_API_KEY` | array de grupos de venda (`sale_summary_id`, veículos, contatos…) | 201 com `processing_summary` | chamada por Segsale/webhook para popular `incoming_vehicles` |
| `segsale-webhook` | POST | não | verifica secret e reencaminha | payload cru do Segsale | 200 status | webhook oficial |
| `sync-segsale-auto` | POST | não | invocação por `pg_cron` | — | 200 relatório | job automatizado de sync |
| `fetch-segsale-products` | POST | não | rate limit 5/min por IP | `{ pending_contract_id }` | itens do contrato | usado por Kickoff/receive-vehicle |
| `fetch-segsale-extras` | POST | (default) | — | `{ produtoId? }` | itens/extras do produto | UI de configuração de kit |
| `kickoff-process-vehicles` | POST | sim | — | `{ vehicle_ids[], … }` | processamento em lote | página Kickoff (aprovação) |
| `create-homologation` | POST | sim | valida JWT manualmente | `{ vehicle, test_checklist, photos[]… }` | card criado + uploads | modal “Nova homologação” |
| `get-homologation-data` | GET/POST | não | — | consulta agregada | dados de kanban | Homologation |
| `backfill-homologations` | POST | (default) | `x-api-key` = `VEHICLE_API_KEY` | — | relatório | manutenção |
| `create-frota-unidade` | POST | não | assina HMAC p/ API Frota | `{ scheduleId }` | resposta da API Frota + sempre 200 | ao criar agendamento |
| `frota-check-placa-pendente` | POST | (default) | HMAC saindo | `{ placa, tipoContrato? }` | `{ ok, pendente, data? }` | validação em `createKitSchedule` |
| `frota-pendentes-listar` | POST | (default) | HMAC saindo | `{ tipoContrato }` | lista de placas pendentes | `/plate-verification` |
| `check-plate-dispatch` | POST | (default) | admin (checa `has_role`) | `{ placa }` | agenda local + tentativa criar unidade | debug/admin |
| `approve-schedule-deletion` | POST | sim | valida JWT + `has_role` | `{ solicitacao_id, decisao, motivo? }` | resultado + chamada API `DELETE unidade/status` | página “Solicitações de Agendamento” |
| `confirm-installation` | POST | não | JWT manual | `{ plate, imei, source, raw }` | grava `installation_confirmations` | webhook externo |
| `instalacao` | POST | não | `x-api-key` | payload completo de instalação | grava `instalacoes_recebidas` | integração externa |
| `retirada` | POST | não | `x-api-key` | `{ contrato, filial, placa, imei, motivo… }` | grava `retiradas_recebidas` | integração externa |
| `opm-installation` | POST | não | `x-api-key` estático | payload OPM | valida placa e responde | integração externa OPM |
| `verify-vehicle` | POST | (default) | — | `{ plate }` | verifica pendências | admin |
| `check-ruptela-vehicle` | POST | (default) | — | `{ brand, model, year }` | scraping cacheado no `ruptela_vehicles_cache` | UI de homologação (auto-preencher config) |
| `send-whatsapp` | POST | não | JWT | `{ to, template, variables }` | Twilio Content API | modal de agendamento |
| `send-daily-agenda` | POST | não | cron 17:30 BRT | — | envia agendas do dia seguinte | job diário |
| `kafka-publish-agendamento` | POST | não | — | `{ scheduleId, tipo }` | publica evento Kafka | pós-criação de agendamento |
| `kafka-test-publish` | POST | não | admin | `{ topic, payload }` | teste manual | página admin |
| `search-tomticket` | POST | (default) | — | `{ query }` | consulta TomTicket | Kickoff (protocolo) |
| `update-bem`, `trocar-bem` | POST | não | HMAC/Segsale | payload de tombamento | proxy pra Segsale | logística |
| `manage-users` | POST | não | JWT + admin | `{ action, payload }` | CRUD via Admin API | UserManagement |
| `test-api-endpoint`, `test-frota-unidade` | POST | não | admin | payload livre | proxy de teste | ApiMonitoring |

### 3.2 Integrações externas

Base do domínio de cada terceiro conforme encontrado no código:

| Provedor | Endpoint | Uso |
|---|---|---|
| **Segsat/Segsale** | `GET https://ws-sale.segsat.com/segsale/relatorios/produtos-por-veiculo` | Lista produtos por veículo — `fetch-segsale-products` |
|  | `GET https://ws-sale.segsat.com/segsale/relatorios/itens-produtos` | Itens dos produtos — `fetch-segsale-products` |
|  | `GET https://ws-sale.segsat.com/segsale/produto/6/extras` e `/itens` | Extras/itens do produto — `fetch-segsale-extras` |
|  | `POST https://ws-sale.segsat.com/segsale/tombamento/updateBem` | Atualiza local do bem — `update-bem` |
|  | `POST https://ws-sale.segsat.com/segsale/tombamento/trocarLocalBemList` | Troca local em lote — `trocar-bem` |
| **Frota (DigitalOcean)** | `POST https://frota-auto-aityd.ondigitalocean.app/api/unidade` | Cria unidade após agendamento — `create-frota-unidade` (HMAC: `X-Timestamp`, `X-Nonce`, `X-Signature`) |
|  | `DELETE https://frota-auto-aityd.ondigitalocean.app/api/unidade/status` | Desativa unidade — `approve-schedule-deletion` |
|  | `GET /api/unidade/pendente?tipoContrato=…&placa=…` | Checa placa pendente — `frota-check-placa-pendente` |
|  | `GET /api/unidade/pendente/listar?tipoContrato=…` | Lista placas pendentes — `frota-pendentes-listar` |
| **Twilio** | `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` | WhatsApp (template UTILITY) — `send-whatsapp` / `send-daily-agenda` |
| **TomTicket** | `GET/POST https://api.tomticket.com/v2.0/ticket/list` | Busca protocolo — `search-tomticket` e `receive-vehicle/processing.ts` |
| **Ruptela** | `GET https://vehicles.ruptela.com/vehicles` e `/vehicle/{id}` | Scraping de compatibilidade — `check-ruptela-vehicle` (cache 24h) |
| **ViaCEP / BrasilAPI** | frontend (`cepService.ts`) | Autopreenchimento de endereço no Kickoff |
| **FIPE** | frontend (`fipeService.ts`) | Marca/modelo/ano |
| **IBGE** | frontend (`ibgeService.ts`) | UF/município |

Autenticação: Segsat/Segsale/Frota usam credenciais em `Deno.env` (`FROTA_SEGSALE_API_KEY`, `FROTA_SEGSALE_BASE_URL`, `SEGSALE_*`). Twilio usa `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, templates. `VEHICLE_API_KEY` autentica webhooks recebidos.

---

## 4. Fluxos de negócio implementados

### 4.1 Recebimento de veículos (Segsale → Kickoff)

1. Segsale (ou job `sync-segsale-auto`) chama `POST /receive-vehicle` com o(s) grupo(s) de venda e header `x-api-key`.
2. `receive-vehicle` valida payload, cria/atualiza `incoming_vehicles` e opcionalmente busca produtos via `fetch-segsale-products`.
3. Um protocolo TomTicket é anexado automaticamente (`processing.ts` → `search-tomticket`).
4. Veículos ficam em `Kickoff` com styling por dias pendentes (>7 vermelho, ≥5 âmbar).

### 4.2 Kickoff → Cliente + Homologação

1. Operador abre um sale group na página `Kickoff`, ajusta contatos/endereços/particularidades (ViaCEP + FIPE ajudam).
2. Placa por local respeita "uma placa por local" — apagar libera a placa.
3. `KickoffDetailsModal` exige acessórios em cada veículo antes de liberar para Planning (regra de negócio).
4. Ao concluir, é gerado um `customers` consolidado por `sale_summary_id`, um `kickoff_history` (snapshot imutável) e cards em `homologation_cards` quando aplicável. `incoming_vehicles.kickoff_completed = true`.

### 4.3 Homologação (kanban)

1. Cards criados manualmente (`create-homologation`) ou pelo kickoff.
2. Movimentação entre colunas atualiza `status` (enum `homologation_status`).
3. Fotos e arquivos anexados vão para storage `homologation-files` (máx 20MB) e são referenciados em `homologation_photos`/`homologation_files`.
4. Kits homologados vivem em `homologation_kits` + `homologation_kit_accessories`. Item novo em input auto-cria em `kit_item_options`.
5. Edições/exclusões sensíveis passam por `item_edit_requests` (gestor/admin aprovam).
6. Regras de sugestão automática em `automation_rules_extended` casam marca/modelo/ano → rastreador/config (FMC150 telemetria / FMC130 rastreamento).

### 4.4 Planejamento e agendamento

1. Cliente aparece em `Planning` quando `show_in_planning=true` e não é bloqueado (acessórios/insumos obrigatórios presentes; "Combustível" e "Partida" bloqueiam).
2. Em `Scheduling`, `EnhancedKitScheduleModal` monta o agendamento, criando `kit_schedules` + `installation_schedules`.
3. **Validação de placa (nova):** `createKitSchedule` chama `frota-check-placa-pendente`; se não estiver pendente no Segsale, lança erro e pede que a placa seja inserida lá.
4. Ao inserir, `create-frota-unidade` é acionada e uma mensagem WhatsApp é disparada via `send-whatsapp` (template UTILITY) para o técnico; log em `whatsapp_message_logs`.
5. Status muda ao longo do tempo, com trilha em `kit_schedule_status_history`.
6. **Solicitação de exclusão:** o operador cria em `solicitacoes_exclusao_agendamento`; aprovador vai em `/schedule-deletion-requests`, e `approve-schedule-deletion` chama a Frota para desativar a unidade e apaga o agendamento.

### 4.5 Confirmação de instalação

1. Sistema externo faz `POST /confirm-installation` (ou `/instalacao`) com placa/IMEI.
2. Registro cai em `installation_confirmations` (ou `instalacoes_recebidas`) e o agendamento correspondente é vinculado por `matched_schedule_id`.
3. UI em `Installation` (admin) permite consultar.

### 4.6 Kanban logístico (pedidos)

1. `Kanban` mostra `pedidos` agrupados por `company_name`.
2. Operador move o card entre "Aguardando produção → Em produção → Concluído → Enviado".
3. `production_items` são escaneados via câmera/scanner (`ProductionScannerModal`), com IMEI/Serial únicos globalmente.
4. Ao preparar envio, endereço é gravado no próprio `pedidos`; `correios_tracking_code` é adicionado; `update-bem` / `trocar-bem` sincronizam com Segsat.

### 4.7 WhatsApp

1. Agenda diária automatizada às 17:30 BRT via `send-daily-agenda` (template 7 variáveis).
2. Templates devem ser categoria UTILITY (Twilio). Conteúdo tem markdown removido antes de gravar log.
3. Painel `/whatsapp-control` mostra histórico de `whatsapp_message_logs`.

### 4.8 Alertas de processos parados

Hook `useStalledAlerts` + componentes `StalledAlertsBanner/List/Popup` monitoram registros sem progresso por N dias e mostram banner global.

### 4.9 Permissões

- Papel base em `user_roles.role` (enum `app_role`: admin, gestor, operador, visualizador).
- `access_profiles.permissions` é a fonte de verdade dos níveis por módulo.
- `RoleProtectedRoute` bloqueia a rota; dentro das páginas, botões "criar/editar/deletar" são escondidos para nível `view`.
- Nível `approve` implica `edit`.
- Admin bypassa tudo.

### 4.10 Gestão de usuários

- CRUD via `manage-users` (Admin API do Supabase) — criar, resetar acesso, deletar em cascata.
- "Resetar acesso" força `must_change_password`.

### 4.11 Simulador de kickoff

Página `/kickoff/simulador` recebe planilha, avalia compatibilidade contra `homologation_kits`/`automation_rules_extended`, mostra resultado em `/kickoff/simulador/resultado`, grava em `simulator_simulations`.

---

## 5. Componentes de interface principais

### Rotas top-level (`src/App.tsx`)

| Rota | Página / arquivo | Permissão | O que faz |
|---|---|---|---|
| `/` | `SmartRedirect` | autenticado | redireciona para a primeira rota permitida do usuário |
| `/login`, `/auth` | `pages/Login.tsx`, `pages/Auth.tsx` | pública | login e recuperação |
| `/ativar` | `pages/ActivateAccount.tsx` | pública c/ token | ativação de conta |
| `/reset-password` | `pages/ResetPassword.tsx` | pública c/ token | troca de senha |
| `/dashboard` | `pages/Dashboard.tsx` | módulo `dashboard` | KPIs, funil, gráficos (`components/dashboard/*`) |
| `/kanban` | `pages/Kanban.tsx` | módulo `kanban` | quadro de pedidos logísticos |
| `/homologation` | `pages/Homologation.tsx` | módulo `homologation` | kanban de homologação (`components/homologation/*`) |
| `/kits` | `pages/KitManagement.tsx` | `kits` ou `homologation` | CRUD de kits |
| `/accessories-supplies` | `pages/AccessorySupplyHomologation.tsx` | `accessories_supplies` ou `homologation` | homologação de acessórios/insumos |
| `/edit-requests` | `pages/EditRequests.tsx` | `homologation` | aprovar solicitações de edição |
| `/technicians` | `pages/TechnicianManagement.tsx` | `technicians` | CRUD de técnicos |
| `/customer-tracking` | `pages/CustomerTracking.tsx` | `customer_tracking` | timeline e status por cliente (`components/customer-tracking/*`) |
| `/planning` | `pages/Planning.tsx` | `planning` | planejamento de instalações |
| `/scheduling` | `pages/Scheduling.tsx` | `scheduling` | agenda + modais (`components/configuration/*`) |
| `/config` | `pages/ConfigurationManagement.tsx` | `scheduling` ou `homologation` | dashboards de configuração |
| `/users` | `pages/UserManagement.tsx` | `users` | CRUD de usuários, perfis, times |
| `/kickoff` | `pages/Kickoff.tsx` | `kickoff` | recebimento + kickoff (`components/kickoff/*`) |
| `/kickoff/simulador[/resultado]` | `KickoffSimulator[Result].tsx` | autenticado | simulador de importação |
| `/history` | `pages/History.tsx` | admin | `app_logs` com filtros/export |
| `/whatsapp-control` | `pages/WhatsAppMessageControl.tsx` | `scheduling` | logs de WhatsApp |
| `/installation` | `pages/Installation.tsx` | admin | busca por placa + histórico |
| `/api-monitoring` | `pages/ApiMonitoring.tsx` | admin | `api_endpoints` + `api_execution_logs` |
| `/plate-verification` | `pages/PlateVerification.tsx` | admin | consulta placas pendentes na Frota |
| `/schedule-deletion-requests` | `pages/ScheduleDeletionRequests.tsx` | `schedule_deletion_approval` | fila de aprovação |
| `/segsale-sales`, `/segsale-search` | `pages/SegsaleSales.tsx`, `SegsaleSearch.tsx` | admin | inspeção de vendas Segsale |
| `/modules` | `pages/ModuleSelection.tsx` | autenticado | menu inicial de módulos |
| `*` | `pages/NotFound.tsx` | pública | 404 |

### Componentes de destaque

- `Layout.tsx` + `AppNavigation.tsx` / `Navigation.tsx` — casca e menu.
- `RoleProtectedRoute` — checagem de permissão + fallback.
- `HomologationKanban`, `HomologationColumn`, `HomologationCard` — kanban drag & drop.
- `EnhancedKitScheduleModal`, `KitScheduleModal`, `ScheduleModal`, `ScheduleEditModal`, `ScheduleFormModal`, `ScheduleHistoryModal`, `TechnicianAgendaModal` — família de modais de agendamento.
- `ProductionScannerModal` + `hooks/scanner/*` — leitura de código de barras (ZXing).
- `alerts/StalledAlertsBanner|List|Popup` — alertas globais.
- `user-management/PermissionMatrix` — matriz de módulos × níveis.

---

## 6. Pendências e inconsistências encontradas

1. **`user_module_permissions` legado.** A memória do projeto (`permissions-source-of-truth`) diz que `access_profiles.permissions` é a fonte de verdade, mas várias RLS policies e a função `has_module_access` ainda dependem de `user_module_permissions`. A migração completa ainda não aconteceu.
2. **`installation_schedules` sem permissão granular.** Todas as políticas são "authenticated users can *" — não há checagem de módulo `scheduling`, ao contrário de `kit_schedules`. Frontend restringe via `RoleProtectedRoute`, mas o banco não.
3. **Policies duplicadas.** Em `accessories`, `automation_rules_extended`, `homologation_cards`, `homologation_kits`, `veiculos`, `rastreadores` existem várias policies com objetivos sobrepostos (ex.: "Authenticated users can *" **e** "Module users can *" **e** "Users with X edit access can manage"). Efetivamente prevalece a mais permissiva, mas a intenção fica ambígua.
4. **Tabela/visão `workflow_chain`** aparece no schema (`incoming_vehicle_id …`) mas não há CRUD nem SELECT explícito em `src/services/*`. Provavelmente é dead code ou uma view apenas para debug.
5. **`instalacoes_recebidas`** carrega campos duplicados (`vehicle_plate` vs `placa`, `tracker_imei` vs `imei`, `technician_name` vs `tecnico_instalador`, `contact_phone` vs coluna `filial`), sinalizando um schema legado migrado para novos nomes sem descontinuar os antigos.
6. **`api_endpoints` / `api_execution_logs`** só têm CRUD via a página `ApiMonitoring` (admin). Nenhuma outra parte da aplicação lê essa tabela; se o objetivo é rastrear todas as chamadas, o wiring nas outras Edge Functions não existe hoje.
7. **`ruptela_vehicles_cache`** tem apenas policy de SELECT para autenticados; INSERT/UPDATE dependem exclusivamente de `service_role`. Se a função `check-ruptela-vehicle` for chamada com JWT de usuário comum (não `service_role`), o cache não será atualizado — a função hoje usa service role via `SUPABASE_SERVICE_ROLE_KEY`, mas a policy não deixa isso explícito.
8. **`kafka-publish-agendamento` / `kafka-test-publish`** existem como Edge Functions, mas o repositório não deixa claro qual broker/tópico é o alvo (URL fica em env var), e não há UI que consuma o resultado — o disparo é fire-and-forget.
9. **`opm-installation`** usa `x-api-key` estática (memória do projeto). Não há rotação nem log dedicado; entrada cai em `instalacoes_recebidas` misturada com outras origens.
10. **`send-daily-agenda` cron.** O cron 17:30 BRT vive fora do repositório (agendado no Supabase via `pg_cron`) — não há SQL versionado no `supabase/migrations/` que provisione o job.
11. **`solicitacoes_exclusao_agendamento`** guarda `snapshot` e `resultado_api`, mas o histórico do agendamento excluído só sobrevive nesse snapshot: a linha em `installation_schedules` é apagada e a de `kit_schedules` mantém apenas o histórico de status. Se a aprovação falhar depois do delete local, o estado fica órfão.
12. **Campos não usados detectáveis por inspeção:** `homologation_cards.installation_photos` (text[]) coexiste com a tabela `homologation_photos` — o array parece herança de versão anterior.
13. **Documentação inline pobre em várias functions** (`backfill-homologations`, `verify-vehicle`, `kafka-*`): sem README nem comentários explicando o payload esperado.

---

_Fim do documento._
