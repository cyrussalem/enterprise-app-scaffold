# .claude

This folder stores AI collaboration context for the repository.

Current source-of-truth note:
- API Gateway route and Lambda integration are currently defined in `infra/template.yaml`.
- `openapi/openapi.yaml` exists, but it is not currently wired into SAM deployment.

Recommended files in this folder:
- `project-context.md`: Implemented scope and architecture facts.
- `decisions.md`: Architecture Decision Records (ADRs) and trade-offs.
- `session-notes.md`: Working notes during implementation.
- `prompts.md`: Reusable prompts for repeatable tasks.
- `checklists.md`: Definition of done, release checklist, testing checklist.

Keep entries short and update them when implementation changes.
