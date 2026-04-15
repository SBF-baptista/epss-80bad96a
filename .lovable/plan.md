

## Diagnostico: Permissoes de perfis nao refletidas na interface

### Causa raiz identificada

Dois problemas principais:

**1. Pagina de selecao de modulos filtra e esconde modulos acessiveis**
Em `ModuleSelection.tsx` (linha 174), apenas 6 modulos "primarios" sao exibidos:
```
const primaryModules = uniqueModules.filter(m => mainModules.includes(m.module));
```
Modulos como Dashboard, Kits, Pedidos, Tecnicos, Usuarios ficam **invisiveis** mesmo que o perfil do usuario tenha permissao para acessa-los. A secao de modulos secundarios foi removida (linha 269 tem um comentario vazio).

**2. Modulos exibidos no ModuleSelection nao incluem todos os que existem no sistema**
O array `modules` no ModuleSelection nao inclui "Pedidos" (`orders`) como card, mas o perfil "Gestor de operacoes" tem `orders: view`. O usuario tem permissao mas nao ve o modulo na tela inicial.

### Plano de correcao

**Arquivo 1: `src/pages/ModuleSelection.tsx`**
- Adicionar o modulo "Pedidos" ao array `modules` (esta faltando)
- Remover o filtro `primaryModules` e exibir TODOS os modulos que o usuario tem permissao para ver
- Organizar visualmente: modulos principais (com gradiente colorido) e modulos administrativos/secundarios (kits, tecnicos, usuarios, historico, dashboard) em grid separado com visual mais discreto
- Garantir que qualquer modulo presente no perfil de acesso apareca na tela

**Arquivo 2: `src/components/AppNavigation.tsx`**
- Verificar e garantir consistencia entre a sidebar e os modulos definidos no perfil
- Nenhuma mudanca estrutural necessaria (ja funciona corretamente via `canViewModule`)

### O que muda para o usuario
- Todos os modulos para os quais o perfil de acesso concede permissao aparecerao na tela de selecao de modulos
- Ex: "Gestor de operacoes" vera: Customer Tracking, Dashboard, Kanban, Orders, Planning, Scheduling, Technicians
- Ex: "Operador de Kickoff" vera: Kickoff + Acompanhamento de Clientes
- A sidebar continuara funcionando normalmente

### Resultado esperado
Qualquer modulo definido no JSON de permissoes do perfil de acesso com nivel diferente de "none" aparecera tanto na tela de selecao de modulos quanto na sidebar de navegacao.

