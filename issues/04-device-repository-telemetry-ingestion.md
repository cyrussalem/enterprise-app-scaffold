---
title: Device repository — telemetry ingestion
type: AFK
layer: Repository
---

## What to build

Add `ingestTelemetry(deviceId, userId, readings[])` to the device repository. The method bulk-inserts a batch of readings into `telemetry_readings` and side-effects the parent `devices` row to update `last_seen_at` and set `status` to `online`.

## Acceptance criteria

- [ ] `ingestTelemetry` accepts an array of `{ metric, value, unit, recorded_at }` objects and bulk-inserts them into `telemetry_readings`
- [ ] After ingestion, `devices.last_seen_at` is updated to the latest `recorded_at` in the batch
- [ ] After ingestion, `devices.status` is set to `online`
- [ ] Ownership check is enforced — ingesting to a device owned by another user throws
- [ ] `queryTelemetry(deviceId, userId, { metric?, from, to })` returns readings filtered by time range and optional metric name
- [ ] Integration tests verify bulk insert, `last_seen_at` side-effect, and ownership enforcement

## Blocked by

- [01 — Extended `devices` table migration](./01-devices-table-migration.md)
- [02 — `telemetry_readings` migration](./02-telemetry-user-profiles-migrations.md)
