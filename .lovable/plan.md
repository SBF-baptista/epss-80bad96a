

## Correcao: Impedir importacao de vendas antigas no sync-segsale-auto

### Causa raiz
A logica de retry adicionada busca IDs de `integration_state` com `updated_at` recente, mas IDs antigos (como #302) podem ter sido atualizados recentemente. Como esses IDs antigos nao existem em `incoming_vehicles`, o sistema os trata como "nunca importados" e tenta importa-los, trazendo vendas antigas.

### Solucao

**Arquivo: `supabase/functions/sync-segsale-auto/index.ts`**

1. **Adicionar filtro de ID minimo** — Apenas considerar retry para `sale_summary_id >= 10942` (ou dinamicamente: pegar o menor ID pendente ja existente em `incoming_vehicles` e usar como piso)
2. **Trocar `updated_at` por `created_at`** no filtro de `integration_state` — Assim so pega registros que foram CRIADOS nos ultimos 7 dias, nao registros antigos que foram meramente atualizados
3. **Remover vendas antigas que foram importadas indevidamente** — Limpar os registros com `sale_summary_id < 10942` que foram importados erroneamente

### Detalhes tecnicos

```typescript
// ANTES (problema):
.gt('updated_at', sevenDaysAgo)

// DEPOIS (corrigido):
.gt('created_at', sevenDaysAgo)

// E adicionar filtro de ID minimo:
const MIN_SALE_SUMMARY_ID = 10942
const retryIds = candidateRetryIds
  .filter(id => !existingSet.has(id))
  .filter(id => id >= MIN_SALE_SUMMARY_ID) // Nunca re-importar vendas antigas
```

### Limpeza
- Executar query para deletar registros em `incoming_vehicles` com `sale_summary_id < 10942` que foram importados indevidamente nesta ultima sincronizacao

### Arquivos modificados
- `supabase/functions/sync-segsale-auto/index.ts` — adicionar filtro de ID minimo + trocar updated_at por created_at

