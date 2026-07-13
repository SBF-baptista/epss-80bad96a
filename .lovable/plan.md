## Objetivo
Aplicar responsividade completa (8 regras) em toda a aplicação, com foco especial em 6 telas prioritárias, e validar visualmente em 3 breakpoints (375px, 768px, 1440px).

## Estratégia
Executar em uma única passada, na ordem: **fundação global → componente base de modais → telas prioritárias → validação Playwright**. Isso evita retrabalho (ex.: se eu alterar o Dialog base depois das telas, teria que revalidar tudo).

---

## Fase 1 — Fundação global (Regras 5, 6, 7, 8)

### 1.1 Tipografia fluida (Regra 6)
- `src/index.css`: adicionar utility classes com `clamp()` para escalas de título (`.text-fluid-h1`, `.text-fluid-h2`, `.text-fluid-body`) e/ou tokens em `tailwind.config.ts`.
- Aplicar em títulos de página das telas prioritárias (não fazer varredura global cega para evitar regressão).

### 1.2 Área de toque mínima (Regra 5)
- `src/index.css`: adicionar classe `.touch-target` (min-h/w 44px + padding interno) e uma media query global que garante 44×44 em botões-ícone `<640px`.
- Aplicar em `IconButton`/`Button size="icon"` via variant `sm-mobile` no shadcn Button.

### 1.3 Sem scroll horizontal (Regra 7)
- `src/index.css`: `html, body { overflow-x: hidden; }` + auditar containers `.container` para `max-w-full` no mobile.
- Adicionar `overflow-x-auto` em faixas de chips/filtros existentes que hoje estouram.

### 1.4 Menu principal → hambúrguer com Sheet (Regra 8)
- Auditar `src/components/AppNavigation.tsx` e `src/components/Layout.tsx`.
- No mobile (`<1024px`): esconder a nav horizontal e mostrar botão hambúrguer no header que abre um `<Sheet side="left">` com os mesmos módulos e links.
- Preservar 100% da lógica de permissões e rotas ativas atuais.

---

## Fase 2 — Componente base de modais (Regra 2)

Override em `src/components/ui/dialog.tsx`:
- `DialogContent` recebe classes responsivas: `max-sm:!inset-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!top-0 max-sm:!left-0 max-sm:!w-screen max-sm:!h-screen max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-0`.
- Estrutura interna: `DialogHeader` sticky top, corpo `overflow-y-auto flex-1`, `DialogFooter` sticky bottom no mobile.
- Aplicar o mesmo padrão em `src/components/ui/sheet.tsx` quando usado como modal, e em `src/components/ui/alert-dialog.tsx`.

Isso resolve automaticamente **todos** os Dialogs do app (não só os 3 listados) — inclusive futuras telas.

---

## Fase 3 — Telas prioritárias (Regras 1, 3, 4)

### 3.1 Popup "Itens parados no processo"
Arquivo: `src/components/alerts/StalledAlertsPopup.tsx` + `StalledAlertsList.tsx`
- Confirmar herança do Dialog fullscreen no mobile.
- Grupos por severidade: cards passam a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Cabeçalho fixo com contador; conteúdo scroll interno.

### 3.2 Banner de alerta no topo da home
Arquivo: `src/components/alerts/StalledAlertsBanner.tsx`
- Empilhar ícone + texto + botão em coluna no mobile.
- Botão "Ver detalhes" ocupa largura total no mobile.
- `text-fluid-body` para o texto.

### 3.3 "Hierarquia de Equipes" (Regra 1)
Arquivo: `src/components/user-management/TeamsTab.tsx`
- Grid de regionais: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.
- Cards internos: remover `min-w` fixas; permitir wrap de nomes longos.

### 3.4 Modal "Editar equipe"
Arquivo: `src/components/user-management/TeamModal.tsx`
- Herda Dialog fullscreen; garantir footer sticky com Salvar/Cancelar.

### 3.5 Modal "Editar Perfil de Acesso" (Regra 3)
Arquivo: `src/components/user-management/EditAccessProfileModal.tsx` + `PermissionMatrix.tsx`
- Tabs "Kickoff / Homologação / Planejamento / Suprimentos / Administração": envolver `TabsList` em wrapper `overflow-x-auto scrollbar-thin` com `whitespace-nowrap` nas tabs. Sem `flex-wrap`.
- Matriz de permissões: no mobile, reorganizar em blocos empilhados (módulo em cima, chips de permissão abaixo) em vez de grid 5 colunas.

### 3.6 "Solicitações de agendamento" (Regra 4)
Arquivo: `src/pages/ScheduleDeletionRequests.tsx`
- Tabela vira **card list** no mobile: `<table className="hidden md:table">` + `<div className="md:hidden space-y-3">` renderizando cada linha como card empilhado (nome + badges + ações abaixo).

---

## Fase 4 — Validação Playwright

Script `/tmp/browser/responsive/test.py`:
- Autenticar via `LOVABLE_BROWSER_SUPABASE_*`.
- Para cada tela prioritária, capturar screenshot em 3 viewports (375×812, 768×1024, 1440×900).
- Salvar em `/tmp/browser/responsive/screenshots/{tela}_{width}.png`.
- Verificar `document.documentElement.scrollWidth <= innerWidth` em cada tela (Regra 7).
- Reportar tela por tela: OK, ou lista de problemas remanescentes com screenshot.

---

## Detalhes técnicos

**Não altero:**
- Paleta de cores, tokens semânticos existentes
- Ícones e textos
- Lógica de permissões, RLS, edge functions
- Comportamento desktop atual

**Breakpoints Tailwind usados:**
- `sm:` 640px (limite mobile)
- `md:` 768px (tablet)
- `lg:` 1024px (desktop)

**Riscos e mitigação:**
- Override do Dialog base pode afetar modais que já customizam `className`. Mitigar usando `max-sm:` (só ativa <640px) e `!important` cirúrgico apenas em posicionamento.
- Sidebar hambúrguer: se `AppNavigation` for muito acoplado ao Layout, faço wrapper novo em vez de refactor invasivo.
- Playwright pode não ter session válida (`LOVABLE_BROWSER_AUTH_STATUS`); se signed_out, testo apenas rotas públicas e reporto.

## Entregável
- Fundação global aplicada.
- Dialog/Sheet/AlertDialog fullscreen no mobile por padrão.
- 6 telas prioritárias revisadas.
- Pasta `/tmp/browser/responsive/screenshots/` com evidência visual em 3 breakpoints.
- Relatório final listando cada tela: OK ou pendências.