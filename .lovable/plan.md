

# Plano: Manter ambas as funções públicas sem loop

## Por que o loop acontecia

O loop **não era causado por uma chamar a outra em círculo**. Era causado por **bots/crawlers externos** que descobriram a URL pública do `fetch-segsale-products` e ficavam acessando repetidamente. Cada acesso gerava uma chamada real à API Segsale + queries ao banco.

O cache de 5 minutos já existe e protege contra chamadas duplicadas (retorna cache sem tocar na API externa). Porém, **mesmo retornando cache**, cada chamada ainda consome uma invocação de Edge Function e uma query ao banco para ler o cache — com bots batendo a cada segundo, isso gera ~86.400 invocações/dia.

## Solução: Rate-limiting por IP + proteção anti-bot na `fetch-segsale-products`

Adicionar uma camada de proteção **dentro da função** que:

1. **Rejeita chamadas sem `idResumoVenda` válido** (bots geralmente acessam a URL base sem parâmetros) — já existe
2. **Rejeita métodos que não sejam GET/POST** — já existe via CORS
3. **Adiciona um rate-limit em memória por IP** — se o mesmo IP chamar mais de 5 vezes em 1 minuto, retorna 429 (Too Many Requests) sem fazer nenhuma query ao banco
4. **Adiciona header de proteção anti-crawler** — retorna `X-Robots-Tag: noindex` para que crawlers não indexem a URL

### Mudanças

**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

- Adicionar um `Map<string, { count: number, resetAt: number }>` no escopo do módulo para rate-limiting em memória
- Antes de qualquer lógica, verificar se o IP excedeu 5 chamadas/minuto → retornar 429
- Adicionar header `X-Robots-Tag: noindex` em todas as respostas
- Manter o cache de 5 minutos como segunda camada

**Arquivo**: `supabase/config.toml`

- Mudar `fetch-segsale-products` para `verify_jwt = false`

**Arquivo**: `supabase/functions/segsale-webhook/index.ts`

- Nenhuma mudança necessária (já é público e já tem autenticação própria via `x-webhook-key`/`Token`)

**Arquivo**: `src/services/segsaleService.ts`

- Nenhuma mudança necessária (continuará enviando auth headers por segurança, mas não será obrigatório)

## Resultado

```text
Cenário                    │ Antes (público)     │ Depois (público + rate-limit)
───────────────────────────┼─────────────────────┼──────────────────────────────
Bot batendo 1x/segundo     │ 86.400 inv/dia      │ 5 inv/min → 429 bloqueado
Usuário legítimo           │ Funciona             │ Funciona (<<5 req/min)
Webhook Segsale            │ Funciona             │ Funciona
Cache hit                  │ Retorna cache        │ Retorna cache (se passar rate-limit)
```

Ambas as funções ficam públicas, o webhook continua com sua autenticação própria, e o rate-limit impede que bots gerem carga excessiva.

