# Redesign da aba Produção — achados e plano

## O que existe hoje (fase 1)
- **Esteira:** 4 colunas (Pedidos, Contagem, Em Produção, Em Verificação). Cada card = **um veículo (uma placa)**. O agrupamento por cliente existe no código mas está desligado aqui, como você pediu antes ("não agrupar por cliente").
- **Card mostra:** cliente, "1 veículo", detalhes do veículo/kit, nota da contagem (quem fez, quando, observação) e botão da etapa.
- **Contagem:** itens previstos vêm do kit e dos acessórios/insumos do veículo. Quantidades contadas ficam salvas (inclusive em "Salvar andamento"). "Liberar para produção" só libera com todos conferidos e quantidade igual à prevista. Abas Equipamentos/Acessórios/Módulos/Insumos.
- **Scanner:** abas Scanner e Manual, mas **não existe leitura por câmera** — as duas abas são campos de digitação (o leitor físico digita no campo IMEI). Campos: IMEI, Serial, Código da Linha. IMEI repetido é recusado. "Enviar para verificação" libera com 1+ item.
- **Verificação:** só leitura, mostra a contagem (responsável, data, observação) e os IMEIs/seriais. "Liberar para expedição" está sempre liberado.
- **Prazo/atraso:** nada disso existe na Produção hoje. Não vou criar.
- **Cores:** já existem azul (primária), âmbar, verde e vermelho no tema; não há cor própria por etapa.

## Decisões propostas
1. **Card por placa** (mantém o modelo real). O chip de placa vira o identificador principal. Não existe "pedido com várias placas" na Produção hoje; criar isso seria inventar agrupamento.
2. **Scanner:** a aba "Scanner" fica para o leitor físico (campo focado automaticamente; Enter adiciona). Sem câmera, porque não existe integração.
3. **Verificação:** "Liberar para expedição" passa a exigir checklist fechado = contagem concluída + pelo menos 1 IMEI registrado (hoje está sempre liberado).
4. **Cores por etapa:** Pedidos azul, Contagem âmbar, Em Produção roxo, Em Verificação verde — só no topo da coluna e na borda esquerda do card.

## O que muda na tela
- **Topo:** título + "Na esteira: N" (total das 4 colunas).
- **Colunas:** fundo neutro com borda, topo colorido com contagem, "Nenhum pedido nesta etapa" quando vazia. Em celular, rolagem lateral com colunas de largura fixa.
- **Card:** cliente, chip da placa, progresso da etapa:
  - Contagem: "Acessórios X/N · Insumos Y/M" + barra (vem do que já foi salvo).
  - Em Produção: "N IMEIs registrados".
  - Em Verificação: "Pronto" ou o que falta.
  - Botão principal em navy.
- **Modais (mesmo padrão):** cabeçalho com ícone, título, "cliente · PLACA"; cartão do cliente (CNPJ/telefone + selo do produto); abas com contagem; barra de progresso geral. No celular ocupam quase toda a tela, com rodapé fixo.
  - **Contagem:** linha por item com botões − valor +, fica verde com check ao bater; aviso "faltam N"; rodapé Salvar andamento / Liberar para produção.
  - **Scanner:** abas Scanner/Manual, IMEI/Serial/Código da Linha, "Adicionar item", lista "Itens processados" com contador.
  - **Verificação:** mesmo checklist em linhas, só leitura, + blocos da Contagem e da Produção.

## Não muda
Rotas, permissões, regras de acesso, onde os dados ficam salvos, arraste livre do Pedro, Expedição.

## Detalhes técnicos
- Cores novas das etapas como tokens em `src/index.css` + `tailwind.config.ts` (`stage-orders/counting/production/verification`).
- Progresso por card: buscar em lote `production_check_items` (etapa counting) e contagem de `production_items` por `kit_schedule_id` dos cards visíveis, em `KanbanBoard`.
- Stepper substitui o `Input` de quantidade em `ProductionCheckModal`; mesma lógica de `itemsValid`/salvamento.
- `canAdvance` da verificação = `countingCompletedAt && productionItems.length > 0`.
- Arquivos: `Kanban.tsx`, `KanbanBoard.tsx`, `KanbanColumn.tsx`, `GroupedOrderCard.tsx`, `ProductionCheckModal.tsx`, `ProductionScannerModal.tsx`, `ProductionForm.tsx`, `ProductionScannerTabs.tsx`, `ProductionItemsList.tsx`. `GroupedOrderCard` também é usado na Expedição — o novo visual fica só no modo produção.
