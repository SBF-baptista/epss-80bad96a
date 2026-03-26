

## Diagnostico e Correcao: Venda 10945 incompleta + Vendas indevidas 10944/10946/10947

### Problema 1: Venda 10945 tem 4 registros em vez de 7

A API do Segsale retornou 7 veiculos com placas individuais:
- 3x MARCOPOLO VOLARE V8L ON (placas QZG4H29, TAC8F87, TSG5A15)
- 1x MARCOPOLO VOLARE V8L ON (placa QZC3H86) — mesmo modelo, 4o veiculo
- 1x MARCOPOLO VOLARE W8 ON (placa PHU4E51)
- 1x VOLKSWAGEM MASCA GRANMICRO E O (placa QZZ8A97)
- 1x MERCEDES BENZ MASCA GRANMICRO (placa QZJ3J56)

**Causa**: Dois bugs em cascata:

1. `transformSalesToVehicleGroups` (sync-segsale-auto) NAO passa o campo `plate` para o `receive-vehicle`. Linha 240-246 so mapeia `vehicle`, `brand`, `year`, `quantity` — ignora `plate`.

2. `receive-vehicle/processing.ts` (linha 112-134) deduplica por `sale_summary_id + brand + vehicle`. Como existem 4 veiculos MARCOPOLO + VOLARE V8L ON, so o primeiro e inserido — os outros 3 sao descartados como "duplicados". O resultado sao apenas 4 registros unicos por combinacao marca+modelo.

### Problema 2: Vendas 10944, 10946, 10947 nao deveriam ter sido importadas

Essas 3 vendas tem `usage_type: PLUS II - GPS` no Segsale. Na correcao anterior, eu mapeei `PLUS II - GPS` → `telemetria_gps`, o que fez elas serem importadas automaticamente. O usuario indica que esse tipo de produto NAO e telemetria GPS e nao deveria entrar no sistema.

### Solucao

**1. Incluir `plate` na transformacao** (`sync-segsale-auto/index.ts`)
- Na funcao `transformSalesToVehicleGroups`, adicionar `plate: v.plate || null` ao objeto do veiculo

**2. Corrigir deduplicacao para considerar placa** (`receive-vehicle/processing.ts`)
- Quando o veiculo tem `plate`, usar `sale_summary_id + brand + vehicle + plate` como chave de deduplicacao
- Quando NAO tem plate, manter a logica atual `sale_summary_id + brand + vehicle`

**3. Remover mapeamento de PLUS II** (`sync-segsale-auto/index.ts` e `segsale-webhook/index.ts`)
- Remover as linhas que mapeiam `PLUS II - GPS`, `PLUS II - CAN`, `PLUS I - GPS` para tipos existentes
- Esses tipos vao cair no fallback `usageType.toLowerCase().replace(/\s+/g, '_')` → `plus_ii_-_gps` que NAO existe no enum, causando erro na insercao e impedindo a importacao

**4. Limpeza dos dados errados**
- Deletar os registros de `incoming_vehicles` com `sale_summary_id` IN (10944, 10946, 10947) que foram importados indevidamente
- Deletar o registro da venda 10945 (4 registros incompletos) para que o re-sync traga os 7 veiculos com placas

### Arquivos modificados
- `supabase/functions/sync-segsale-auto/index.ts` — incluir plate na transformacao + remover mapeamento PLUS II
- `supabase/functions/segsale-webhook/index.ts` — remover mapeamento PLUS II
- `supabase/functions/receive-vehicle/processing.ts` — dedup considerar plate
- Migration SQL — limpar registros errados

### Detalhes tecnicos

```typescript
// sync-segsale-auto: transformSalesToVehicleGroups — adicionar plate
const vehicle: any = {
  vehicle: v.vehicle || v.modelo || '',
  brand: v.brand || v.marca || '',
  year: v.year || v.ano || null,
  plate: v.plate || null,        // ← NOVO
  quantity: v.quantity || 1,
}

// receive-vehicle/processing.ts — dedup com plate
let dedupQuery = supabase
  .from('incoming_vehicles')
  .select('id, processing_notes')
  .eq('sale_summary_id', group.sale_summary_id)
  .eq('brand', brand.trim())
  .eq('vehicle', vehicle.trim());

if (vehicleData.plate) {
  dedupQuery = dedupQuery.eq('plate', vehicleData.plate);
}

// Remover do mapUsageType em ambos os arquivos:
// 'PLUS II - GPS': 'telemetria_gps',   ← REMOVER
// 'PLUS II - CAN': 'telemetria_can',   ← REMOVER
// 'PLUS I - GPS': 'telemetria_gps',    ← REMOVER
```

Apos a correcao e limpeza, o `sync-segsale-auto` vai:
- Re-importar a venda 10945 com os 7 veiculos e suas placas
- Rejeitar vendas PLUS II (10944, 10946, 10947) pois o tipo nao existe no enum

