# Decisions

## 2026-04-06: Keep infra as deployment source of truth for now

Status: Accepted

- API Gateway route/integration are managed in infra/template.yaml.
- OpenAPI remains a contract artifact until deployment wiring is implemented.

Reason:
- Reflects the actual behavior of the current SAM template.
- Avoids documentation drift.
