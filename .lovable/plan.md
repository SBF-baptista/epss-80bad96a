

## Problema Identificado

Os blocos **Cameras Extras**, **Venda Cameras Extras** e **Venda de Acessorios** nao estao aparecendo no popup do pedido de instalacao porque os dados do kickoff nao estao sendo encontrados no banco de dados.

### Causa Raiz

O fluxo atual busca dados assim:

```text
schedule.customer_id -> customers.sale_summary_id -> kickoff_history
```

O cliente "PEDRO ALBUQUERQUE" na tabela `customers` tem `sale_summary_id: 263`, mas o kickoff do COBALT foi registrado com `sale_summary_id: 367`. Como os IDs nao coincidem, a consulta retorna vazio e os blocos nao aparecem.

Isso acontece porque o mesmo cliente pode ter multiplas vendas (sale_summary_ids diferentes) ao longo do tempo, e o registro do customer fica vinculado a um ID antigo.

### Correcao

Alterar a logica de busca dos dados de kickoff no `OrderModal.tsx` para usar uma estrategia de fallback mais robusta:

1. **Tentativa 1**: Buscar pelo `sale_summary_id` do customer (logica atual)
2. **Tentativa 2 (fallback)**: Se nao encontrar, buscar o `sale_summary_id` diretamente do `incoming_vehicles` que corresponde ao veiculo do schedule (marca/modelo), e entao buscar o kickoff_history com esse ID
3. **Tentativa 3 (fallback)**: Se ainda nao encontrar, buscar o kickoff_history pelo `company_name` do pedido

A mesma correcao sera aplicada ao fetch de **Cameras Extras** (que tambem depende do `sale_summary_id` do customer).

### Detalhes Tecnicos

**Arquivo**: `src/components/OrderModal.tsx`

- Refatorar os dois `useEffect` de fetch (`fetchCameraExtras` e `fetchKickoffSalesData`) para compartilhar uma funcao auxiliar `findSaleSummaryId` que implementa a logica de fallback:
  1. Busca `sale_summary_id` do `customers` pelo `customer_id`
  2. Se nao encontrar dados no kickoff_history com esse ID, busca o `incoming_vehicle` mais recente que corresponde ao veiculo do schedule e usa o `sale_summary_id` dele
  3. Como ultimo recurso, busca pelo `company_name` na `kickoff_history`

- Isso garante que mesmo quando o `sale_summary_id` do customer esta desatualizado, os dados do kickoff ainda aparecem corretamente no popup

