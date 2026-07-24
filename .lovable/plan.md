# Diagnóstico de Vendas Pendentes (aba dev/admin)

Ferramenta técnica restrita a `admin` para recuperar vendas do Segsale que ficaram presas por `usage_type` inválido ou falha 4xx no `receive-vehicle`, com checagem **somente-leitura** no Wialon antes de qualquer reenvio.

## Escopo de acesso

- Rota nova `/diagnostico-vendas-pendentes` protegida por `RoleProtectedRoute` com `allowedRoles={['admin']}`.
- Item de sidebar visível apenas quando `isAdmin()` — não usar a whitelist do bypass.
- Novo módulo `pending_sales_recovery` no enum `app_module` (para consistência de permissões futuras).

## Fonte de dados

Query em `app_logs` filtrando:
- `action IN ('segsale_unmapped_usage_type', 'segsale_receive_vehicle_failed')`
- Agrupamento por `sale_summary_id` (extraído de `new_state` / `details` — os fixes anteriores já gravam isso lá).
- Para cada grupo: data do último evento, `company_name`, veículos (placa, marca, modelo, ano, usage_type bruto), motivo, payload cru para replay.

Ação de recuperação **exclui** o grupo da lista quando todas as placas já foram reprocessadas com sucesso (marcador em `pending_sales_recovery_log`).

## UI

Página com tabela expandível:

```text
[▸] Sale 11365  |  ACME LTDA  |  3 veíc.  |  usage_type inválido  |  20/jul 14:32   [Rechecar Wialon]
    ├─ ● ABC1D23  Volvo FH  2023  particular    [✓ já criada — Frota]           (ações bloqueadas)
    ├─ ○ XYZ4E56  Volvo FH  2023  particular    [não criada]           [☐ selecionar]
    └─ ○ QWE7R89  Scania R  2022  particular    [não criada]           [☐ selecionar]

  [Enviar selecionadas para Kickoff]   [Criar Unidade Agora para selecionadas]
```

- Checkboxes desabilitados para placas verdes.
- Botões de ação desabilitados se nenhuma placa "não criada" estiver selecionada.
- Cada ação abre `AlertDialog` de confirmação com resumo + campo obrigatório de justificativa.

## Checagem Wialon (read-only, crítica)

Nova edge function `wialon-search-plate` (não reaproveita `check-plate-dispatch` nem `verify-vehicle`, que têm efeitos colaterais):

1. `token/login` com `WIALON_TOKEN_FROTA` **e** `WIALON_TOKEN_AUTO`.
2. Para cada sistema, `core/search_items` com `itemsType=avl_unit`, filtro `sys_name` e/ou `nm` pela placa normalizada.
3. Retorna `{ plate, frota: {exists, item_id, item_name} | null, auto: {...} | null }`.
4. **Zero** chamadas de criação/update. Nenhum `unit/update_*`, nenhum POST à API interna de Frota.

Chamada em lote pela UI (uma request por venda, N placas dentro).

## Ações

### 1. "Enviar para Kickoff"
- Reconstrói payload do log (dados já corrigidos pelo mapeamento novo).
- Chama `receive-vehicle` internamente (via `supabase.functions.invoke`) por placa.
- Sucesso → grava em `pending_sales_recovery_log` (`action='sent_to_kickoff'`).

### 2. "Criar Unidade Agora"
- Reaproveita a lógica de `bypass-kickoff-to-scheduling`: HMAC POST à API Frota, insere em `frota_units_pending_imei` com `status='aguardando_imei'` (ou `erro_criacao`).
- Grava linha em `kickoff_bypass_log` com justificativa + `pending_sales_recovery_log` (`action='unit_created_now'`).

Ambas bloqueadas server-side se a placa aparecer no Wialon (re-checagem defensiva dentro da edge function, não confiar só na UI).

## Auditoria — nova tabela

```sql
CREATE TABLE public.pending_sales_recovery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_summary_id integer NOT NULL,
  plate text NOT NULL,
  action text NOT NULL,           -- 'sent_to_kickoff' | 'unit_created_now'
  system text,                    -- 'frota' | 'auto' | null
  status text NOT NULL,           -- 'success' | 'error' | 'blocked_already_exists'
  error_message text,
  justification text,
  performed_by uuid,
  performed_by_email text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- GRANTs para authenticated/service_role
-- RLS: SELECT/INSERT apenas para admin (has_role(auth.uid(),'admin'))
```

## Arquivos

- `supabase/functions/wialon-search-plate/index.ts` (novo, read-only)
- `supabase/functions/recover-pending-sale/index.ts` (novo, dispatcher: `send_to_kickoff` | `create_unit_now`)
- Migração SQL: enum module + tabela `pending_sales_recovery_log` + RLS.
- `src/pages/PendingSalesRecovery.tsx` (nova página)
- `src/services/pendingSalesRecoveryService.ts`
- Rota em `src/App.tsx` + item no `AppNavigation.tsx` (visível só admin).

## Checklist pós-implementação

- [ ] Venda multi-veículo expande corretamente.
- [ ] `wialon-search-plate` confirmado read-only (sem side effects no Wialon).
- [ ] Ambas ações bloqueadas em placa verde (UI + servidor).
- [ ] "Enviar para Kickoff" faz a placa aparecer no Kickoff.
- [ ] "Criar Unidade Agora" gera `frota_units_pending_imei` com status correto.
- [ ] Não-admin não acessa a rota nem vê o item no menu.

Vou te mandar o SQL da tabela nova via migration para você aprovar antes de rodar.
