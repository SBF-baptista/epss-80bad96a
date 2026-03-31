

## Diagnostico: Veiculos duplicados entre vendas diferentes

### Causa raiz

A mesma placa fisica aparece em vendas diferentes (sale_summary_id distintos) porque o sync criou registros duplicados antes da correcao do indice unico. O indice atual so previne duplicatas dentro da mesma venda, mas nao entre vendas diferentes.

Duplicatas encontradas:
- `QZJ3J56` - Zenatti: vendas 10945 e 10974
- `QZU1C46` - Zenatti: vendas 10945 e 10974  
- `QTO2117` - Control: vendas 10943 e 10973

### Plano de correcao

**1. Limpar dados duplicados no banco**
- Deletar os 3 registros duplicados mais recentes (das vendas 10974 e 10973), mantendo os originais nas vendas 10945 e 10943
- IDs a remover: `32bd00a8` (QZJ3J56 na 10974), `b3a25374` (QZU1C46 na 10974), `d34c918f` (QTO2117 na 10973)
- Se a venda 10974 ficar vazia, verificar se tem outros veiculos; se nao, o card simplesmente desaparece do kickoff

**2. Prevenir duplicatas futuras na sincronizacao**
- Modificar `receive-vehicle/processing.ts` para verificar se a placa ja existe em `incoming_vehicles` (qualquer sale_summary_id) antes de inserir
- Se a placa ja existir e pertencer a outra venda, pular a insercao e registrar log de duplicata ignorada
- Isso impede que o sync crie registros para veiculos que ja estao no sistema sob outra venda

**3. Verificar se as vendas 10974 e 10973 ficam vazias**
- Apos a limpeza, verificar se ainda restam veiculos nessas vendas
- Se ficarem vazias, nenhum card aparecera no kickoff (comportamento correto)

### Resultado esperado
- Zenatti 10945: 10 veiculos (correto)
- Zenatti 10974: 0 veiculos (card desaparece) ou apenas veiculos unicos
- Control: sem duplicatas entre vendas
- Futuras sincronizacoes nao criam duplicatas cross-venda

