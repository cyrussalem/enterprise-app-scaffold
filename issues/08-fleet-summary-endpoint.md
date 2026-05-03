---
title: Fleet summary endpoint
type: AFK
layer: API
---

## What to build

Implement `GET /v1/dashboard/summary`. Returns a single aggregation payload consumed by every widget on the fleet overview dashboard. Running one aggregation query here avoids N+1 fetching in the frontend.

## Acceptance criteria

- [ ] `GET /v1/dashboard/summary` returns HTTP 200 with `{ total, online, offline, warning, byType, healthScore }`
- [ ] All counts are scoped to the authenticated user's devices
- [ ] Route is declared in `infra/template.yaml` and dispatched in `src/handlers/router.ts`
- [ ] Integration test asserts correct counts given a known set of seeded devices

## Blocked by

- [05 — Device repository — fleet summary aggregation](./05-device-repository-fleet-summary.md)
