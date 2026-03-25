

## Plano: Bloquear reprocessamento de vendas antigas no webhook e sync

### Problema
Quando o Segsale envia um webhook com um `idResumoVenda` antigo (ex: 372), o sistema aceita e insere os veículos na tabela `incoming_vehicles` sem verificar se aquele `sale_summary_id` já foi processado anteriormente. Resultado: vendas antigas aparecem misturadas com as novas.

### Causa raiz
Nem o `segsale-webhook` nem o `sync-segsale-auto` verificam se o `sale_summary_id` já existe na tabela `incoming_vehicles` antes de chamar `receive-vehicle`.

### Solução
Adicionar uma verificação de deduplicação em dois pontos:

**1. `supabase/functions/segsale-webhook/index.ts`**
- Antes de chamar `fetch-segsale-products`, consultar `incoming_vehicles` para verificar se já existem registros com aquele `sale_summary_id`
- Se já existirem, retornar resposta 200 com mensagem "Sale already processed, skipping" sem reprocessar
- Logar a tentativa de reprocessamento para auditoria

**2. `supabase/functions/receive-vehicle/processing.ts`**
- Antes de inserir cada veículo, verificar se já existe um registro com o mesmo `sale_summary_id` + `brand` + `vehicle`
- Se existir, pular a inserção e retornar o registro existente com status `already_exists`

**3. Limpeza dos dados antigos**
- Deletar os registros da venda 372 que foram inseridos indevidamente via query na tabela `incoming_vehicles`

### Detalhes técnicos

No webhook, a verificação será:
```typescript
// Check if sale_summary_id already exists
const { data: existing } = await supabase
  .from('incoming_vehicles')
  .select('id')
  .eq('sale_summary_id', idResumoVenda)
  .limit(1);

if (existing && existing.length > 0) {
  return Response({ success: true, message: 'Sale already imported, skipping duplicate' });
}
```

No `receive-vehicle/processing.ts`, antes do insert:
```typescript
if (group.sale_summary_id) {
  const { data: existingVehicle } = await supabase
    .from('incoming_vehicles')
    .select('id')
    .eq('sale_summary_id', group.sale_summary_id)
    .eq('brand', brand.trim())
    .eq('vehicle', vehicle.trim())
    .limit(1)
    .maybeSingle();

  if (existingVehicle) {
    // Skip, return existing record
    continue;
  }
}
```

### Arquivos modificados
- `supabase/functions/segsale-webhook/index.ts` — adicionar guard de deduplicação
- `supabase/functions/receive-vehicle/processing.ts` — adicionar verificação antes do insert
- Executar DELETE para remover a venda 372 reprocessada

