# CLAUDE.md

Last updated: 2026-04-06

## Project Summary

Enterprise App Scaffold is a TypeScript REST API scaffold targeting AWS API Gateway + Lambda.
Current implemented endpoint is GET /v1/health.

## Current Implementation Facts

- Lambda handler: src/handlers/get-health.ts
- Infrastructure source of truth: infra/template.yaml
- API route wiring is currently SAM Events.Api (not OpenAPI-imported API Gateway definition)
- OpenAPI file exists at openapi/openapi.yaml but is not wired into SAM deployment yet
- Tests: Jest unit and local integration tests (SAM local start-api + integration suite)

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
