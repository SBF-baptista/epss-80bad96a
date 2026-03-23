

# Diagnóstico: Edge Function `fetch-segsale-products` — Erro 504

## O que está acontecendo

Os logs confirmam que a **API Segsale respondeu com sucesso** em ~1 segundo:
```
16:53:43 - Fetching Segsale products for idResumoVenda: 10942
16:53:43 - Attempt 1/2 - Fetching products
16:53:44 - ✅ Received 1 sales from Segsale
```

Mas **não há mais logs depois disso**. A função morreu por timeout durante as etapas seguintes. O erro `context canceled` confirma isso.

## Causa Raiz: Cadeia de chamadas sequenciais

A Edge Function faz **3 chamadas externas em sequência**, cada uma com timeout alto:

```text
fetch-segsale-products (limite ~60s da plataforma)
│
├─ 1. Segsale API (25s timeout × 2 retries = até 50s)     ✅ OK (~1s)
│
├─ 2. Contract Items API (20s timeout × 2 retries = até 40s)  ⏱️ TRAVOU AQUI
│     URL: ws-sale.segsat.com/segsale/relatorios/itens-produtos?id=...
│
└─ 3. receive-vehicle (30s timeout × 2 retries = até 60s)  ❌ Nunca chegou
     URL: supabase.co/functions/v1/receive-vehicle
```

O pior caso teórico: 50s + 40s + 60s = **150 segundos**. O limite da plataforma é ~60s. Mesmo sem retries, se a API de contract items demorar >15s, a soma ultrapassa o limite.

## Problemas Específicos

### 1. Timeout da API `itens-produtos` (causa direta do 504)
A chamada para `ws-sale.segsat.com/segsale/relatorios/itens-produtos` está travando. Como o timeout é 20s × 2 tentativas = 40s, e a função já gastou ~1s na primeira chamada, atinge o limite da plataforma.

### 2. Chamada a `receive-vehicle` dentro da mesma Edge Function
Chamar outra Edge Function de dentro de uma Edge Function é problemático — ambas competem pelo mesmo pool de conexões do Supabase, e o timeout se acumula.

### 3. Retries multiplicam o tempo
Com `maxRetries = 2`, cada chamada que falha consome o dobro do tempo antes de desistir.

## Plano de Correção

### Opção A: Tornar processamento assíncrono (recomendado)

Separar a função em duas fases:
1. **`fetch-segsale-products`**: Busca da Segsale → salva no cache → retorna imediatamente ao usuário
2. **Processamento em background**: Contract items + receive-vehicle são chamados via um trigger ou job separado

Mudanças:
- Reduzir `fetch-segsale-products` para buscar APENAS da Segsale e cachear
- Remover a chamada a `receive-vehicle` de dentro da função
- O frontend ou um cron job separado aciona `receive-vehicle` depois

### Opção B: Reduzir timeouts e eliminar retries (rápido)

Mudanças no `fetch-segsale-products/index.ts`:
- Segsale API: timeout 15s, **sem retry** (já está funcionando rápido)
- Contract Items API: timeout 10s, **sem retry** — se falhar, pula
- receive-vehicle: timeout 15s, **sem retry** — se falhar, loga e retorna sucesso parcial
- Total máximo: 15 + 10 + 15 = 40s (dentro do limite de 60s)

### Opção C: Combinar A + B

Aplicar timeouts reduzidos (Opção B) agora, e migrar para processamento assíncrono (Opção A) depois.

## Recomendação

**Opção B** como fix imediato — reduz timeouts e remove retries para garantir que a função termine em <40s. É uma mudança de ~10 linhas no arquivo existente.

## Detalhes Técnicos da Correção (Opção B)

**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Mudanças:
1. Segsale API: `maxRetries: 1, timeoutMs: 15000` (sem retry, 15s)
2. Contract Items: `maxRetries: 1, timeoutMs: 10000` (sem retry, 10s) + wrapar em try/catch que não bloqueia
3. receive-vehicle: `maxRetries: 1, timeoutMs: 15000` (sem retry, 15s)
4. Se contract items falhar, continuar sem eles (já tem fallback para DB)
5. Se receive-vehicle falhar, retornar sucesso parcial ao invés de travar

