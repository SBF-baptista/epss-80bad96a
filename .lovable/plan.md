

# Plano: Execução Automática de `fetch-segsale-products` a cada 5 horas

## Situação Atual

A função `fetch-segsale-products` requer um `idResumoVenda` específico como parâmetro. Não existe um mecanismo de polling automático — as chamadas dependem de ação manual (SegsaleFetchPanel) ou do webhook do Segsale. O loop de 1/segundo que existia antes foi causado por bots/crawlers e foi corrigido.

## Abordagem

Criar uma **Edge Function cron** (`sync-segsale-auto`) que roda a cada 5 horas via `pg_cron`. Ela busca os `sale_summary_id` ativos na tabela `incoming_vehicles` (veículos que ainda não foram processados completamente) e chama `fetch-segsale-products` para cada um, com intervalo entre chamadas para não sobrecarregar.

### 1. Criar Edge Function `sync-segsale-auto`
**Arquivo**: `supabase/functions/sync-segsale-auto/index.ts`

- Consulta `incoming_vehicles` para listar `sale_summary_id` distintos com `homologation_status != 'homologado'` (pendentes de processamento)
- Para cada `sale_summary_id`, chama `fetch-segsale-products` internamente (reutilizando a lógica de fetch)
- Limite de no máximo 10 IDs por execução para evitar timeout
- Intervalo de 2s entre chamadas para não sobrecarregar a API Segsale
- Log de cada execução para auditoria

### 2. Aumentar o TTL do cache para 5 horas
**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Mudar `CACHE_TTL_MS` de 5 minutos para 5 horas (18.000.000ms). Como a atualização será automática a cada 5h, o cache curto de 5 minutos não faz mais sentido — chamadas intermediárias retornarão o cache sem bater na API.

### 3. Configurar `pg_cron` para rodar a cada 5 horas
Executar SQL via migration tool para criar o cron job:

```sql
SELECT cron.schedule(
  'sync-segsale-every-5h',
  '0 */5 * * *',  -- a cada 5 horas
  $$
  SELECT net.http_post(
    url:='https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/sync-segsale-auto',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);
```

### 4. Manter chamada condicional no KickoffDetailsModal
O `KickoffDetailsModal` continuará chamando `fetch-segsale-products` apenas quando `existingAccessories.length === 0` (backfill on-demand). Isso é saudável — acontece no máximo 1 vez por venda.

## Resultado Esperado

```text
Antes:  Chamadas dependiam de ação manual ou webhook externo
Depois: Polling automático a cada 5h dos sale_summary_ids pendentes
        Cache de 5h impede chamadas duplicadas
        Máximo ~10 chamadas por ciclo (50/dia no pior caso)
```

