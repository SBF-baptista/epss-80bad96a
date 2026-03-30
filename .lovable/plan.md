

## Diagnostico: Zenatti (10945) — 10 veiculos na API, 7 no banco

### Causa raiz confirmada

A API do Segsale retorna **10 veiculos** corretamente (confirmado agora com chamada direta). O banco tem apenas **7**. As 3 placas faltantes: QZR9B34, QZL3D86, QZU1C46.

O `sync-segsale-auto` com a logica incremental (que compara API vs DB e re-envia) **deveria ter capturado isso**, mas provavelmente ainda nao executou desde o ultimo deploy, ou houve um erro silencioso na execucao.

Alem disso, o `segsale-webhook/index.ts` tem um **bug critico**: as variaveis `serviceRoleKey` e `supabaseUrl` sao declaradas com `const` **duas vezes** (linhas 157-159 e 180-181), o que causa erro de runtime e impede o webhook de funcionar corretamente.

### Plano de correcao

**1. Corrigir bug de declaracao duplicada no webhook** (`segsale-webhook/index.ts`)
- Remover as declaracoes duplicadas nas linhas 180-181 (ja existem nas linhas 157-158)
- Isso impede o webhook de processar novas vendas

**2. Re-deploy das 2 edge functions**
- `sync-segsale-auto` (garantir que o codigo com comparacao incremental esta ativo)
- `segsale-webhook` (com o fix do const duplicado)

**3. Acionar sync manual para venda 10945**
- Invocar `sync-segsale-auto` para forcar o processamento imediato
- Verificar nos logs que os 3 veiculos faltantes foram inseridos

### Resultado esperado
- Os 3 veiculos faltantes (QZR9B34, QZL3D86, QZU1C46) serao inseridos em `incoming_vehicles`
- O webhook volta a funcionar para futuras vendas
- O sync continua detectando discrepancias automaticamente

