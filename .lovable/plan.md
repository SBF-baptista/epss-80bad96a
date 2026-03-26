

## Diagnostico e Correcao: Venda 10971 incompleta + Sincronizacao automatica de veiculos faltantes

### Problema identificado

**A API do Segsale retornou apenas 1 veiculo para a venda 10971** (TOYOTA HILUX SKV7A49), mas o usuario confirma que sao 3 veiculos. Isso acontece porque:

1. **O Segsale adiciona veiculos progressivamente** — quando o webhook/sync busca a venda pela primeira vez, nem todos os veiculos estao cadastrados ainda. A API retorna somente o que existe naquele momento.

2. **O sistema nunca re-verifica vendas ja importadas** — uma vez que a venda 10971 tem 1 registro em `incoming_vehicles`, o `sync-segsale-auto` re-busca a API, mas o `receive-vehicle` ve que o veiculo ja existe e pula. Os veiculos novos da API seriam adicionados, MAS a cache de 5 minutos do `fetch-segsale-products` retorna dados antigos.

3. **A cache impede atualizacao** — o `sync-segsale-auto` chama `fetch-segsale-products` que retorna dados da cache de 5 min. A cache foi gravada quando so havia 1 veiculo. Mesmo apos o TTL expirar, a API pode ter sido chamada manualmente e re-cacheou o resultado antigo.

4. **O webhook tambem nao passa `plate`** — `segsale-webhook/transformSalesToVehicleGroups` ainda nao inclui o campo `plate` (mesmo bug que foi corrigido no sync-segsale-auto).

### Solucao

**1. Bypass de cache no sync automatico** (`fetch-segsale-products/index.ts`)
- Adicionar parametro `forceRefresh=true` que ignora a cache e vai direto na API do Segsale
- O `sync-segsale-auto` usara esse parametro para sempre pegar dados frescos

**2. Comparar contagem de veiculos** (`sync-segsale-auto/index.ts`)
- Apos buscar dados frescos da API, comparar a quantidade de veiculos retornados pela API com a quantidade existente em `incoming_vehicles`
- Se a API retorna mais veiculos do que existem no DB, enviar todos para `receive-vehicle` (a deduplicacao ja existente vai pular os que ja existem e adicionar os novos)
- Logar a diferenca para monitoramento

**3. Incluir plate no webhook** (`segsale-webhook/index.ts`)
- Adicionar `plate: v.plate || null` na funcao `transformSalesToVehicleGroups` (mesmo fix ja aplicado no sync)

**4. Atualizar cache apos re-fetch** 
- Quando o sync busca dados frescos e encontra mais veiculos, a cache e atualizada automaticamente (ja acontece no fluxo atual do fetch-segsale-products)

### Arquivos modificados

1. **`supabase/functions/fetch-segsale-products/index.ts`** — adicionar suporte a `forceRefresh=true` query param
2. **`supabase/functions/sync-segsale-auto/index.ts`** — usar `forceRefresh=true` ao chamar fetch; comparar contagem de veiculos API vs DB; logar diferencas
3. **`supabase/functions/segsale-webhook/index.ts`** — adicionar `plate: v.plate || null` na transformacao de veiculos

### Logica chave

```text
sync-segsale-auto (a cada 5h):
  Para cada sale_summary_id pendente:
    1. Buscar dados FRESCOS da API (forceRefresh=true)
    2. Contar veiculos retornados pela API
    3. Contar veiculos existentes em incoming_vehicles
    4. Se API > DB → enviar para receive-vehicle (dedup cuida do resto)
    5. Se API == DB → skip (ja esta completo)
    6. Se API == 0 → registrar como retry para proxima execucao
```

### Resultado esperado

- Venda 10971: na proxima execucao do sync (ou apos deploy manual), os 2 veiculos faltantes serao detectados e adicionados automaticamente
- Vendas futuras: qualquer veiculo adicionado ao Segsale apos a importacao inicial sera capturado automaticamente na proxima execucao do cron (5h)
- O usuario nao precisara mais reportar veiculos faltantes

