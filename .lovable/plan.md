# Identificar o equipamento (rastreador) do veículo no Agendamento

## Resposta curta

Hoje **não dá para garantir**. Mesmo quando o veículo percorre todo o fluxo (Kickoff → Homologação → Planejamento → Agendamento), o sistema não carrega um "modelo de equipamento" confiável até o agendamento. Dá para passar a identificar, mas exige ligar as pontas que já existem.

## O que a verificação mostrou

- O campo "Modelo do Rastreador" do Novo Agendamento é **texto livre**. Nos 131 agendamentos existentes aparecem 31 valores diferentes para o mesmo universo de equipamentos: `XT40`, `Smart5 `, `SMART5`, `SMART 5`, `nt20`, `NT20`, `a`, `-`, `xxx`, além de frases inteiras ("INSTALAÇÃO 1 Dashcam completa...").
- Quando o veículo vem do Planejamento, o campo é pré-preenchido com a **configuração** da homologação (ex.: `FMS250`, `OBD + LCV Fiat 24`) — que é a configuração de instalação, **não** o modelo do equipamento.
- A base que realmente relaciona veículo → equipamento são as **regras de automação** (marca/modelo/ano → modelo do rastreador + configuração), mas hoje ela tem apenas **19 regras** cadastradas.
- Os **kits de homologação** estão vazios (0 kits, 0 itens de equipamento), então essa fonte não ajuda hoje.
- Das 328 fichas de homologação, apenas 98 têm configuração preenchida.
- O IMEI/hardware real só aparece **depois** (produção, retorno de instalação, unidades pendentes de IMEI) — nunca antes do agendamento.

Ou seja: a informação existe em pedaços, mas nada obriga nem propaga o modelo de equipamento ao longo do processo.

## Proposta para passar a identificar

1. **Padronizar o equipamento como lista, não texto**
   - Criar um cadastro de modelos de equipamento (Smart5, XT40, NT20, FMC130, FMC150, FMS250, FMC003, FMB140, Dashcam etc.), com normalização dos valores já existentes (Smart5/SMART 5/SMART5 → um só).
   - No Novo Agendamento, trocar o input livre por seleção da lista (com opção de cadastrar novo, como já é feito em técnico/serviço).

2. **Separar "equipamento" de "configuração"**
   - Guardar o modelo do equipamento em campo próprio na homologação e no agendamento, deixando `configuration` para o esquema de instalação. Hoje os dois estão misturados no mesmo campo.

3. **Propagar automaticamente pelo fluxo**
   - Ao concluir a homologação de uma marca/modelo/ano, gravar o equipamento homologado na ficha.
   - No Planejamento/Agendamento, pré-preencher o equipamento nesta ordem: ficha de homologação do veículo → regra de automação (marca/modelo/ano) → tipo de uso da venda (Telemetria CAN, Copiloto 2/4 câmeras, Particular…) → em branco com aviso "equipamento não definido".
   - Bloquear o campo quando vier da homologação (mesmo padrão já usado para placa/modelo/ano).

4. **Fechar o ciclo com o IMEI**
   - Quando o retorno de instalação chegar com IMEI/modelo, comparar com o equipamento previsto e registrar divergência (ex.: previsto Smart5, instalado XT40) para auditoria.

5. **Backfill e visibilidade**
   - Normalizar os agendamentos já existentes onde o valor é reconhecível; marcar como "não identificado" os casos `a`, `-`, `xxx`.
   - Mostrar o equipamento previsto no card/detalhe do agendamento e no disparo da agenda.

## Detalhes técnicos

- Nova tabela `equipment_models` (nome, ativo) + normalização NFD/uppercase para deduplicar valores atuais.
- Novas colunas: `homologation_cards.equipment_model`, `installation_schedules.equipment_model`, `kit_schedules.equipment_model`.
- Resolver equipamento em `ScheduleFormModal.tsx` a partir de `initialVehicleData` (hoje só usa `configuration`), com fallback em `automationRulesService`.
- Comparação previsto × instalado usando `instalacoes_recebidas.tracker_model` / `imei`.

## Escopo mínimo, se preferir começar pequeno

Somente os itens 1 e 3: lista padronizada + preenchimento automático a partir da homologação/regras de automação. Isso já responde "qual equipamento vai nesse veículo" em todo agendamento novo.
