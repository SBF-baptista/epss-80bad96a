## Consumir a lista de veículos suportados pela Ruptela

### O que descobri sobre a fonte

A página `vehicles.ruptela.com/vehicles` é uma aplicação **Laravel + Livewire** que renderiza a tabela direto no HTML — **não existe API JSON pública** da Ruptela. Mas a boa notícia é que a tabela vem completamente estruturada no próprio HTML, com 12 colunas fixas (marca, modelo, tipo, geração, ano de início/fim, regiões, tags, dispositivos compatíveis, método de conexão, data de criação) e paginação de 50 linhas por página via parâmetros de query.

Isso significa que dá pra "fingir ser uma API" parseando o HTML server-side. Faremos isso dentro de uma Edge Function, com cache, para o frontend nunca encostar diretamente no site da Ruptela.

### Como vai funcionar

```text
Frontend (página de teste)
     │
     │  supabase.functions.invoke('check-ruptela-vehicle', { brand, model, year })
     ▼
Edge Function check-ruptela-vehicle  ◄──── cache em ruptela_vehicles_cache (24h)
     │
     │  fetch HTML da Ruptela só se cache vencer
     ▼
vehicles.ruptela.com/vehicles?brand=...   →   parser → JSON normalizado
```

A função aceita 3 modos:
1. **`?brand=X&model=Y&year=Z`** → retorna se o veículo é suportado, em qual geração, com quais dispositivos Ruptela e método de conexão (OBD/CANBus). Ideal para validar pontualmente um veículo do Kickoff.
2. **`?brand=X`** → lista todos os modelos suportados daquela marca.
3. **`?brands=true`** → retorna a lista completa de marcas suportadas (útil para popular um dropdown depois).

### Entregáveis

**1. Tabela de cache** `ruptela_vehicles_cache`
   - `cache_key` (texto, único — ex: `brand:mercedes-benz`, `all_brands`)
   - `payload` (jsonb com a lista parseada)
   - `fetched_at` (timestamptz)
   - RLS: leitura pública para usuários autenticados, escrita só via service role (a Edge Function escreve)
   - TTL configurável na função (padrão 24h)

**2. Edge Function `check-ruptela-vehicle`** (`verify_jwt = true` — só usuário logado consulta)
   - Lê cache; se válido (< 24h), responde direto
   - Se vencido, faz `fetch` no HTML da Ruptela paginando até cobrir a marca pedida (a paginação retorna 50 linhas/página, então marcas grandes como Mercedes-Benz vão precisar de 2-3 requisições)
   - Parser extrai as 12 colunas de cada `<tr>` e monta um array de objetos `{ brand, model, type, generation, year_from, year_to, regions[], tags[], devices[], connection_methods[], created_at }`
   - Para o modo `brand+model+year`: filtra a lista pela marca normalizada (case-insensitive, sem acento), depois match difuso de modelo (mesma lógica `UPPER(TRIM(SPLIT_PART))` já usada nas suas regras de automação) e valida se o ano cai entre `year_from` e `year_to` (ou `year_to = null` significa "até hoje")
   - Resposta padronizada: `{ supported: true/false, matched_entry?, suggested_devices?, connection_method?, candidates: [...] }`
   - CORS configurado, validação com Zod, erros 4xx claros

**3. Service e hook React** (`src/services/ruptelaVehicleService.ts`, `src/hooks/useRuptelaCheck.ts`)
   - Wrapper tipado em torno de `supabase.functions.invoke`
   - Hook React Query com cache local de 1h (camada extra além do cache da função)

**4. Página de teste** `src/pages/RuptelaVehicleCheck.tsx`
   - Formulário com Marca / Modelo / Ano (espelhando o `VehicleVerificationTest.tsx` existente para manter o padrão visual)
   - Mostra: badge "Suportado/Não suportado", geração compatível, lista de dispositivos Ruptela recomendados, método de conexão, e — se não houver match exato — sugestões de modelos parecidos da mesma marca
   - Adicionada ao menu apenas para perfis com acesso ao módulo `homologation` (segue o padrão `has_module_access`)

### Detalhes técnicos

- **Parser:** regex sobre `<table>` → `<tr>` → `<td>` é suficiente porque o markup é estável e gerado por Livewire (não muda com JS no cliente). Como fallback, se a quantidade de colunas mudar, a função loga e retorna 502 em vez de devolver dados corrompidos.
- **Normalização:** `brand` e `model` passam por NFD + remoção de diacríticos + lowercase, mesmo padrão já estabelecido em `mem://features/accessory-detection-normalization-logic`.
- **Rate limiting:** como a Ruptela não publica limites, vamos respeitar com cache de 24h por marca + `User-Agent` identificável + no máximo 1 fetch a cada 5s por marca (controle simples in-function).
- **Resiliência:** se o fetch falhar, retorna o cache antigo com flag `stale: true` (mesma estratégia de `mem://performance/external-api-caching-policy`).
- **Sem secrets:** a Ruptela é pública, não precisa de API key.

### Fora do escopo (deixar para depois, se você quiser)

- Cruzar automaticamente cada veículo do Kickoff/Homologação com a Ruptela e mostrar selo nos cards
- Importar a base inteira para uma tabela própria
- Endpoint público (atualmente exige login)
- Atualização agendada via pg_cron

Estes podem virar próximos passos depois que validarmos que o parser está estável com a Ruptela.