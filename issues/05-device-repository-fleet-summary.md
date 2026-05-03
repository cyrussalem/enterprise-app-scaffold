---
title: Device repository — fleet summary aggregation
type: AFK
layer: Repository
---

## What to build

Add `getFleetSummary(userId)` to the device repository. This runs a single aggregation query over the user's devices and returns the counts needed by the fleet overview dashboard — avoiding N+1 fetches in the frontend.

## Acceptance criteria

- [ ] `getFleetSummary(userId)` returns `{ total, online, offline, warning, byType: Record<DeviceType, number>, healthScore: number }`
- [ ] `healthScore` is the percentage of devices with status `online`, rounded to one decimal place
- [ ] All counts are scoped to the requesting user's devices only
- [ ] Integration tests verify correct counts across a mix of statuses and device types
- [ ] Integration tests verify a user with no devices returns zeroed counts, not an error

## Blocked by

- [01 — Extended `devices` table migration](./01-devices-table-migration.md)
