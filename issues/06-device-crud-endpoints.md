---
title: Device CRUD API endpoints
type: AFK
layer: API
---

## What to build

Wire five new device endpoints into the consolidated Lambda router and SAM template. All routes sit behind the existing Cognito authorizer. Controllers delegate entirely to the device repository — no direct Sequelize usage.

Routes:
- `GET /v1/devices`
- `GET /v1/devices/{id}`
- `POST /v1/devices`
- `PATCH /v1/devices/{id}`
- `DELETE /v1/devices/{id}`

## Acceptance criteria

- [ ] `GET /v1/devices` returns the authenticated user's device list (HTTP 200)
- [ ] `GET /v1/devices/{id}` returns a single device or HTTP 404 if not found / not owned by caller
- [ ] `POST /v1/devices` creates a device scoped to the authenticated user; returns HTTP 201 with the created resource
- [ ] `PATCH /v1/devices/{id}` applies a partial update; returns HTTP 200; enforces ownership
- [ ] `DELETE /v1/devices/{id}` removes the device; returns HTTP 204; enforces ownership
- [ ] All five routes are declared as `Events.Api` entries in `infra/template.yaml`
- [ ] All five routes are dispatched in `src/handlers/router.ts`
- [ ] `npm run test:integration:local` covers at least one happy-path case per endpoint

## Blocked by

- [03 — Device repository — CRUD + ownership scoping](./03-device-repository-crud.md)
