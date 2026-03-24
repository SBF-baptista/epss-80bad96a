

# Plano: Tela de Vendas Segsale no Módulo de Configuração

## O que será feito

Criar uma nova página "Vendas Segsale" acessível dentro do grupo "Configuração" na navegação lateral. Essa tela exibirá todas as vendas recebidas do Segsale (tabela `incoming_vehicles`), agrupadas por `sale_summary_id`, mostrando todas as informações disponíveis: empresa, veículos, tipo de uso, placa, data/hora de recebimento, status de processamento, etc.

## Mudanças

### 1. Nova página `src/pages/SegsaleSales.tsx`
- Consulta `incoming_vehicles` ordenado por `received_at DESC`
- Agrupa por `sale_summary_id` e `company_name`
- Exibe tabela com colunas: ID Venda, Empresa, Veículo (marca/modelo), Ano, Placa, Tipo de Uso, Quantidade, Status (processado/pendente), Data de Recebimento
- Filtro por empresa e status (processado/pendente)
- Busca textual por empresa, veículo ou placa
- Badge visual para status processado vs pendente

### 2. Rota em `src/App.tsx`
- Adicionar rota `/segsale-sales` protegida com `requiredModule="scheduling"` e `adminOnly` (mesma permissão do grupo Configuração)

### 3. Item de navegação em `src/components/AppNavigation.tsx`
- Adicionar item "Vendas Segsale" no grupo "Configuração" com ícone `Package`
- Visível apenas para admins (`adminOnly: true`)

### Dados exibidos por venda

| Coluna | Origem |
|---|---|
| ID Resumo Venda | `sale_summary_id` |
| Empresa | `company_name` |
| CPF/CNPJ | `cpf` |
| Veículo | `brand` + `vehicle` |
| Ano | `year` |
| Placa | `plate` |
| Tipo de Uso | `usage_type` |
| Quantidade | `quantity` |
| Cidade | `address_city` |
| Status | `processed` (badge verde/amarelo) |
| Kickoff | `kickoff_completed` (badge) |
| Recebido em | `received_at` formatado com data e hora |

### Resultado
Uma tela completa dentro de Configuração que mostra automaticamente todas as vendas do Segsale sem precisar pesquisar por ID, com data/hora de quando foram importadas.

