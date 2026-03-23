

# Plano de Estabilização da Aplicação OPM

## Diagnóstico

O Supabase está retornando erros **544 (Connection timeout)**, impedindo login e operações normais. A causa raiz é **sobrecarga de conexões** ao banco de dados, provocada por:

- **15+ assinaturas realtime simultâneas** (cada uma consome uma conexão)
- **Polling agressivo a cada 30s** em 5 componentes de homologação e API Monitoring
- **Chamada externa ao ipify.org** a cada login/logout (bloqueia o fluxo de auth)
- **Fallbacks de logging** que disparam queries adicionais quando a primeira falha
- **Subscriptions duplicadas**: páginas usam tanto `useRealtimeSubscription` quanto `.subscribe()` manual

## Mudanças Propostas

### 1. Eliminar chamada externa no fluxo de login
**Arquivo**: `src/services/logService.ts`

A função `getClientIP()` faz fetch para `api.ipify.org` a cada login/logout. Se esse serviço demorar ou falhar, o login trava. Remover essa chamada e passar IP como `null` — essa informação não é essencial.

### 2. Tornar logging não-bloqueante
**Arquivo**: `src/hooks/useAuth.tsx`

As funções `logLogin` e `logLogout` são awaited no fluxo de auth. Se o banco estiver lento, o login inteiro trava. Mudar para fire-and-forget (sem await), garantindo que falhas de log nunca impeçam o login/logout.

### 3. Remover polling agressivo (refetchInterval)
**Arquivos**:
- `src/components/homologation/PendingSuppliesSection.tsx` — remover `refetchInterval: 30000`
- `src/components/homologation/PendingEquipmentSection.tsx` — remover `refetchInterval: 30000`
- `src/components/homologation/PendingAccessoriesSection.tsx` — remover `refetchInterval: 30000`
- `src/components/homologation/PendingItemsAlert.tsx` — remover `refetchInterval: 60000` (2 queries)
- `src/pages/ApiMonitoring.tsx` — remover `refetchInterval: 30000`

Essas páginas já têm realtime subscriptions ou podem ser atualizadas manualmente. O polling a cada 30s gera ~120 queries/hora extras desnecessárias.

### 4. Consolidar subscriptions duplicadas no Kickoff
**Arquivo**: `src/pages/Kickoff.tsx`

Atualmente tem 3 `useRealtimeSubscription` (accessories, incoming_vehicles, kickoff_history). Consolidar em um único canal que invalida as queries relevantes, reduzindo 3 conexões realtime para 1.

### 5. Reduzir subscriptions na ConfigurationDashboard
**Arquivo**: `src/components/configuration/ConfigurationDashboard.tsx`

Tem subscription manual em `kit_item_options` e `accessories` que chama `loadData()` diretamente (refetch completo). Adicionar debounce e consolidar em um canal.

### 6. Adicionar retry resiliente no cliente Supabase
**Arquivo**: `src/integrations/supabase/client.ts`

Configurar `db.schema` e adicionar `global.fetch` com retry automático para erros de rede, para que timeouts temporários não quebrem a aplicação inteira.

### 7. Proteger o fluxo de auth contra timeouts
**Arquivo**: `src/hooks/useAuth.tsx`

Adicionar timeout de 5s no `getSession()` inicial com fallback para estado "não autenticado" ao invés de loading infinito. Atualmente, se o Supabase não responder, o usuário fica preso na tela de carregamento para sempre.

## Detalhes Técnicos

```text
Antes (conexões simultâneas por sessão):
┌─────────────────────────────────┬────────┐
│ Fonte                           │ Conexões│
├─────────────────────────────────┼────────┤
│ Auth (getSession + onAuthState) │    2   │
│ useRealtimeSubscription (hook)  │   ~8   │
│ .subscribe() manuais           │   ~7   │
│ Polling (refetchInterval)       │   ~5   │
│ logService RPCs                 │   ~2   │
│ getClientIP (externo)           │   ~1   │
├─────────────────────────────────┼────────┤
│ TOTAL por sessão               │  ~25   │
└─────────────────────────────────┴────────┘

Depois (estimativa):
┌─────────────────────────────────┬────────┐
│ Fonte                           │ Conexões│
├─────────────────────────────────┼────────┤
│ Auth                            │    2   │
│ Realtime consolidado            │   ~5   │
│ Polling                         │    0   │
│ logService (fire-and-forget)    │   ~1   │
├─────────────────────────────────┼────────┤
│ TOTAL por sessão               │   ~8   │
└─────────────────────────────────┴────────┘
```

Redução de ~70% nas conexões simultâneas, aliviando diretamente o problema de timeout.

## Ordem de Execução

1. Fix login (items 1, 2, 7) — prioridade máxima
2. Remover polling (item 3)
3. Consolidar subscriptions (items 4, 5)
4. Resilência do cliente (item 6)

