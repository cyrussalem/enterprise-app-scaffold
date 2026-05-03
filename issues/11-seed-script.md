---
title: Seed script — 50 devices + 7 days telemetry
type: HITL
layer: Data
---

## What to build

A standalone script (`scripts/seed.ts`) that populates the database with 50 simulated devices and 7 days of telemetry readings, all scoped to a configurable demo user. Ensures the platform looks fully populated from day one of a demo without real hardware.

**Open question (resolve before implementing):** Which fictional locations/geographies should the seed data use? The PRD leaves this unresolved. Pick 5 sites and confirm before the script is written.

## Acceptance criteria

- [ ] Script accepts a `DEMO_USER_ID` env var and scopes all created records to that user
- [ ] Creates 50 devices distributed across 5 device types (sensor, tracker, meter, actuator, gateway)
- [ ] Devices spread across 5 fictional locations with realistic lat/lng coordinates
- [ ] Status distribution: ~70% online, ~15% offline, ~15% warning
- [ ] Creates 7 days of telemetry readings per device (at least 4 readings/hour per device for plausible chart density)
- [ ] Script is idempotent — running it twice does not create duplicates (uses upsert or clears first)
- [ ] Script is runnable via `npm run seed` or `npx ts-node scripts/seed.ts`
- [ ] After running, `GET /v1/dashboard/summary` returns non-zero counts for the demo user

## Blocked by

- [06 — Device CRUD endpoints](./06-device-crud-endpoints.md)
- [07 — Telemetry ingestion endpoint](./07-telemetry-ingestion-endpoint.md)
- Geography decision (HITL: confirm 5 fictional locations before implementation)
