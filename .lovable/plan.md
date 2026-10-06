# Reorganizar Produção e criar conferências por pedido

## Resultado esperado

A área **Produção** terá quatro etapas:

1. **Pedidos**
2. **Contagem**
3. **Em produção**
4. **Em Verificação**

As etapas **Aguardando Envio** e **Enviado** sairão de Produção e passarão para **Expedição**.

## Fluxo do pedido

- Cada cartão representará um pedido/veículo, sem avançar em grupo por cliente.
- Em **Pedidos**, o botão inicia a contagem.
- Em **Contagem**, o usuário confere cada equipamento, acessório, módulo e insumo previsto no kit, informa a quantidade recebida e marca o item como conferido.
- O pedido só avança para **Em produção** quando todas as quantidades coincidirem com o kit.
- Ao terminar a produção, o pedido avança para **Em Verificação**.
- Em **Em Verificação**, o usuário faz a validação final do kit completo, incluindo itens, quantidades e IMEI/serial registrados.
- O pedido só é liberado para **Expedição** quando a verificação final estiver completa.
- O avanço será feito somente pelos botões das telas de conferência; o arrastar entre colunas será desativado.

## Persistência e auditoria

- Criar registros de conferência ligados ao pedido, ao item esperado e à etapa (`contagem` ou `verificação`).
- Salvar quantidade esperada, quantidade conferida, aprovação, usuário e data/hora.
- Proteger os registros com as mesmas permissões do módulo Logística/Kanban e manter `created_by` obrigatório.
- Preservar os pedidos atuais: `scheduled` continua em Pedidos, `in_progress` continua Em produção, `completed` aparece em Aguardando Envio e `shipped` em Enviado.

## Telas

- Adaptar os cartões e modais para o trabalho individual por pedido/veículo.
- Criar a conferência de Contagem e a conferência final com indicação clara de pendências.
- Montar Expedição com as colunas Aguardando Envio e Enviado e manter a preparação de envio já existente.
- Atualizar histórico e rótulos do processo para refletir as novas etapas.

## Verificação

- Validar que quantidades divergentes bloqueiam o avanço.
- Validar que cada pedido avança sozinho.
- Validar a sequência completa até Expedição e o envio existente.
- Conferir Produção e Expedição em tela ampla e celular.
