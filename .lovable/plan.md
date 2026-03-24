

# Plano: Serviço automático `sync-segsale-auto` com pg_cron a cada 5 horas

## Arquitetura

```text
pg_cron (a cada 5h)
  → POST sync-segsale-auto
    → SELECT DISTINCT sale_summary_id FROM incoming_vehicles WHERE processed = false
    → Para cada ID (max 10): GET fetch-segsale-products?idResumoVenda=X
    → fetch-segsale-products busca na API Segsale e retorna dados
    → sync-segsale-auto chama receive-vehicle para armazenar novos veículos
```

## Mudanças

### 1. Criar Edge Function `sync-segsale-auto`
**Arquivo**: `supabase/functions/sync-segsale-auto/index.ts`

- Consulta `incoming_vehicles` para listar `sale_summary_id` distintos onde `processed = false`
- Para cada ID (máximo 10 por execução):
  - Chama `fetch-segsale-products` internamente via HTTP com `SUPABASE_SERVICE_ROLE_KEY`
  - Se houver dados novos, chama `receive-vehicle` com `VEHICLE_API_KEY`
  - Intervalo de 2 segundos entre chamadas para não sobrecarregar a API Segsale
- Loga resultado de cada ciclo

### 2. Registrar no `supabase/config.toml`
Adicionar:
```toml
[functions.sync-segsale-auto]
verify_jwt = false
```

### 3. Configurar pg_cron via SQL (insert tool)
Habilitar extensões `pg_cron` e `pg_net` (se ainda não habilitadas), e criar o cron job:
```sql
SELECT cron.schedule(
  'sync-segsale-every-5h',
  '0 */5 * * *',
  $$ SELECT net.http_post(
    url:='https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/sync-segsale-auto',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{"source":"pg_cron"}'::jsonb
  ) as request_id; $$
);
```

### 4. Nenhuma mudança no frontend
O `SegsaleFetchPanel` continua funcionando para buscas manuais. O sync automático roda em background.

## Resultado

```text
Antes:  Vendas só aparecem via webhook externo ou busca manual
Depois: A cada 5h, o sistema busca automaticamente vendas pendentes
        Máximo 10 sale_summary_ids por ciclo (~50/dia no pior caso)
        Novos veículos são inseridos automaticamente via receive-vehicle
```

