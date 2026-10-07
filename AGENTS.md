# Architecture rules

- Keep the production kanban at `/kanban` and protect `/expedition` with the same existing `kanban` module; this preserves links and access without introducing a new permission module.
- Keep the existing logistics dashboard at `/dashboard`; navigation-only changes must not remove its existing content.
- Persist production counting and final verification per kit schedule; each vehicle advances independently and only through validated workflow actions.
- Define sidebar menu sections, groups and items declaratively in `src/config/navigation.ts`; `AppNavigation` only filters them with the existing per-screen access rules, so regrouping never touches routes or permissions.
