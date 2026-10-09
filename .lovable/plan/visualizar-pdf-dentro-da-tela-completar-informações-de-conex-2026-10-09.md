# Visualizar PDF dentro da tela + completar informações de conexão

## 1. Botão do olho (visualização)
O navegador do usuário bloqueia o leitor de PDF embutido (mesma causa do ERR_BLOCKED_BY_CLIENT). Em vez de depender dele, a própria tela vai desenhar as páginas do PDF como imagens, uma abaixo da outra, numa janela com rolagem.
- Funciona em qualquer navegador, com ou sem bloqueador.
- Botões na janela: Baixar e Fechar; indicador "Página X de Y".

## 2. Informações de conexão no PDF
Hoje o PDF já traz: tipo de conexão elétrica, checklist (RPM, odômetro, combustível), observações técnicas e as fotos com legenda (Local da CAN, Fios da CAN, Positivo, Negativo, Pós-chave, Bloqueio etc.).

O que falta e será adicionado:
- Bloco "Conexões" com: modelo do equipamento usado no teste, tipo de conexão elétrica, local do teste e observações/notas do card.
- Por foto: um resumo de quais pontos de conexão têm foto e quais estão faltando (ex.: "Fios da CAN: sem foto"), conforme o modelo do rastreador.

Importante: o sistema não "lê" o conteúdo das fotos. Ele só sabe o tipo de cada foto (ex.: Fios da CAN) porque o técnico escolhe isso ao enviar. Detalhes como cor de fio ou pino da CAN só aparecem se o técnico escrever nas observações. Se quiser, posso depois adicionar campos próprios para isso na Execução de Teste (ex.: "Pino CAN High/Low", "Cor do fio").

## Detalhes técnicos
- Adicionar `pdfjs-dist`; no modal, renderizar cada página em `<canvas>` a partir do ArrayBuffer (worker via import `?url`). Remove `<object>`.
- Edge function `homologation-test-pdf`: incluir `equipment_model` e `notes` nos dados; nova seção "Conexões" e lista de cobertura de fotos por `template.photoOrder` (presentes/ausentes). Redeploy.
