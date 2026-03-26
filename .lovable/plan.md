

## Diagnostico: Venda 10945 nao aparece no Kickoff

### Causa raiz
A venda 10945 foi consultada na API do Segsale em 2026-03-24 09:43:43, mas a API retornou `sales: []` (lista vazia). Como nenhum registro foi inserido em `incoming_vehicles`, o `sync-segsale-auto` nunca mais re-tenta esse ID porque ele so processa IDs que ja existem na tabela com `processed = false`.

O mesmo ocorreu com as vendas 10946 e 10947 -- todas retornaram vazio.

### Solucao

**1. Correcao imediata: Re-tentar vendas com resultado vazio**

Modificar o `sync-segsale-auto` para, alem dos IDs pendentes em `incoming_vehicles`, tambem re-tentar IDs registrados em `integration_state` cujo `metadata.sales` esta vazio e que foram consultados ha menos de 7 dias.

No `sync-segsale-auto/index.ts`:
- Apos buscar IDs pendentes de `incoming_vehicles`, tambem buscar da `integration_state` registros onde `integration_name LIKE 'segsale_products_%'` com `metadata->sales = '[]'` 
- Combinar ambas as listas de IDs para processar
- Quando a re-tentativa retornar dados, atualizar o `integration_state` com os novos metadados

**2. Fetch manual para vendas 10945, 10946, 10947**

Executar manualmente a funcao `fetch-segsale-products` para esses IDs para trazer os dados agora que provavelmente ja estao disponiveis no Segsale.

### Arquivos modificados
- `supabase/functions/sync-segsale-auto/index.ts` -- adicionar logica de retry para vendas com resultado vazio

### Detalhes tecnicos

```typescript
// Apos buscar uniqueIds de incoming_vehicles...

// Tambem buscar IDs que retornaram vazio e precisam retry
const { data: emptyResults } = await supabase
  .from('integration_state')
  .select('integration_name, last_poll_at')
  .like('integration_name', 'segsale_products_%')
  .eq('status', 'ok')
  .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

const retryIds = (emptyResults || [])
  .filter(r => {
    const meta = r.metadata as any;
    return !meta?.sales || (Array.isArray(meta.sales) && meta.sales.length === 0);
  })
  .map(r => {
    const match = r.integration_name.match(/segsale_products_(\d+)/);
    return match ? parseInt(match[1]) : null;
  })
  .filter(Boolean);

// Combinar com uniqueIds, sem duplicatas
const allIds = [...new Set([...uniqueIds, ...retryIds])];
```

Apos a correcao, as vendas 10945-10947 serao re-tentadas automaticamente no proximo ciclo do cron (a cada 5h), ou podemos forcar a execucao manual.

