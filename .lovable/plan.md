# Relatório: endpoint verify-vehicle

## O que ele faz hoje
- Recebe `brand` (marca) e `model` (modelo) e procura um veículo com esses nomes nos pedidos antigos (tabela de veículos de pedidos).
- Se encontra: devolve id, marca, modelo, quantidade, tipo e data de criação. Com `create_order=true`, tenta criar um pedido automático (AUTO-001, AUTO-002...) usando a regra de automação daquele veículo.
- Se não encontra: devolve 404 "Vehicle not found" e cria um card na Homologação com status "homologar".
- Exige login: um token de usuário no cabeçalho `Authorization`.

## Erros encontrados
1. **Recusa sem login (401 Unauthorized)** — testado agora: chamar o endereço sem token devolve `{"error":"Unauthorized"}`. O cadastro no Monitoramento de APIs não envia nenhum cabeçalho, por isso ele sempre falha lá.
2. **Documentação errada** — o catálogo do Monitoramento diz que ele recebe `?plate={placa}` e devolve status do veículo (novos, produção, homologar...). Isso não existe: ele usa marca + modelo e não conhece placa. Com `plate`, devolve 400 "Missing required parameters".
3. **Tela de teste desatualizada** — a tela de teste pede "API Key" e envia `x-api-key`, mas o endpoint só aceita token de login; a chave é ignorada e o resultado é sempre 401.
4. **Respostas fora do padrão do projeto** — usa 404/500 para erros de negócio; o padrão do app é responder 200 com o erro no corpo, para não travar telas.
5. **Efeito colateral** — uma simples consulta que não acha o veículo cria card de Homologação; testes repetidos podem poluir a Homologação.
6. Sem registros recentes de uso: nenhum sistema está chamando com sucesso.

## Correção proposta (se aprovar)
- Aceitar login **ou** a mesma `x-api-key` já usada pelos sistemas externos (OPM).
- Aceitar também `plate`, devolvendo se a placa existe, etapa atual e pedido vinculado (o que a documentação promete).
- Responder 200 com `success`/`error` no corpo.
- Criar card de Homologação só quando pedido explicitamente (`create_homologation=true`).
- Atualizar o catálogo do Monitoramento e a tela de teste para refletir os parâmetros reais.
