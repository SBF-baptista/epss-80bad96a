## Problema

A venda `11086` não foi importada porque a placa `MWT6C45` já existia na venda `11085`. A função `receive-vehicle` (`supabase/functions/receive-vehicle/processing.ts`, linhas ~112-130) tem uma trava de **unicidade global de placa**: se a placa já existe em qualquer outro `sale_summary_id`, descarta com status `already_exists`.

Essa regra impede importar a mesma placa para vendas diferentes (cenário legítimo: nova venda de acessórios/serviços para um veículo já cadastrado).

## Solução

Trocar a chave de deduplicação para `(sale_summary_id, plate)` — ou seja, só considerar duplicado se for **a mesma placa dentro da mesma venda**. Cada `sale_summary_id` passa a gerar seu próprio `incoming_vehicle`, mesmo que a placa se repita em outras vendas.

### 1. Edge function `receive-vehicle/processing.ts`
- Remover o bloco "Deduplication check 1: Cross-sale plate check" (linhas ~112-130) que bloqueia placas já existentes em outras vendas.
- Manter / ajustar a "Deduplication check 2" para considerar `sale_summary_id + plate` (quando há placa) e `sale_summary_id + brand + vehicle` (quando não há). Isso evita duplicar dentro da mesma venda, mas libera entre vendas diferentes.
- Ajustar o tratamento de `unique_violation` no insert para considerar a chave composta.

### 2. Reimportar a venda 11086
- Após o deploy, chamar manualmente `fetch-segsale-products?idResumoVenda=11086&forceRefresh=true` (ou usar o painel SegsaleFetchPanel) para puxar a venda novamente.

### 3. Memória
- Atualizar `mem://index.md`: remover a Core rule "Enforce global plate uniqueness for vehicles" e adicionar nota explicando que a unicidade agora é por `(sale_summary_id, plate)`.

## Impacto

- Mesma placa pode aparecer em mais de um card no Kickoff, **um por venda**, cada qual com seus próprios acessórios/módulos vindos do Segsale.
- Nenhuma alteração em tabelas / RLS é necessária (não existe constraint UNIQUE na coluna `plate` no banco — a trava é apenas no código).
- Risco: vendas duplicadas reais (mesma venda enviada 2x) ainda são bloqueadas pela `segsale-webhook` (dedup por `sale_summary_id`) e pela checagem dentro da mesma venda.

## Arquivos alterados

- `supabase/functions/receive-vehicle/processing.ts`
- `mem://index.md`