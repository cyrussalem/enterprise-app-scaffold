# CLAUDE.md

Last updated: 2026-05-02

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
- Before starting integration tests: aws login
- Local integration tests:
    - aws login
    - npm run pretest:integration:local
    - npm run test:integration:local
    - npm run posttest:integration:local
- Stop SAM lambda containers: npm run sam:local:stop
- Package (requires ARTIFACT_BUCKET): npm run package:test
- Deploy test stack: npm run deploy:test

## Manual UI Testing with Playwright MCP

Before starting any manual UI or API verification session, the full local stack must be running. Start everything in this order — each step must complete successfully before the next:

1. **Bring up backing services and seed data**
   ```
   npm run dev:up
   ```
   This runs `integration:up` (starts Postgres + Cognito containers via Docker Compose and waits for them to be healthy), then builds the TypeScript source, then seeds the database with test fixtures.

2. **Start the API (SAM local)**
   In a separate terminal (this process stays running):
   ```
   npm run dev:api
   ```
   This starts `sam local start-api` on `http://localhost:3000`. Wait until you see `Running on http://127.0.0.1:3000` in its output before proceeding.

3. **Start the frontend dev server**
   In another separate terminal (this process stays running):
   ```
   npm run dev:web
   ```
   This starts the web app (Vite). Note the URL it prints (typically `http://localhost:5173`) — that is the address to use in browser-based tests.

Once all three are running, use the Playwright MCP tools to verify UI flows:

- Use `mcp__playwright__browser_navigate` to open the app URL.
- Use `mcp__playwright__browser_snapshot` to inspect the rendered DOM and confirm the page loaded correctly.
- Use `mcp__playwright__browser_take_screenshot` to visually verify layout.
- Use `mcp__playwright__browser_fill_form`, `mcp__playwright__browser_click`, and `mcp__playwright__browser_press_key` to drive user interactions (e.g. login, registration).
- Use `mcp__playwright__browser_network_requests` to confirm the frontend is calling the correct API endpoints and receiving expected status codes.
- Use `mcp__playwright__browser_console_messages` to catch any JS errors or unexpected warnings during a flow.

**Teardown after testing:**
```
npm run dev:down
```
This stops Docker Compose services and runs `sam:local:stop` to remove any lingering Lambda containers. Terminate the `dev:api` and `dev:web` terminal processes manually.

## Documentation Guardrails

- Keep README and docs aligned with what is implemented now.
- Do not claim OpenAPI-driven deployment until infra/template.yaml actually imports OpenAPI.
- If implementation changes, update README.md, docs/backend-design.md, and .claude/project-context.md together.
