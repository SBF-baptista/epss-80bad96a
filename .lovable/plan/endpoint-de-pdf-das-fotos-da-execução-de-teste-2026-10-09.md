# Endpoint de PDF das fotos da Execução de Teste

## O que será entregue
Um endpoint que monta um PDF com as fotos enviadas na Execução de Teste de uma homologação, junto com a configuração usada e o modelo do rastreador. O PDF muda de layout conforme o tipo de rastreador informado.

## Como chamar
`GET /functions/v1/homologation-test-pdf`

Parâmetros:
- `homologation_id` (ou `marca` + `modelo` + `ano`) — qual homologação
- `rastreador` (opcional) — ex.: `FMC150`, `FMC130`, `RUPTELA`. Se não vier, usa o modelo do rastreador da regra de configuração (`automation_rules_extended.tracker_model`) daquela configuração.
- `formato=json` (opcional) — devolve só a lista de fotos com links, sem PDF.

Retorno: arquivo PDF (`application/pdf`), nome `homologacao_MARCA_MODELO_ANO_RASTREADOR.pdf`.

Acesso: chave de API no cabeçalho `x-api-key` (mesmo padrão do endpoint OPM) ou usuário logado.

## Conteúdo do PDF
1. Capa: marca, modelo, ano, chassi, ano de fabricação, configuração usada, modelo do rastreador, técnico, data do teste, tipo de conexão elétrica.
2. Checklist do teste (RPM, Odômetro, Nível/Consumo de combustível) e observações técnicas.
3. Fotos, uma seção por tipo, com legenda: Chassi, Veículo, Local da CAN, Fios da CAN, Rastreador, Positivo, Negativo, Pós-chave, Bloqueio, Outros.

## Um modelo por rastreador
Cada tipo de rastreador terá seu próprio modelo: título, quais tipos de foto entram e em que ordem, e campos extras exibidos. Ex.:
- FMC150 (Telemetria): destaca fotos e fios da CAN.
- FMC130 (Rastreamento): destaca positivo/negativo/pós-chave/bloqueio.
- Padrão: todas as fotos, para rastreadores sem modelo específico.

Adicionar um novo rastreador = adicionar um novo modelo na lista.

## Detalhes técnicos
- Nova edge function `homologation-test-pdf` (Deno), `verify_jwt=false`, validação com Zod, CORS.
- Lê `homologation_cards`, `homologation_photos` (bucket `homologation-photos`) e `automation_rules_extended`.
- PDF gerado com `pdf-lib` (npm:), imagens JPG/PNG embutidas e redimensionadas; fotos de outros formatos ficam listadas com link.
- Modelos por rastreador num mapa `TEMPLATES` dentro da função, com fallback `default`.
- Nova chave secreta para `x-api-key`.
- Erros de negócio retornam 200 com `{ error }` (regra do projeto); PDF só quando houver dados.
- Teste: chamar o endpoint com uma homologação real e com dois rastreadores diferentes, conferir as páginas.

## Para confirmar
Se tiver regras específicas do que cada rastreador deve mostrar, me diga; caso contrário uso os modelos acima.
