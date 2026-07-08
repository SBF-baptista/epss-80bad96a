## Objetivo

Aplicar no banner `StalledAlertsBanner` os mesmos dois ajustes já feitos no popup:
1. Texto dinâmico listando só as etapas com ocorrência agora.
2. Destaque visual da contagem de itens parados.

## Arquivo alterado

- `src/components/alerts/StalledAlertsBanner.tsx` (único arquivo)

Nada muda em `StalledAlertsPopup.tsx`, no hook `useStalledAlerts` ou nos serviços.

## Mudanças

### 1. Texto dinâmico (substitui o `AlertDescription` fixo)

Construir a frase a partir das etapas presentes em `alerts`:

- Mapa local `STAGE_LABELS: Record<StalledAlertType, string>` com:
  - `planning` → "Planejamento"
  - `production` → "Em Produção (Logística)"
  - `scheduling` → "Agendamento"
- Filtrar `Object.keys(STAGE_LABELS)` mantendo apenas os tipos que aparecem em `alerts`.
- Concatenação:
  - 1 etapa → `"na etapa de {A}"`
  - 2 etapas → `"nas etapas de {A} e {B}"`
  - 3 etapas → `"nas etapas de {A}, {B} e {C}"`
- Frase final: `"Existem veículos parados fora do prazo estabelecido {prefixo} {lista}."`
- Remover os fragmentos "(>2d)", "(>3d)" — os limites já aparecem na lista de itens.

### 2. Destaque visual da contagem

Reestruturar o cabeçalho do `Alert` mantendo o `variant="destructive"`, a borda e o fundo atuais, e o botão "Ver detalhes" à direita com o comportamento existente (toggle da lista).

Estrutura do bloco à esquerda:

```text
[▲]  28  itens parados
     Existem veículos parados fora do prazo estabelecido nas etapas de ...
```

- Ícone `AlertTriangle`: mantém tamanho atual (`h-4 w-4`), alinhado verticalmente ao número (não ao texto do subtítulo) via `items-center` no wrapper número+ícone.
- Número: `text-[26px] font-semibold leading-none text-destructive` (herda o vermelho do variant destructive; usar token, não hex).
- Rótulo "item parado" / "itens parados": `text-[14px] font-medium`, ao lado do número, com singular/plural conforme `alerts.length`.
- Subtítulo dinâmico: permanece dentro de `AlertDescription`, abaixo, discreto (tamanho atual).
- Remover o `AlertTitle` antigo que repetia "N itens parados no processo" — a contagem agora está no bloco destacado; manter só contagem destacada + descrição dinâmica.

### 3. Preservado

- `variant="destructive"` e classes de borda/fundo (`border-destructive/40`).
- Botão "Ver detalhes" / "Ocultar" com `ChevronDown` / `ChevronUp` e o toggle de `StalledAlertsList`.
- Comportamento de esconder o banner quando `alerts.length === 0`.
- Fonte dos dados (`MOCK_STALLED_ALERTS` + `useStalledAlerts`).

## Detalhes técnicos

- Sem novas dependências.
- Sem alterações em tipos ou serviços; `StalledAlertType` já é exportado de `stalledAlertsService`.
- Cores via tokens semânticos (`text-destructive`), sem hex hardcoded.
- Nenhuma mudança de comportamento no popup, na navegação ou nos dados.
