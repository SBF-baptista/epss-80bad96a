
Diagnóstico verificado agora:

## O que confirmei no código

### 1. `fetch-segsale-products` está privada
No arquivo `supabase/config.toml`:
```toml
[functions.fetch-segsale-products]
verify_jwt = true
```

E dentro da própria função (`supabase/functions/fetch-segsale-products/index.ts`) ela ainda exige:
- header `Authorization: Bearer ...`
- validação real com `auth.getClaims()`

Ou seja: hoje ela **não está pública**.

### 2. O frontend atual não está disparando essa API automaticamente
Encontrei apenas este uso no frontend:
- `src/components/homologation/SegsaleFetchPanel.tsx`

E ele só chama a função no clique do botão:
```ts
const result = await fetchSegsaleProductsDirect(Number(idResumoVenda));
```

Além disso, o service (`src/services/segsaleService.ts`) também bloqueia chamadas sem sessão:
```ts
if (!token) {
  throw new Error("Usuário não autenticado para acessar o Segsale.");
}
```

Então, pelo código atual, **o browser não deveria estar chamando `fetch-segsale-products` sozinho**.

### 3. O problema real está no `segsale-webhook`
O `segsale-webhook` continua público:
```toml
[functions.segsale-webhook]
verify_jwt = false
```

E ele ainda chama internamente:
```ts
https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=...
```

Mas faz isso **sem enviar Authorization**:
```ts
const fetchResponse = await fetch(fetchUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## Causa raiz

Hoje o cenário mais provável é este:

```text
alguém/sistema externo chama segsale-webhook
→ o webhook aceita porque é público + usa x-webhook-key / Token
→ o webhook tenta chamar fetch-segsale-products
→ fetch-segsale-products rejeita por falta de Bearer token
→ isso continua aparecendo no Supabase como tentativa/chamada
```

Ou seja:

- a `fetch-segsale-products` **está privada**
- mas **ainda está sendo tentada**
- e quem mais provavelmente provoca isso é o `segsale-webhook`, não o frontend

## Por que no Supabase “ainda aparece rodando”?

Porque “privada” não significa “invisível” ou “URL inexistente”.

Significa:
- a URL ainda existe
- qualquer cliente ainda pode tentar bater nela
- mas sem JWT válido a função é barrada

Então no painel do Supabase você ainda pode ver:
- tentativas
- 401 / 403
- chamadas negadas

Isso **não prova que a função continua pública**. Prova que **alguém ainda está tentando chamá-la**.

## Evidências adicionais da verificação

### Não achei evidência de chamada atual vinda da preview
- snapshot de network do preview: sem requests para `fetch-segsale-products`
- busca no código: sem auto-fetch no Kickoff para essa função

### Há outro ruído no frontend, mas é separado
Os logs mostram recriação frequente de subscriptions realtime:
- `item_edit_requests`
- `incoming_vehicles`

Isso explica re-render/reconexão no app, mas **não explica chamadas da `fetch-segsale-products`**, porque não existe mais um hook automático ligando isso à API Segsale.

## Conclusão objetiva

O diagnóstico correto agora é:

1. `fetch-segsale-products` **não está pública**
2. o frontend atual **não está chamando ela em loop**
3. quem ainda pode estar gerando tentativas é o **`segsale-webhook` público**
4. o `segsale-webhook` está **quebrado na integração interna**, porque chama a função privada **sem autenticação**
5. por isso o Supabase pode continuar mostrando atividade/tentativas mesmo após privatizar a função

## Solução recomendada

### Correção principal
Ajustar `segsale-webhook` para chamar `fetch-segsale-products` com autenticação válida:
- usar `SUPABASE_SERVICE_ROLE_KEY` no header `Authorization`
- ou parar de chamar por HTTP e reutilizar a lógica internamente

### Correção de contenção
Se você quer parar imediatamente qualquer nova tentativa indireta:
- remover temporariamente a chamada do `segsale-webhook` para `fetch-segsale-products`
- ou fazer o webhook retornar antes dessa chamada até a integração ser corrigida

### Endurecimento extra
Para reduzir tráfego indevido:
- aceitar apenas `POST` no `segsale-webhook`
- manter rejeição imediata para `GET`
- logar origem/IP/user-agent do webhook para identificar quem está insistindo
- revisar se algum sistema externo ainda está retryando esse endpoint

## O que eu implementaria no próximo passo

1. Corrigir o `segsale-webhook` para autenticar corretamente a chamada interna
2. Opcionalmente bloquear `GET` de vez no webhook
3. Adicionar logs claros de origem no webhook para distinguir:
   - chamada legítima da Segsale
   - retry externo
   - bot/crawler
4. Revisar o churn de realtime no Kickoff separadamente, porque isso está gerando ruído no app, embora não seja a causa da API Segsale
