# Plano: abas Caminhão e Ônibus na Localização do Kickoff

## Objetivo
Permitir escolher, em cada grupo de Copiloto, se a localização das câmeras será marcada em imagens de caminhão ou ônibus.

## O que será entregue
- Adicionar as abas **Caminhão** e **Ônibus** dentro de cada grupo do bloco Localização.
- Manter na aba Caminhão as quatro imagens e marcações atuais.
- Usar na aba Ônibus as três imagens enviadas: interior superior, vista lateral e vista frontal.
- Aplicar nas imagens de ônibus a mesma lógica atual: clicar para adicionar marcadores numerados, clicar no marcador para remover e exigir a quantidade total de câmeras do grupo.
- Ao trocar o tipo do veículo, limpar as marcações incompatíveis após confirmação visual na própria escolha, evitando coordenadas sobre imagens erradas.
- Salvar o tipo escolhido, as marcações e a observação no histórico de aprovação.
- Exibir no histórico somente as imagens correspondentes ao tipo escolhido, mantendo compatibilidade com kickoffs antigos como Caminhão.
- Restaurar também a escolha Caminhão/Ônibus ao usar um kickoff anterior.

## Detalhes técnicos
- Enviar as três imagens anexadas para os ativos do aplicativo.
- Ampliar os dados de localização com `vehicle_type` e áreas específicas do ônibus.
- Atualizar o formulário de detalhes e a visualização do histórico sem alterar a regra de soma das câmeras.
- Validar tipagem, compilação e apresentação do bloco.
