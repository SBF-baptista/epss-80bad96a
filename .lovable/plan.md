
## Diagnóstico (o que está quebrando agora)
A RPC `public.get_app_logs_admin(...)` ainda está falhando no Postgres, então a tela `/history` cai no estado **“Erro ao Carregar Histórico”**.

Eu consegui reproduzir o erro diretamente via SQL e o Postgres retornou:

- **ERROR 42804**: *structure of query does not match function result type*
- Detalhe: **“Returned type character varying does not match expected type text in column 4.”**
- Contexto: coluna 4 é `user_email`

Causa raiz:
- A função declara `user_email TEXT` no `RETURNS TABLE`.
- Mas o `SELECT` retorna `COALESCE(u.email, 'Sistema')`, onde `auth.users.email` é **varchar (character varying)**.
- O Postgres exige que o tipo retornado bata exatamente com o tipo declarado no `RETURNS TABLE`.

Ou seja: não é (mais) permissão nem assinatura ambígua; é **mismatch de tipo no retorno**.

---

## Objetivo do ajuste
Corrigir a função `get_app_logs_admin` para que o `SELECT` retorne exatamente os tipos declarados (principalmente `user_email` como TEXT), sem alterar o contrato da tela.

---

## Plano de implementação (DB)
1. **Criar uma nova migration** substituindo a função `public.get_app_logs_admin(...)` por uma versão com cast explícito:
   - Trocar:
     - `COALESCE(u.email, 'Sistema') as user_email`
   - Por:
     - `COALESCE(u.email::text, 'Sistema'::text)::text as user_email`

2. **Manter o restante da função igual**, para reduzir risco:
   - Mesma assinatura: `(p_module text default null, p_action text default null, p_start_date timestamptz default null, p_end_date timestamptz default null)`
   - Mesmo `SECURITY DEFINER`, `SET search_path = public`, `ORDER BY created_at desc`, `LIMIT 1000`

3. **Garantir permissões (sem mudanças grandes)**
   - Manter o `GRANT EXECUTE ... TO authenticated` que já foi aplicado.
   - Manter `REVOKE ... FROM anon` (boa prática para não expor auditoria).

---

## Plano de validação (rápido e objetivo)
1. **Validação no banco (SQL)**
   - Rodar:
     - `select id, created_at, user_email, action, module from public.get_app_logs_admin(null,null,null,null) limit 5;`
   - Esperado: retorna linhas sem erro.

2. **Validação na UI**
   - Entrar como usuário **admin**
   - Abrir `/history`
   - Esperado: lista carregar normalmente (mesmo que vazia, deve mostrar “Nenhum registro encontrado”, não erro).

3. **Checagem de regressão**
   - Testar filtros por módulo/ação e intervalo de datas, garantindo que a query ainda funciona.

---

## Observações técnicas (para evitar voltar o erro)
- Quando uma função declara `RETURNS TABLE (...)`, **cada coluna do `SELECT` precisa bater exatamente** (tipo e ordem).
- `auth.users.email` costuma ser `varchar`, então sempre que a função declarar `TEXT`, precisamos fazer cast explícito (`::text`) ao compor `COALESCE`.

---

## Escopo do que NÃO vou mudar neste ajuste (para manter seguro)
- Não vou alterar a tela `History.tsx` agora (ela está correta ao chamar a RPC).
- Não vou reintroduzir a versão de 10 parâmetros da RPC (evita voltar ambiguidade).
- Não vou alterar RLS/Policies da tabela `app_logs` (a RPC é `SECURITY DEFINER` e esse problema atual é estritamente tipagem do retorno).
