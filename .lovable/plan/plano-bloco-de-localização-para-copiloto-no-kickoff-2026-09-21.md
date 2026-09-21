# Plano: bloco de Localização para Copiloto no Kickoff

## Objetivo
Adicionar, dentro da aba de detalhes do Kickoff, um bloco chamado **Localização** para veículos com produto **Copiloto 2 Câmeras** ou **Copiloto 4 Câmeras**.

## O que será entregue
- O bloco aparecerá somente quando houver veículo Copiloto 2 ou 4 câmeras no Kickoff.
- Para cada veículo Copiloto, será possível informar a quantidade total de câmeras do veículo.
- A quantidade vai considerar:
  - 2 câmeras base para Copiloto 2 Câmeras;
  - 4 câmeras base para Copiloto 4 Câmeras;
  - câmeras extras, quando houver.
- O usuário poderá clicar na imagem do **cavalo do caminhão** ou do **baú** para marcar onde cada câmera será instalada.
- Cada clique criará um marcador numerado na imagem escolhida.
- Será possível remover um marcador caso a posição seja marcada errado.
- O Kickoff só permitirá finalizar quando a quantidade de marcações bater com a quantidade total de câmeras definida para cada veículo Copiloto.

## Como ficará no fluxo
- O bloco será inserido logo após a tabela de veículos, antes dos contatos e locais de instalação.
- Os dados serão salvos junto aos detalhes do Kickoff e no histórico do Kickoff, para consulta posterior.
- A seção antiga de **Câmeras Extras** continuará existindo apenas para veículos que não são Copiloto, preservando o comportamento atual.

## Detalhes técnicos
- A alteração principal será em `KickoffDetailsModal.tsx`.
- Serão adicionados tipos e estado local para guardar os pontos clicados por veículo.
- A imagem do cavalo e do baú será feita como ilustração responsiva em HTML/CSS dentro do próprio bloco, sem depender de imagem externa.
- Os pontos serão salvos no `vehicles_data` do histórico do Kickoff e no campo existente de localização de câmeras do veículo como JSON em texto.
