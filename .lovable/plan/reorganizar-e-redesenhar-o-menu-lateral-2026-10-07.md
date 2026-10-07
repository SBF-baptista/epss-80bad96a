# Reorganizar e redesenhar o menu lateral

## Achados (Passo 1)

- **Componente:** `src/components/AppNavigation.tsx` (shadcn `Sidebar` + `Collapsible`, montado em `Layout.tsx`). Os itens ficam em listas fixas soltas (`singleNavigationItems`, `navigationGroups`, `planningItem`, `schedulingItem`, `installationItem`, `simulatorItem`, `additionalSingleItems`), e cada grupo tem seu JSX copiado à mão (Homologação, Logística, Solicitações, Configuração).
- **Permissão:** `canAccessItem()` já esconde o que o usuário não acessa: admin vê tudo; `adminOnly` só admin; Ativação de Unidades também para usuários autorizados (`useUnitActivationPermission`); demais via `canViewModule(module|modules)` de `useUserRole` — mesma fonte de verdade das telas. Grupos vazios já somem.
- **Estilo:** Tailwind + shadcn, tokens `--sidebar-*` em `src/index.css` (azul-marinho). Badges: Solicitações de Edição (pendências) e Status Unidades Frota (falhas).
- **Problemas atuais:** "Configuração" com 12 itens misturados; sem seções; estado aberto/fechado não persiste; Simulador fica no topo.

## Mapa item → rota (antes → depois)

```text
Início                        /modules                   Topo
Chamados                      /chamados                  Topo
Kickoff                       /kickoff                   Operação
Homologação de Veículos       /homologation              Operação > Homologação
Kits                          /kits                      Operação > Homologação
Acessórios & Insumos          /accessories-supplies      Operação > Homologação
Gestão de Configurações       /config                    Operação > Homologação
Planejamento                  /planning                  Operação
Produção                      /kanban                    Operação > Logística
Expedição                     /expedition                Operação > Logística
Dash logística                /dashboard                 Operação > Logística
Agendamento                   /scheduling                Operação
Instalação                    /installation              Operação
Acompanhamento de Clientes    /customer-tracking         Operação
Solicitações de Edição        /edit-requests             Gestão > Solicitações
Solicitações de Agendamento   /schedule-deletion-requests Gestão > Solicitações
Vendas Segsale                /segsale-sales             Gestão > Segsale
Busca Segsale                 /segsale-search            Gestão > Segsale
Pendências Segsale            /frota-pendentes           Gestão > Segsale
Diagnóstico de Vendas         /pending-sales-recovery    Gestão > Segsale
Monitoramento de APIs         /api-monitoring            Gestão > Monitoramento
Status Unidades Frota         /frota-unit-status         Gestão > Monitoramento
Ativação de Unidades          /frota-unit-activation     Gestão > Monitoramento
Usuários                      /users                     Gestão > Administração
Técnicos                      /technicians               Gestão > Administração
Controle de Mensagens         /whatsapp-control          Gestão > Administração
Histórico                     /history                   Gestão > Administração
Simulador                     /kickoff/simulador         Ferramentas
Verificação de Placa          /plate-verification        Ferramentas
```
29 itens antes, 29 depois. Nenhuma rota, tela ou permissão muda. Único ajuste de texto: "Diagnóstico Vendas Pendentes" passa a "Diagnóstico de Vendas", como no documento (a rota continua a mesma).

## O que será feito

1. **Config declarativa** em `src/config/navigation.ts`: seções → (itens | grupos → itens), cada item com rótulo, ícone, rota, módulo(s), `adminOnly`, badge. Mantém exatamente as regras de acesso de hoje.
2. **Filtro único** reaproveitando `canAccessItem` atual (sem regra nova): item → grupo vazio some → seção vazia some.
3. **Renderização genérica** (um componente para item, um para grupo) no lugar dos blocos copiados.
4. **Abrir/recolher:** grupos de Operação abertos por padrão, grupos de Gestão recolhidos; grupo com a rota ativa sempre abre; estado salvo no navegador por usuário (`nav-groups:<userId>`).
5. **Visual:** rótulos de seção pequenos, maiúsculos e esmaecidos; itens com ícone próprio e altura uniforme; ativo preenchido na cor de destaque; chevron com rotação suave; cabeçalho "Menu" e rodapé (e-mail, papel, Sair) fixos, só a lista rola; rótulos longos quebram sem estourar. Mantém tokens azul-marinho.
6. **Modo ícones** (já existente, colapsável) com dica ao passar o mouse; no celular continua a gaveta do shadcn, com fechamento automático ao navegar.

## Verificação
Build OK, capturas do menu em desktop e celular, conferência da lista acima contra a config.
