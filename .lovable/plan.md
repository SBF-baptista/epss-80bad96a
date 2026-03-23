

# Diagnóstico Completo: `fetch-segsale-products`

## Bug Crítico #1: Variáveis Indefinidas (causa de erro 500)

Na **linha 296** do `fetch-segsale-products/index.ts`:
```typescript
processing: { forwarded: !!(apiKey && vehicleGroups.length > 0), async: true },
```

As variáveis `apiKey` e `vehicleGroups` **não existem** no código. Foram removidas em edições anteriores quando eliminamos o forward para `receive-vehicle`, mas a referência na resposta final permaneceu. Isso causa um **ReferenceError** que mata a função após todo o processamento ter sido feito com sucesso — ou seja, a API Segsale responde, o cache é escrito, os contract items são buscados, mas o retorno final explode com erro 500.

## Bug #2: `SegsaleTest.tsx` executa automaticamente no mount

A página `/segsale-test` tem um `useEffect` sem condição que chama `fetch-segsale-products?idResumoVenda=107` toda vez que é montada. Se essa rota for carregada por qualquer motivo (prefetch, crawler, navegação acidental), gera chamadas desnecessárias.

## Bug #3: Chamadas sem autenticação

Todos os pontos que chamam `fetch-segsale-products` no frontend (SegsaleFetchPanel, SegsaleTest, KickoffDetailsModal, displaySegsaleData) fazem `fetch()` direto sem nenhum header de autenticação. A Edge Function não exige auth, ficando aberta para qualquer chamada externa.

## Arquivos redundantes (geram carga desnecessária)

| Arquivo | Problema |
|---------|----------|
| `src/utils/displaySegsaleData.ts` | Hardcoded para ID 107, nunca usado em produção |
| `src/utils/testSegsaleAPI.ts` | Utilitário de debug, não deveria existir em produção |
| `src/pages/SegsaleTest.tsx` | Página de teste com auto-fetch no mount |
| Rota `/segsale-test` em `App.tsx` | Expõe a página de teste |

## Plano de Correção

### 1. Corrigir o ReferenceError na Edge Function (URGENTE)
**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Substituir a linha 296:
```typescript
// DE:
processing: { forwarded: !!(apiKey && vehicleGroups.length > 0), async: true },
// PARA:
processing: { forwarded: false, message: 'Processing handled separately' },
```

Redesplegar imediatamente.

### 2. Remover arquivos de teste/debug
- Deletar `src/utils/displaySegsaleData.ts`
- Deletar `src/utils/testSegsaleAPI.ts`
- Deletar `src/pages/SegsaleTest.tsx`
- Remover rota `/segsale-test` e import lazy de `App.tsx`

### 3. Proteger o endpoint com autenticação básica
**Arquivo**: `supabase/functions/fetch-segsale-products/index.ts`

Adicionar verificação de header `Authorization` (apikey do Supabase) ou `Token` para evitar chamadas de fontes externas não autorizadas. As chamadas do frontend passarão a usar `supabase.functions.invoke()` que inclui automaticamente o header correto.

### 4. Atualizar chamadas no frontend para usar `supabase.functions.invoke`
**Arquivos**:
- `src/services/segsaleService.ts` — trocar `fetch()` direto por `supabase.functions.invoke()`
- `src/components/homologation/SegsaleFetchPanel.tsx` — mesma mudança

Isso garante que todas as chamadas passem pelo cliente autenticado do Supabase.

## Resultado Esperado

- Edge Function para de retornar erro 500 por variáveis indefinidas
- Chamadas de teste/debug eliminadas
- Endpoint protegido contra acesso externo não autorizado
- Todas as chamadas do frontend passam pelo cliente Supabase autenticado

