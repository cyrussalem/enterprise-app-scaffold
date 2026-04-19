# CLAUDE.md

Last updated: 2026-04-19

## Project Summary

Enterprise App Scaffold is a TypeScript REST API scaffold targeting AWS API Gateway + Lambda.
Implemented endpoints: GET /v1/health, GET /v1/users/me, POST /v1/auth/{signup,confirm,login,refresh}.

## Current Implementation Facts

- Lambda entrypoint: src/handlers/api.ts (single consolidated Lambda backs every route)
- Internal router: src/handlers/router.ts dispatches by (httpMethod, event.resource) to child handlers in src/handlers/{get-*,post-*}.ts
- Infrastructure source of truth: infra/template.yaml (single `apiFunction` with six `Events.Api` entries)
- API route wiring is currently SAM Events.Api (not OpenAPI-imported API Gateway definition)
- OpenAPI file exists at openapi/openapi.yaml but is not wired into SAM deployment yet
- Tests: Jest unit and local integration tests (SAM local start-api + integration suite)
- Consolidated-Lambda design doc: docs/backend/consolidated-lambda-design.md

## Commands

- Install: npm ci
- Build: npm run build
- Unit tests: npm run test:unit
- Local integration tests: npm run test:integration:local
- Package (requires ARTIFACT_BUCKET): npm run package:test
- Deploy test stack: npm run deploy:test

## Documentation Guardrails

- Keep README and docs aligned with what is implemented now.
- Do not claim OpenAPI-driven deployment until infra/template.yaml actually imports OpenAPI.
- If implementation changes, update README.md, docs/backend-design.md, and .claude/project-context.md together.
