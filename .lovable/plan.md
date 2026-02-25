

# Excluir dados pendentes do Kickoff

## Resumo
Excluir os **720 veiculos pendentes** (kickoff_completed = false) da tabela `incoming_vehicles` e os **37 acessorios** vinculados a eles na tabela `accessories`.

A exclusao direta via SQL nao e possivel devido as politicas de seguranca (RLS). Sera necessario criar uma migration SQL que execute com permissoes elevadas.

## Plano

### Migration SQL
Criar uma migration que:
1. Primeiro exclui os **acessorios** vinculados aos veiculos pendentes (dependencia referencial)
2. Depois exclui os **incoming_vehicles** com `kickoff_completed = false`

```sql
-- Excluir acessorios vinculados a veiculos pendentes
DELETE FROM public.accessories 
WHERE vehicle_id IN (
  SELECT id FROM public.incoming_vehicles WHERE kickoff_completed = false
);

-- Excluir veiculos pendentes
DELETE FROM public.incoming_vehicles 
WHERE kickoff_completed = false;
```

### Resultado esperado
- 37 registros removidos da tabela `accessories`
- 720 registros removidos da tabela `incoming_vehicles`
- A tela de Kickoff ficara vazia (aba "Pendentes")
- Os 113 veiculos ja concluidos permanecem intactos
- Nenhuma alteracao de codigo e necessaria

