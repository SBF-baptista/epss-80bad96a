
# Plano: Corrigir Acesso RLS para Novos Usuários com Permissões Granulares

## Problema Identificado

O usuário `matheus.nunes@segsat.com` não consegue visualizar os cards de homologação porque:

1. **Sistema de Permissões Desatualizado**: As políticas RLS (Row Level Security) ainda usam roles antigos como `operador_homologacao`, `operador_kickoff`, etc.
2. **Novo Sistema de Permissões**: O sistema foi atualizado para usar roles genéricos (`operador`, `gestor`, `admin`, `visualizador`) + permissões granulares por módulo na tabela `user_module_permissions`
3. **Incompatibilidade**: A função `has_role()` verifica apenas a tabela `user_roles`, mas não verifica a tabela `user_module_permissions` onde as permissões granulares estão armazenadas

**Situação do usuário:**
- Role na `user_roles`: `operador`
- Permissão em `user_module_permissions`: `homologation` com nível `approve`
- Política RLS verifica: `has_role(auth.uid(), 'operador_homologacao')` → **FALSO** (usuário tem `operador`, não `operador_homologacao`)

---

## Solução Proposta

Criar uma nova função `has_module_access()` que verifica as permissões granulares por módulo, e atualizar as políticas RLS das tabelas relevantes.

---

## Etapa 1: Criar Função de Verificação de Permissão por Módulo

Criar a função SQL que verifica:
1. Se o usuário é admin (acesso total)
2. Se o usuário tem permissão na tabela `user_module_permissions` para o módulo específico

```text
+-----------------------------------+
|       has_module_access()         |
+-----------------------------------+
| Parâmetros:                       |
|  - _user_id: uuid                 |
|  - _module: text (ex: 'homologation')|
|  - _min_permission: text (ex: 'view')|
+-----------------------------------+
| Lógica:                           |
|  1. Verifica se é admin → TRUE    |
|  2. Busca permissão do módulo     |
|  3. Compara nível mínimo          |
+-----------------------------------+
```

---

## Etapa 2: Atualizar Políticas RLS das Tabelas Afetadas

Tabelas que precisam de atualização:
- `homologation_cards`
- `incoming_vehicles`
- `accessories`
- `automation_rules_extended`
- `customers`
- `kit_schedules`

**Exemplo de mudança:**

Antes:
```
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'operador_homologacao')
)
```

Depois:
```
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gestor') OR
  has_module_access(auth.uid(), 'homologation', 'view')
)
```

---

## Etapa 3: Mapeamento de Módulos para Tabelas

| Tabela | Módulo de Permissão |
|--------|---------------------|
| `homologation_cards` | homologation |
| `incoming_vehicles` | kickoff |
| `accessories` | accessories_supplies |
| `automation_rules_extended` | homologation |
| `customers` | kickoff, scheduling |
| `kit_schedules` | scheduling |
| `homologation_kits` | kits |

---

## Arquivos a Modificar

1. **Migração SQL**: Criar nova migração com:
   - Função `has_module_access()`
   - Políticas RLS atualizadas para todas as tabelas afetadas

---

## Resultado Esperado

Após a implementação:
- Usuários com permissão `homologation: approve` poderão visualizar e gerenciar cards de homologação
- Não será mais necessário atribuir roles antigos como `operador_homologacao`
- O sistema de permissões granulares funcionará corretamente no nível do banco de dados
