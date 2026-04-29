## Diagnóstico

Existem **dois problemas distintos**, ambos causados pelo mesmo padrão arquitetural — e o fix beneficia **todas as páginas protegidas**, não só o Simulador.

### Problema 1 — Trocar de aba do navegador "dá refresh" na página de resultado

Quando você sai da aba do navegador e volta:

1. O Supabase Auth dispara automaticamente um evento `TOKEN_REFRESHED` (ou `SIGNED_IN`) ao reganhar foco para revalidar o JWT.
2. Em `src/hooks/useAuth.tsx` (linhas 71–82), o handler de `onAuthStateChange` chama `setUser(session?.user ?? null)` em **toda** chamada — mesmo quando o usuário é o mesmo. Isso cria uma **nova referência** do objeto `user`.
3. Em `src/hooks/useUserRole.tsx` (linha 150), o `useEffect` depende de `[user]`. Como a referência mudou, ele refaz toda a busca de roles e permissões, e durante a busca `loading=true`.
4. Em `src/components/RoleProtectedRoute.tsx`, enquanto `loading=true`, o componente renderiza `<FullScreenLoader message="Verificando permissões..." />` (confirmado no session replay: "Verificando permissões..." aparece exatamente quando você troca de aba).
5. Isso **desmonta** o `<KickoffSimulatorResult />`, perde o estado React (`useState payload`) e remonta. Na remontagem, ele lê do `sessionStorage` — funciona, mas visualmente parece um "refresh".

**Isso afeta todas as páginas envolvidas em `RoleProtectedRoute`**, não só o Simulador. Em outras páginas é menos perceptível porque os dados vêm do React Query em cache. No resultado da simulação, como o estado é local e há o flash do loader, o efeito é gritante.

### Problema 2 — Sair da página enquanto a planilha carrega perde tudo

Em `src/pages/KickoffSimulator.tsx`:

- O estado `file`, `rows`, `processing` e `progress` vivem dentro do componente (linhas 104–113).
- O loop de processamento (`handleSimulate`, linhas 182–236) só salva o resultado **no final** (linha 220 `simulatorService.save` e linha 227 `sessionStorage.setItem`).
- Se você navega para fora durante o processamento, o componente desmonta, o loop continua executando em memória mas os `setProgress`/`setProcessing` se perdem, e ao voltar a tela está zerada — você precisa subir a planilha de novo.

Agravante: quando você troca de aba do navegador, o mesmo mecanismo do Problema 1 desmonta a página de upload no meio do processamento.

---

## Plano de correção

### Fix A — Eliminar o "refresh" ao trocar de aba (resolve em todo o app)

Em `src/hooks/useAuth.tsx`:

- No handler `onAuthStateChange`, só chamar `setUser` / `setSession` quando `session?.user?.id` realmente mudar. Comparar com o estado anterior usando refs.
- Ignorar explicitamente o evento `TOKEN_REFRESHED` para fins de re-render (ainda mantemos a sessão atualizada internamente, mas sem trocar a referência de `user`).

Em `src/hooks/useUserRole.tsx`:

- Trocar a dependência do `useEffect` de `[user]` para `[user?.id]`. Assim, mesmo se `user` virar nova referência, o efeito não dispara enquanto o ID for o mesmo.
- Não setar `loading=true` quando já temos `role` carregado para o mesmo usuário (refetch silencioso).

Em `src/components/RoleProtectedRoute.tsx`:

- Não desmontar os filhos quando `loading=true` **se já temos uma `role` previamente carregada**. Mostra os filhos com a verificação anterior em vez de trocar para `<FullScreenLoader />`. Isso evita o flash de "Verificando permissões..." e a perda de estado das páginas.

### Fix B — Persistir o progresso do Simulador

Em `src/pages/KickoffSimulator.tsx`:

1. Persistir `file metadata`, `rows`, `detectedColumns`, `processing` e `progress` em `sessionStorage` durante todo o processo (não só no final). Chave dedicada: `kickoff-simulator-inprogress`.
2. Ao montar o componente, restaurar esse estado se existir.
3. Continuar a partir do índice `progress` em vez de recomeçar do zero (o array `results` parcial também é salvo).
4. Limpar a chave quando a simulação terminar com sucesso (e ao iniciar uma nova).

Observação: o `File` em si não pode ser serializado, mas as `rows` parseadas já são suficientes para retomar — não precisamos do arquivo original depois do parse.

### Fix C (preventivo) — ScrollToTop global

Adicionar um componente `<ScrollToTop />` dentro do `BrowserRouter` em `src/App.tsx` para resetar o scroll a cada navegação. Isso resolve um efeito colateral comum (manter posição de scroll antiga ao mudar de página) que se mistura com a percepção de "refresh".

---

## Detalhes técnicos

**Arquivos a modificar:**

```text
src/hooks/useAuth.tsx
  - Comparar user?.id antigo vs novo antes de setUser
  - Ignorar TOKEN_REFRESHED no re-render

src/hooks/useUserRole.tsx
  - useEffect dep: [user?.id]
  - loading=true só na primeira carga (lastUserId ref)

src/components/RoleProtectedRoute.tsx
  - Se loading && role já existe -> usar role atual em vez de FullScreenLoader

src/pages/KickoffSimulator.tsx
  - Persistir rows/progress/results parciais em sessionStorage durante handleSimulate
  - Restaurar no mount; retomar do índice salvo
  - Limpar chave ao concluir

src/components/ScrollToTop.tsx (novo)
src/App.tsx
  - Montar <ScrollToTop /> dentro do BrowserRouter
```

**Por que isso é seguro:** o real refresh de token continua acontecendo no Supabase client; só evitamos disparar re-renders desnecessários da árvore React. Permissões continuam sendo revalidadas quando o `user.id` muda (login/logout reais).

---

## Fora do escopo

- Não vou refatorar o React Query nem invalidations de outras páginas.
- Não vou mover o processamento para um Web Worker (out of scope; o ganho aqui é apenas evitar perda de estado).

Após aprovado, aplico os 5 ajustes acima de uma vez.