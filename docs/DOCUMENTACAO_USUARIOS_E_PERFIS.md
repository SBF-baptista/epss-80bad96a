# Documentação — Usuários e Perfis de Acesso (OPMSS)

Última atualização: agosto/2026

Este documento explica, de ponta a ponta, como funciona o controle de usuários e de
permissões dentro da aplicação: onde os dados ficam, como o acesso é calculado, como
as telas se comportam e quais são as regras de negócio envolvidas.

---

## 1. Visão geral em uma frase

Cada usuário tem **uma conta de login** (Supabase Auth), **um papel base** (`role`) e,
normalmente, **um Perfil de Acesso** — e é o Perfil de Acesso que define, módulo a
módulo, o que a pessoa pode ver, editar ou aprovar.

```
Usuário (auth.users)
   └── user_roles  (role base + access_profile_id)
            └── access_profiles (permissions: { modulo: nivel })
                        └── Telas / rotas / botões liberados
```

---

## 2. Conceitos

### 2.1 Papel base (Base Role)

Definido em `user_roles.role` e também em `access_profiles.base_role`.

| Papel | Rótulo na tela | O que significa |
|---|---|---|
| `admin` | Administrador | Acesso total, ignora qualquer checagem de módulo |
| `gestor` | Gestor | Perfil de gestão; ainda depende das permissões por módulo |
| `operador` | Operador | Perfil operacional; depende das permissões por módulo |
| `visualizador` | Visualizador | Somente leitura, depende das permissões por módulo |

Papéis antigos (`operador_kickoff`, `operador_homologacao`, `operador_agendamento`,
`operador_suprimentos`) ainda existem no banco por compatibilidade e são **normalizados
para `operador`** na aplicação (função `mapRawRole`).

> **Regra absoluta:** quem é `admin` passa por todas as travas. Nenhuma checagem de
> módulo, rota ou botão bloqueia um administrador.

### 2.2 Níveis de permissão por módulo

Cada módulo recebe um dos cinco níveis (`permission_level`):

| Nível | Pode ver | Pode editar/criar | Pode aprovar | Observação |
|---|:--:|:--:|:--:|---|
| `none` | ❌ | ❌ | ❌ | Módulo nem aparece no menu |
| `view` | ✅ | ❌ | ❌ | Botões de criar/editar/excluir ficam ocultos |
| `edit` | ✅ | ✅ | ❌ | Operação do dia a dia |
| `approve` | ✅ | ✅ | ✅ | Aprovar implica editar |
| `admin` | ✅ | ✅ | ✅ | Controle total daquele módulo |

Os níveis são **cumulativos**: `approve` já inclui `edit`, que já inclui `view`.

### 2.3 Módulos disponíveis

Os módulos são o enum `app_module` no banco e o tipo `AppModule` no front
(`src/types/permissions.ts`). Hoje são 26:

`kickoff`, `kickoff_simulator`, `kickoff_bypass`, `customer_tracking`, `homologation`,
`kits`, `accessories_supplies`, `planning`, `scheduling`, `kanban`, `orders`,
`dashboard`, `technicians`, `users`, `schedule_deletion_approval`, `history`,
`edit_requests`, `installation`, `api_monitoring`, `plate_verification`,
`frota_pendentes`, `segsale_sales`, `segsale_search`, `whatsapp_control`,
`configuration`, `chamados`.

Na tela de Perfis de Acesso eles aparecem agrupados por área (Kickoff, Homologação,
Planejamento, Suprimentos) e cada módulo traz uma descrição do que cada nível libera.

### 2.4 Perfil de Acesso

É um "molde" de permissões reutilizável, guardado em `access_profiles`:

- `name` / `description`
- `base_role` — o papel base que o usuário herda ao receber o perfil
- `permissions` — um JSON `{ "kickoff": "edit", "scheduling": "approve", ... }`

Um perfil pode ser aplicado a vários usuários. Alterar o perfil altera o acesso de
todos que o utilizam. Perfis em uso **não podem ser excluídos** (o sistema bloqueia com
a mensagem "Este perfil está em uso e não pode ser excluído").

**Perfis existentes hoje** (e quantidade de usuários):

| Perfil | Papel base | Usuários |
|---|---|---:|
| Operador de Kickoff | operador | 9 |
| Gestor de operações | operador | 6 |
| Operador de Kickoff + Agendamento + Homologação | operador | 4 |
| Operador de logística | operador | 4 |
| Operador de Planejamento | operador | 3 |
| Gestor de Kickoff | operador | 1 |
| Gestor de produtos | operador | 1 |
| Operador de Homologação | operador | 1 |
| Gerente / Gestor homologação / Operador de Agendamento | operador | 0 |

Toda alteração em um perfil é registrada em `access_profile_history` (quem mudou, o
que mudou, valores antes/depois). Esse histórico não pode ser editado nem apagado.

---

## 3. Como o acesso é calculado (passo a passo)

Toda a lógica vive no provider `useUserRole` (`src/hooks/useUserRole.tsx`), que roda
assim que o usuário loga:

1. **Busca as linhas em `user_roles`** do usuário (role + access_profile_id).
2. Calcula um `fallbackRole` pegando o **maior papel** entre as linhas
   (visualizador < operador < gestor < admin).
3. Se houver `access_profile_id`, busca os perfis em `access_profiles` e extrai:
   - o `base_role` mais alto entre eles;
   - o nome do perfil (exibido na interface);
   - o mapa de permissões (`permissions`), ignorando tudo que estiver como `none`.
4. **Papel final:** se a linha em `user_roles` diz `admin`, vence `admin`; caso
   contrário vence o `base_role` do perfil; se não houver perfil, usa o `fallbackRole`.
5. Também lê `user_module_permissions` (tabela legada) e, quando há sobreposição,
   **mantém sempre o nível mais alto** entre perfil e permissão individual.
6. Regra especial: em `homologation`, o nível `approve` é promovido para `admin`.

> **Fonte da verdade:** o padrão atual é `access_profiles.permissions`.
> `user_module_permissions` é legado, mantido só para não quebrar acessos antigos.

O provider expõe os helpers usados em toda a aplicação:
`getModulePermission`, `canViewModule`, `canEditModule`, `canApproveModule`,
`canManageModule`, `isAdmin`, `isGestor`, `hasRole`, `hasAnyRole`.

### 3.1 Onde o acesso é aplicado

| Camada | Arquivo | O que faz |
|---|---|---|
| Menu lateral | `permissionsService.getNavigationItems` | Só monta os itens dos módulos visíveis |
| Rotas | `RoleProtectedRoute` | Bloqueia a rota e redireciona para `/modules` |
| Rota → módulo | `ROUTE_TO_MODULE` | Mapeia `/chamados` → `chamados`, `/config` → `scheduling`, etc. |
| Dentro da tela | `canEditModule(...)` | Esconde botões de criar/editar/excluir |
| Banco (RLS) | funções `has_module_access`, `can_view_module`, `can_edit_module`, `can_approve_module`, `has_role` | Impedem leitura/escrita indevida mesmo fora da UI |

Ou seja: **a trava existe em duas camadas** — visual (React) e de banco (RLS). Esconder
o botão não é a segurança; a segurança está nas policies.

### 3.2 Modo de simulação (impersonation)

Um administrador pode "ver o sistema como" outro perfil (`startImpersonation`). Nesse
modo a interface passa a usar as permissões simuladas, mas o administrador real nunca
fica preso: as rotas continuam acessíveis para ele e `stopImpersonation` volta ao
estado normal. É uma ferramenta de conferência, não altera nada no banco.

---

## 4. Tela de Usuários (`/users`)

A página tem duas abas lado a lado: **Usuários** e **Perfis de Acesso**.

### 4.1 Aba Usuários

- **Indicadores** no topo: total de usuários, ativos, banidos, pendentes de ativação.
- **Filtros**: busca por e-mail, status e papel.
- **Lista** com e-mail, perfil de acesso, papel, status e último acesso.
- Ações por usuário:

| Ação | Efeito |
|---|---|
| Criar usuário | Cria a conta, gera senha temporária e marca `must_change_password` |
| Editar | Troca papel base e/ou perfil de acesso |
| Resetar acesso | Marca `must_change_password: true` — a pessoa define nova senha no próximo login |
| Resetar senha | Gera uma senha temporária nova e devolve na tela |
| Banir / desbanir | Bloqueia ou libera o login sem apagar o histórico |
| Excluir | Limpeza em cascata das tabelas dependentes e depois remoção da conta |
| Ações em lote | Aplica banir/desbanir/excluir a vários selecionados |

Todas essas operações passam pela edge function **`manage-users`**, que usa a chave de
serviço no servidor. O front nunca fala direto com `auth.users`.

### 4.2 Aba Perfis de Acesso

- Lista dos perfis com nome, descrição, papel base e quantidade de módulos liberados.
- Criar / editar abre a **matriz de permissões**: todos os módulos agrupados por área,
  com os cinco níveis e a explicação do que cada nível libera naquele módulo.
- Excluir só é permitido se nenhum usuário estiver usando o perfil.
- Cada gravação alimenta o histórico em `access_profile_history`.

---

## 5. Ciclo de vida de um usuário

1. **Criação** — administrador informa e-mail, papel base e perfil de acesso. A função
   `manage-users` cria a conta com senha temporária e `must_change_password: true`.
2. **Primeiro acesso** — a tela de login chama `check-email`; se o usuário estiver
   pendente, ele é levado ao fluxo de definição de senha (`setup-password`), que grava
   a nova senha e zera a flag.
3. **Uso normal** — a cada login o `useUserRole` recalcula papel e permissões.
4. **Mudança de função** — basta trocar o perfil de acesso; as permissões seguem o
   perfil automaticamente (existe trigger de sincronização no banco).
5. **Saída** — banir (reversível) ou excluir (definitivo, com limpeza em cascata).

### 5.1 Regras de senha e e-mail

- Senha mínima: **8 caracteres, com letra maiúscula, número e caractere especial**.
- Confirmação de e-mail e 2FA estão **desativados** (limite do SMTP).
- Recuperação de senha tem proteção anti-flood (bloqueios de 60s/180s) e é bloqueada
  para quem ainda está pendente de ativação — nesse caso o caminho é o primeiro acesso.
- O logout é tolerante a sessão expirada (tratado com try/catch) para nunca travar a tela.

---

## 6. Permissões especiais (fora do sistema de módulos)

Algumas ações críticas usam **listas de liberação por e-mail**, independentes do perfil:

| Recurso | Tabela | Quem controla |
|---|---|---|
| "Pular para Agendamento" (bypass do Kickoff) e sua auditoria | `kickoff_bypass_allowed_users` | Administrador |
| Ativação/desativação de unidades na Frota/Auto | `unit_activation_allowed_users` | Administrador |

São verificadas pelos hooks `useKickoffBypassPermission` e `useUnitActivationPermission`.
Toda execução exige justificativa e fica registrada em tabelas de auditoria.

---

## 7. Tabelas envolvidas

| Tabela | Papel |
|---|---|
| `auth.users` | Contas de login (gerenciada pelo Supabase) |
| `usuarios` | Espelho de e-mail/id no schema público |
| `user_roles` | Papel base + vínculo com o perfil de acesso |
| `access_profiles` | Perfis com o mapa de permissões por módulo |
| `access_profile_history` | Auditoria imutável das mudanças de perfil |
| `user_module_permissions` | Permissões individuais (legado, sincronizado por trigger) |
| `user_last_seen` | Último acesso, atualizado com intervalo de 5 minutos |
| `app_logs` | Trilha de auditoria de criação/edição/exclusão de usuários |
| `kickoff_bypass_allowed_users` / `unit_activation_allowed_users` | Liberações pontuais por e-mail |

Funções de banco usadas nas policies: `has_role`, `get_user_role`,
`get_module_permission`, `has_module_access`, `can_view_module`, `can_edit_module`,
`can_approve_module`, `sync_user_permissions_from_profile`.

---

## 8. Perguntas frequentes

**Criei um perfil e o usuário não vê o módulo.**
Confirme se o nível está diferente de `none` e peça para o usuário sair e entrar de
novo (as permissões são carregadas no login).

**O usuário vê a tela mas não consegue salvar.**
O nível está em `view`. Suba para `edit`.

**Dois perfis no mesmo usuário — qual vale?**
Vale sempre o **maior** papel e o **maior** nível por módulo.

**Administrador precisa de perfil?**
Não. O papel `admin` em `user_roles` já libera tudo.

**Como saber quem mudou uma permissão?**
`access_profile_history` (mudanças de perfil) e `app_logs` (ações sobre usuários).
