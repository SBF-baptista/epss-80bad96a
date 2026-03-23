

# Diagnóstico: `fetch-segsale-products` sendo chamada a cada segundo

## Causa Raiz Identificada

Existem **3 problemas simultâneos** causando o loop:

### 1. `segsale-webhook` aceita GET sem autenticação
Linhas 73-77 do webhook permitem chamadas GET sem nenhum header de autenticação. Qualquer bot, crawler, ou sistema externo que acesse a URL dispara o fluxo completo: `segsale-webhook` → `fetch-segsale-products` → `receive-vehicle`.

### 2. `fetch-segsale-products` chama `receive-vehicle` em fire-and-forget a cada invocação
Toda vez que `fetch-segsale-products` é chamada, ela automaticamente dispara `receive-vehicle` em background (linhas 301-324). Isso significa que **cada chamada gera 2 Edge Functions** + queries ao banco.

### 3. Banco sobrecarregado gera 522, isolates reiniciam em loop
Os logs de `receive-vehicle` mostram erros **522 Connection Timed Out** do Cloudflare. Com o banco indisponível, as funções falham e os isolates são reciclados constantemente, gerando os "shutdown" a cada segundo.

```text
Fluxo atual (a cada chamada):
Chamada externa (bot/Segsale?) → segsale-webhook (GET sem auth)
  → fetch-segsale-products (15s timeout Segsale API)
    → receive-vehicle (fire-and-forget, 15s timeout)
      → DB queries (522 timeout) → falha → isolate shutdown
```

## Plano de Correção

### 1. Exigir autenticação no `segsale-webhook` para GET
**Arquivo**: `supabase/functions/segsale-webhook/index.ts`

Remover o bloco que permite GET sem auth (linhas 73-77). Todas as chamadas devem ter `x-webhook-key` ou `Token` header.

### 2. Remover forward automático para `receive-vehicle` de `fetch-segsale-products`
**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Eliminar completamente o bloco fire-and-forget (linhas 299-325) que chama `receive-vehicle`. O `receive-vehicle` só deve ser chamado explicitamente pelo webhook ou manualmente, nunca como efeito colateral de uma consulta de dados.

### 3. Adicionar rate-limiting por cache no `fetch-segsale-products`
**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Antes de chamar a API Segsale, verificar o cache em `integration_state`. Se houver dados com menos de 5 minutos, retornar o cache diretamente sem fazer nenhuma chamada externa. Isso evita que chamadas repetidas gerem carga.

### 4. Redesplegar ambas as funções

Após as mudanças, redesplegar `segsale-webhook`, `fetch-segsale-products` e verificar que os shutdowns pararam.

## Resultado Esperado

```text
Antes: ~60 invocações/minuto (3 funções em cascata)
Depois: 0 invocações automáticas (só manual ou webhook autenticado)
```

- Chamadas sem auth serão rejeitadas com 401
- `fetch-segsale-products` não dispara mais `receive-vehicle`
- Cache de 5 minutos impede chamadas duplicadas mesmo legítimas
- Banco para de receber carga desnecessária

