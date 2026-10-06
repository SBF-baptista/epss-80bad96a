# Architecture rules

- Keep the production kanban at `/kanban` and protect `/expedition` with the same existing `kanban` module; this preserves links and access without introducing a new permission module.
- Keep the existing logistics dashboard at `/dashboard`; navigation-only changes must not remove its existing content.