---
title: Telemetry ingestion endpoint
type: AFK
layer: API
---

## What to build

Implement `POST /v1/devices/{id}/telemetry`. Accepts a JSON array of readings, validates ownership of the target device, delegates to `deviceRepository.ingestTelemetry`, and returns a confirmation response. This is the only write path into `telemetry_readings`.

## Acceptance criteria

- [ ] `POST /v1/devices/{id}/telemetry` accepts `{ readings: [{ metric, value, unit, recorded_at }] }` and returns HTTP 202
- [ ] Returns HTTP 404 if the device does not exist or is not owned by the authenticated user
- [ ] Returns HTTP 400 if `readings` is empty or malformed
- [ ] Route is declared in `infra/template.yaml` and dispatched in `src/handlers/router.ts`
- [ ] After a successful call, the device's `last_seen_at` and `status` reflect the ingested batch (verified via `GET /v1/devices/{id}`)
- [ ] Integration test covers happy path and ownership rejection

## Blocked by

- [04 — Device repository — telemetry ingestion](./04-device-repository-telemetry-ingestion.md)
- [06 — Device CRUD endpoints](./06-device-crud-endpoints.md) (needs device to exist first)
