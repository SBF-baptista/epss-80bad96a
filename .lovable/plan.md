# Flag de homologação para acessórios

## Objetivo
Permitir definir, no cadastro de cada acessório, se ele exige homologação. Um veículo irá direto ao Planejamento somente quando tiver acessórios vinculados e todos estiverem marcados como dispensados.

## Alterações
- Adicionar o campo **Precisa de homologação** no cadastro e na edição de acessórios.
- Exibir na lista se cada acessório exige homologação ou está dispensado.
- Manter todos os acessórios atuais e novos marcados como obrigatórios por padrão.
- No encerramento do Kickoff, comparar os acessórios reais do veículo com o cadastro usando a normalização já adotada pelo sistema.
- Quando todos os acessórios forem conhecidos e dispensados, concluir a homologação automaticamente e acionar a criação normal do Planejamento.
- Se o veículo não tiver acessórios, tiver algum acessório desconhecido ou algum obrigatório, manter o fluxo completo de Homologação.

## Detalhes técnicos
- A flag ficará em `kit_item_options`, fonte central do cadastro de acessórios.
- A decisão será feita no processamento seguro do Kickoff, não apenas na tela.
- O card próprio do veículo será preservado para histórico e rastreabilidade, porém já nascerá homologado quando a dispensa for válida.
- As consultas e tipos do cadastro serão atualizados para ler e salvar a flag.

## Validação
- Cadastrar e editar acessórios com as duas opções.
- Confirmar a identificação visual na lista.
- Validar os três caminhos: todos dispensados; combinação com item obrigatório; item não cadastrado/sem acessórios.
- Confirmar que somente o primeiro caminho cria o Planejamento automaticamente.
