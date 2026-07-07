
## Objetivo

Criar um sistema de alertas visuais (banner + popup) que indica veículos/clientes parados em cada etapa do processo, com regras específicas de tempo por etapa. Também disparar um teste manual para o Kafka com dados fictícios usando o mesmo formato do payload atual.

---

## Regras de negócio

| Etapa | Fonte de dados | Limite | Como calculamos "parado" |
|---|---|---|---|
| **Planejamento** | `customers` com `show_in_planning = true` que **não** têm `kit_schedules` ainda | > 2 dias | `now() - updated_at > 2 days` |
| **Em Produção (Logística)** | `kit_schedules` com `status = 'em_producao'` (ou equivalente atual do Kanban) | > 3 dias | `now() - último status change em kit_schedule_status_history > 3 days` (fallback: `updated_at`) |
| **Agendamento** | `kit_schedules` com `status = 'agendado'` cujo `scheduled_date` já passou há > 3 dias sem avançar | > 3 dias | `now() - scheduled_date > 3 days AND status ainda 'agendado'` |

Cada alerta mostra: nome do cliente, placa (se houver), etapa atual, e há quantos dias está parado.

---

## Arquitetura

### 1. Serviço central `src/services/stalledAlertsService.ts`
Exporta `getStalledAlerts()` que roda 3 queries em paralelo e retorna:
```ts
type StalledAlert = {
  id: string;
  type: 'planning' | 'production' | 'scheduling';
  customerName: string;
  companyName?: string;
  plate?: string;
  daysStalled: number;
  stageLabel: string;   // "Planejamento" | "Em Produção" | "Agendamento"
  since: string;        // ISO
  link: string;         // rota destino para "Ver detalhes"
};
```

### 2. Hook `src/hooks/useStalledAlerts.tsx`
- `useQuery(['stalled-alerts'], getStalledAlerts, { staleTime: 5 min, refetchOnWindowFocus: false })`
- Realtime opcional em `kit_schedules` e `customers` para invalidar.

### 3. Componentes UI (`src/components/alerts/`)
- **`StalledAlertsBadge.tsx`** — badge/pill vermelho com contador (para header ou topo da página).
- **`StalledAlertsBanner.tsx`** — banner destacado no topo da página (usado em Dashboard e Kickoff).
- **`StalledAlertsPopup.tsx`** — Dialog do shadcn que abre automaticamente ao entrar em Dashboard/Kickoff se houver alertas (usando `sessionStorage` para não abrir a cada navegação — 1x por sessão por página).
- **`StalledAlertsList.tsx`** — lista compartilhada dentro do popup e do banner (linha por alerta, com badge de dias e botão "Ver").

### 4. Integração nas páginas
- `src/pages/Dashboard.tsx` (Index) → renderiza `<StalledAlertsBanner />` + `<StalledAlertsPopup />`.
- `src/pages/Kickoff.tsx` → mesma coisa.

### 5. Teste manual do Kafka (agora, uma vez, pelo agente)
Chamar `supabase.functions.invoke('kafka-test-publish', ...)` — não, isso é do lado do usuário. Como o agente, vou invocar direto via `curl` na edge function `kafka-test-publish` usando o anon key, enviando um payload no formato v2-rico com:
- `saleSummaryId: 999999`
- `clientCode: "999999"`
- `customerGroups[0]`: cliente fictício "TESTE ALERTA LOVABLE" com 1 veículo (placa `TST0A00`, marca `FIAT`, modelo `STRADA`, ano 2024, chassis fictício)
- `accessories`: 2 itens fictícios ("BLOQUEIO 24V" e "SIRENE")
- `eventAt`: timestamp atual

O resultado (ok/erro) será reportado ao usuário no chat.

---

## Detalhes técnicos

- **Descoberta do status atual da coluna `kit_schedules.status`**: rodar `SELECT DISTINCT status FROM kit_schedules` no início da implementação para confirmar os literais reais ("em_producao" vs "in_production" etc.) antes de codar o serviço.
- **Nenhuma alteração de schema** é necessária — tudo é derivado por `updated_at`/`created_at` já existentes.
- **Zero impacto** em fluxos existentes: puramente leitura + UI.
- **Sem edge functions novas** — só uma invocação única (teste) da `kafka-test-publish` já existente.

---

## Entregáveis

1. `src/services/stalledAlertsService.ts`
2. `src/hooks/useStalledAlerts.tsx`
3. `src/components/alerts/StalledAlertsBanner.tsx`
4. `src/components/alerts/StalledAlertsPopup.tsx`
5. `src/components/alerts/StalledAlertsList.tsx`
6. Edições mínimas em `src/pages/Dashboard.tsx` e `src/pages/Kickoff.tsx`
7. Um disparo real de teste no Kafka via `kafka-test-publish` com resultado colado no chat.
