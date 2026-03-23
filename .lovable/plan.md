

# Diagnóstico: Requisições duplicadas de `user_roles` e `user_module_permissions`

## Causa Raiz

O hook `useUserRole()` faz queries diretas ao Supabase **cada vez que é instanciado**. Diferente do `useAuth()` que usa Context (1 fetch, N consumidores), cada componente que chama `useUserRole()` dispara suas próprias queries independentes.

Na rota `/kickoff`, estas instâncias estão ativas simultaneamente:

| Componente | Hook | Queries geradas |
|---|---|---|
| `RoleProtectedRoute` | `useUserRole()` | 1x user_roles + 1x user_module_permissions |
| `AppNavigation` | `useUserRole()` | 1x user_roles + 1x user_module_permissions |
| `AppNavigation` | `useEditRequestsCount()` | 1x item_edit_requests HEAD |
| `KickoffClientCard` (por card) | `useUserRole()` | 1x user_roles + 1x user_module_permissions |

Resultado: **5+ pares de queries idênticas** a cada navegação. E quando o realtime dispara um re-render (channel remove/create visível nos logs), o ciclo se repete.

Os logs confirmam: `[useUserRole] Source: LEGACY` aparece **5 vezes** em cada bloco de navegação.

## Solução: Converter `useUserRole` para Context Provider

Mesma arquitetura do `useAuth` — fetch uma vez, compartilhar via Context.

### 1. Criar `UserRoleProvider` + `useUserRole` via Context
**Arquivo**: `src/hooks/useUserRole.tsx`

- Criar `UserRoleContext` e `UserRoleProvider`
- O Provider faz o fetch UMA vez (quando `user` muda)
- `useUserRole()` passa a consumir o Context sem fazer queries
- Envolver no `App.tsx` dentro do `AuthProvider`

### 2. Envolver App com o Provider
**Arquivo**: `src/App.tsx`

- Adicionar `<UserRoleProvider>` dentro de `<AuthProvider>`

### 3. Nenhuma mudança nos consumidores
Todos os 22 arquivos que usam `useUserRole()` continuam funcionando sem alteração — a API do hook permanece idêntica.

## Resultado Esperado

```text
Antes:  5+ queries user_roles + 5+ queries user_module_permissions por navegação
Depois: 1 query user_roles + 1 query user_module_permissions por sessão/mudança de user
```

Redução de ~80% nas queries de permissão. O realtime churn do `item_edit_requests` também será avaliado para verificar se o channel remove/create está causando refetches desnecessários.

