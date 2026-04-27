## Ajuste de copy da tela de login (`/auth`)

A copy atual do painel esquerdo está genérica ("gestão de pedidos", "automação completa") e não reflete o propósito real do OPM-SEGSAT, que é orquestrar o ciclo operacional de **homologação, kickoff, planejamento, agendamento, logística e instalação de rastreadores veiculares**.

### Mudanças propostas em `src/pages/Auth.tsx`

**1. Headline (linhas 211-214)**

De:
> Gerencie suas operações com **inteligência e controle total**

Para:
> Do kickoff à instalação, **uma única plataforma operacional**

**2. Subtítulo (linhas 215-217)**

De:
> Plataforma completa para gestão de pedidos, homologação de veículos e acompanhamento de instalações.

Para:
> OPM centraliza homologação, planejamento, logística e agendamento de rastreadores veiculares — com visibilidade completa de cada veículo, do recebimento à instalação em campo.

**3. Lista de features (linhas 182-186)**

De:
- Gestão inteligente — Controle total dos seus pedidos em tempo real
- Automação completa — Processos otimizados do início ao fim
- Segurança avançada — Dados protegidos com criptografia de ponta

Para:
- **Fluxo ponta a ponta** (`BarChart3`) — Homologação, kickoff, planejamento, logística e agendamento conectados
- **Acompanhamento em tempo real** (`Zap`) — Status de cada veículo e cliente atualizado instantaneamente
- **Controle por perfil de acesso** (`Shield`) — Permissões granulares por módulo e operação

### Resumo

Apenas troca de strings em `Auth.tsx` (3 trechos: headline, subtítulo, array `features`). Nenhuma mudança de layout, ícones ou estilos. Sem impacto em rotas, banco ou outros componentes.