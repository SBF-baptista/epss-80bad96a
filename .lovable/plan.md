

## Diagnóstico de visibilidade de perfis — conta por conta

### Contas com problemas confirmados

| Conta | Role legado | Perfil atribuído | Problema |
|---|---|---|---|
| `installer@segsat.com` | `operador_homologacao` | nenhum | **Sem acesso a nada.** Role obsoleto e sem perfil/permissões. |
| `joao.morais@segsat.com` | `operador_homologacao` | nenhum | **Sem acesso a nada.** Idem acima. |
| `denis.silva@segsat.com` | `gestor` | nenhum | Funciona (gestor vê tudo via fallback), mas não tem perfil nominal — fica fora da governança. |
| `franciele.moura@segsat.com` | `operador` | nenhum | Vê Kanban / Pedidos / Dashboard só pela permissão legada. Sem perfil → futuras edições serão inconsistentes. |
| `breno.henrique@segsat.com` | `operador` | nenhum | Só vê Homologação (legado). Deveria estar em "Operador de Homologação". |
| `marcus.fernandes@segsat.com` | `operador` | nenhum | Idem Breno. |
| `cesar.santos`, `joao.gomes`, `mikael.jose`, `pilatos.santos` | `operador` | nenhum | Combinação manual `homologation+planning+scheduling`. Não há perfil correspondente → manter assim ou criar um perfil "Homologação + Planejamento". |
| `rodrigo.grimaldi`, `sebastiao.patrocinio` | `operador` | nenhum | Permissões legadas iguais a "Operador de Kickoff". Devem ser migrados para o perfil. |
| `pedro.nascimento@segsat.com` | `operador` | nenhum | Permissões legadas iguais a "Operador de logística" + scheduling:edit. Migrar para perfil + manter scheduling. |
| `kethellen.figueredo@segsat.com` | **admin** | nenhum | É admin, mas tem 9 permissões legadas configuradas. Como admin bypassa tudo, as permissões legadas são **lixo confuso** e contradizem o papel. |

### Inconsistência sistêmica encontrada

**21 usuários** com perfil de acesso ATIVO ainda têm permissões legadas em `user_module_permissions`. Hoje funciona (a função `has_module_access` usa OR entre as duas fontes), mas:

- Se você editar o perfil "Gestor de operações" e remover `scheduling`, todos os usuários do perfil vão **continuar** vendo Scheduling porque a permissão legada sobrevive.
- Cria a falsa sensação de que "mudei o perfil mas nada aconteceu" — exatamente o tipo de confusão que o sistema de perfis veio resolver.

### Inconsistência adicional na RLS

A tabela **`pedidos`** (Logística) e suas filhas (`veiculos`, `rastreadores`) usam policies antigas baseadas em `usuario_id = auth.uid()` ou no role obsoleto `operador_agendamento`. O perfil **"Operador de logística"** (Bruna, Cláudio, Diego) tem `orders:approve` na interface, mas no banco eles **só veem pedidos AUTO-% ou criados por eles mesmos**. Pedidos manuais criados por outros operadores ficam invisíveis. O mesmo vale para "Gestor de operações" com `orders:view`.

---

## Plano de correção

### 1. Atribuir perfil aos 2 usuários quebrados
- `installer@segsat.com` → perfil **"Operador de Homologação"**, role `operador`
- `joao.morais@segsat.com` → perfil **"Operador de Homologação"**, role `operador`

### 2. Migrar usuários "órfãos" (sem perfil mas com permissões legadas) para perfis nominais
- `breno.henrique`, `marcus.fernandes` → "Operador de Homologação"
- `rodrigo.grimaldi`, `sebastiao.patrocinio` → "Operador de Kickoff"
- `franciele.moura` → "Operador de logística"
- `pedro.nascimento` → "Operador de logística" (perde scheduling:edit; se necessário criamos perfil "Logística + Agendamento")
- `denis.silva` → manter como `gestor` (não precisa de perfil, já vê tudo)
- Os 4 com combinação `homologation+planning+scheduling` (cesar, joão.gomes, mikael, pilatos) → **decisão necessária** (ver pergunta abaixo)

### 3. Limpar permissões legadas redundantes
Para os 21 usuários que têm perfil + permissões legadas idênticas, deletar as entradas de `user_module_permissions`. Assim, o perfil passa a ser a única fonte da verdade. Inclui também limpar as 9 permissões legadas do admin `kethellen.figueredo`.

### 4. Corrigir RLS de Logística (`pedidos`, `veiculos`, `rastreadores`)
Adicionar policy de SELECT que respeita `has_module_access` para `orders`, `kanban`, `dashboard`, `customer_tracking` e `planning` — alinhando o banco com o que os perfis prometem na interface.

### 5. Documentar a regra
Salvar memória: "Permissões devem viver APENAS em `access_profiles`. `user_module_permissions` está deprecada para usuários com perfil."

---

## Pergunta antes de executar

<lov-actions>
<lov-suggestion message="Sobre os 4 usuários com combinação homologation+planning+scheduling (cesar.santos, joao.gomes, mikael.jose, pilatos.santos): crie um novo perfil de acesso 'Homologação + Planejamento' com essas três permissões e atribua a eles. Depois execute todo o plano de correção (etapas 1 a 5).">Criar perfil e executar tudo</lov-suggestion>
<lov-suggestion message="Mantenha esses 4 usuários (cesar, joao.gomes, mikael, pilatos) com permissões legadas individuais (sem perfil) e execute apenas as etapas 1, 2 (exceto eles), 3, 4 e 5 do plano.">Manter legado nesses 4 e executar resto</lov-suggestion>
<lov-suggestion message="Execute apenas as etapas 1 e 4 do plano (corrigir os 2 usuários quebrados e a RLS de Logística). Não mexa nas permissões legadas dos outros usuários por enquanto.">Só o crítico (etapas 1 e 4)</lov-suggestion>
<lov-suggestion message="Faça o teste completo: simule o perfil 'Gestor de operações', 'Operador de logística' e 'Operador de Kickoff' e me confirme página por página o que cada um enxerga.">Testar simulação dos perfis</lov-suggestion>
</lov-actions>I'll write the plan directly instead.

<lov-plan>

## Diagnóstico de visibilidade — conta por conta

### Contas QUEBRADAS (não enxergam nada)

| Conta | Role | Perfil | Problema |
|---|---|---|---|
| `installer@segsat.com` | `operador_homologacao` (obsoleto) | nenhum | Sem acesso a nada — role legado morto e sem perfil. |
| `joao.morais@segsat.com` | `operador_homologacao` (obsoleto) | nenhum | Idem acima. |

### Contas FUNCIONANDO POR LEGADO (sem perfil — frágil)

Funcionam hoje porque a função `has_module_access` ainda lê `user_module_permissions`, mas estão fora da governança de perfis:

- `breno.henrique`, `marcus.fernandes` → equivale a "Operador de Homologação"
- `rodrigo.grimaldi`, `sebastiao.patrocinio` → equivale a "Operador de Kickoff"
- `franciele.moura` → equivale a "Operador de Logística"
- `pedro.nascimento` → "Operador de Logística" + `scheduling:edit` (combinação única)
- `cesar.santos`, `joao.gomes`, `mikael.jose`, `pilatos.santos` → combinação `homologation+planning+scheduling` (não existe perfil correspondente)
- `denis.silva` → role `gestor` puro, sem perfil (ok, gestor enxerga tudo via fallback)

### Contas com REDUNDÂNCIA (perfil + permissões legadas duplicadas)

**21 usuários** têm perfil ATIVO **e** linhas em `user_module_permissions`. Hoje funciona, mas se você editar um perfil (ex: remover `scheduling` do "Gestor de operações") os usuários **continuarão vendo** o módulo porque a permissão legada sobrevive no OR. É exatamente o tipo de fantasma que o sistema de perfis veio resolver.

Inclui o admin `kethellen.figueredo@segsat.com` que tem 9 permissões legadas inúteis (admin já bypassa tudo).

### Inconsistência GRAVE de RLS — Logística

A tabela `pedidos` (e filhas `veiculos`, `rastreadores`) ainda usa policies antigas:
- `usuario_id = auth.uid()` ou `numero_pedido LIKE 'AUTO-%'`
- ou role obsoleto `operador_agendamento`

**Consequência prática:** o perfil "Operador de Logística" (Bruna, Cláudio, Diego) tem `orders:approve` e `kanban:approve` na tela, mas no banco **só vê pedidos AUTO-% ou criados por ele mesmo**. Pedidos manuais criados por outros operadores ficam invisíveis. Mesma coisa para "Gestor de operações" com `orders:view`. Isto é equivalente ao bug que acabamos de corrigir em `incoming_vehicles`, só que para Logística.

---

## Plano de correção (a executar após aprovação)

### Etapa 1 — Atribuir perfil aos 2 usuários quebrados
- `installer@segsat.com` → perfil **Operador de Homologação**, role `operador`
- `joao.morais@segsat.com` → perfil **Operador de Homologação**, role `operador`

### Etapa 2 — Migrar usuários órfãos para perfis nominais
| Conta | Perfil destino |
|---|---|
| `breno.henrique`, `marcus.fernandes` | Operador de Homologação |
| `rodrigo.grimaldi`, `sebastiao.patrocinio` | Operador de Kickoff |
| `franciele.moura` | Operador de Logística |
| `pedro.nascimento` | Operador de Logística (perde `scheduling:edit`) |
| `denis.silva` | manter como `gestor` puro, sem perfil |

Os 4 com combinação `homologation+planning+scheduling` (`cesar.santos`, `joao.gomes`, `mikael.jose`, `pilatos.santos`) — **veja pergunta abaixo**.

### Etapa 3 — Limpar permissões legadas redundantes
Deletar entradas em `user_module_permissions` para os 21 usuários que já têm perfil. O perfil passa a ser fonte única da verdade. Inclui zerar as 9 permissões inúteis do admin `kethellen.figueredo`.

### Etapa 4 — Corrigir RLS de Logística (CRÍTICO)
Migração SQL adicionando policy de SELECT em `pedidos`, `veiculos` e `rastreadores` que respeite `has_module_access` para `orders`, `kanban`, `dashboard`, `customer_tracking` e `planning` — espelhando o que já fizemos em `incoming_vehicles`.

```sql
CREATE POLICY "Users with operational view access can view pedidos"
ON public.pedidos FOR SELECT
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor')
  OR has_module_access(auth.uid(),'orders','view')
  OR has_module_access(auth.uid(),'kanban','view')
  OR has_module_access(auth.uid(),'dashboard','view')
  OR has_module_access(auth.uid(),'customer_tracking','view')
  OR has_module_access(auth.uid(),'planning','view')
);
-- equivalente para veiculos e rastreadores via EXISTS(pedidos)
```

### Etapa 5 — Documentar a regra
Memória: "Permissões devem viver apenas em `access_profiles.permissions`. `user_module_permissions` está deprecada para usuários com perfil — não criar novas linhas lá."

---

## Decisões necessárias

<lov-actions>
<lov-suggestion message="Sobre os 4 usuários com combinação homologation+planning+scheduling (cesar.santos, joao.gomes, mikael.jose, pilatos.santos): crie um novo perfil 'Homologação + Planejamento' com essas três permissões e atribua a eles. Depois execute todas as etapas (1 a 5) do plano de correção.">Criar novo perfil e executar tudo</lov-suggestion>
<lov-suggestion message="Mantenha os 4 usuários (cesar, joao.gomes, mikael, pilatos) com permissões legadas individuais. Execute as etapas 1, 2 (exceto esses 4), 3, 4 e 5 do plano.">Manter legado nesses 4, executar resto</lov-suggestion>
<lov-suggestion message="Execute apenas o crítico: etapa 1 (corrigir installer e joao.morais) e etapa 4 (corrigir RLS de pedidos/veiculos/rastreadores). Deixe a faxina de legados para depois.">Só o crítico (etapas 1 e 4)</lov-suggestion>
<lov-suggestion message="Antes de executar qualquer correção, ative a simulação para 'Operador de Logística' e 'Gestor de operações' e teste página por página, me confirmando o que aparece quebrado.">Testar simulação antes de corrigir</lov-suggestion>
</lov-actions>
