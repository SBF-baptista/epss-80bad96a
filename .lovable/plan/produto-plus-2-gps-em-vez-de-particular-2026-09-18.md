# Produto "Plus 2 GPS" em vez de "Particular"

## Objetivo
O Segsale envia o produto `PLUS II - GPS` e hoje o sistema renomeia para "Particular" na importação. A partir desta mudança, esse produto passa a existir no sistema como "PLUS II - GPS", tanto nas vendas novas quanto nas que já estão na base.

## Mudanças

### 1. Banco de dados (migração)
- Adicionar o novo valor `plus_2_gps` à lista de tipos de produto permitidos (`vehicle_usage_type`).
- Atualizar todos os registros existentes com produto `particular` para `plus_2_gps` (tabela `incoming_vehicles` e demais tabelas que usam esse tipo, ex.: `accessories.usage_type` se aplicável). Decisão do usuário: todos os que estão "Particular" viram "Plus 2 GPS".

### 2. Importação do Segsale (edge functions)
- `sync-segsale-auto`: alterar o mapeamento `'PLUS II - GPS': 'particular'` → `'plus_2_gps'`.
- `segsale-webhook`: mesma alteração no mapeamento.
- `receive-vehicle/validation.ts`: incluir `plus_2_gps` na lista de tipos aceitos.
- O valor `particular` continua existindo (caso o Segsale envie "PARTICULAR" de fato), mas nada muda para ele.

### 3. Telas (frontend)
- `Kickoff.tsx`: rótulo do produto `plus_2_gps` exibido como **"PLUS II - GPS"** (decisão do usuário) nos cards e no filtro de produtos.
- `kitMatchingService.ts`: incluir `plus_2_gps` na lista de tipos de Rastreamento/Copiloto (mesmo comportamento de kits FMC130 que "particular" tem hoje).
- Verificar demais pontos que listam os tipos de produto (ex.: `AutoOrderTestPanel.tsx`) e incluir a nova opção onde fizer sentido.

## Verificação
- Rodar o sync e confirmar que uma venda com "PLUS II - GPS" entra como "PLUS II - GPS" no Kickoff.
- Conferir na base que os antigos "particular" agora aparecem como "plus_2_gps".
- Conferir que a sugestão de kits para esses veículos continua oferecendo FMC130.

## Observação
Após a conversão, não haverá mais nenhum veículo "Particular" na base até que o Segsale envie uma venda com o texto "PARTICULAR" — nesse caso ela entrará como Particular normalmente.
