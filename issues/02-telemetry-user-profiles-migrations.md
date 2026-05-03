---
title: `telemetry_readings` and `user_profiles` migrations
type: AFK
layer: Schema
---

## What to build

Create two new tables via Sequelize migrations: `telemetry_readings` for time-series device data, and `user_profiles` for the WhatsApp phone number → user_id mapping used by the AI assistant.

## Acceptance criteria

- [ ] `telemetry_readings` table created with columns: `id` (UUID PK), `device_id` (FK → devices), `recorded_at`, `metric`, `value`, `unit`, `created_at`
- [ ] Composite index on `(device_id, recorded_at DESC)` exists on `telemetry_readings`
- [ ] `user_profiles` table created with columns: `id` (UUID PK), `user_id`, `whatsapp_number` (unique), `created_at`, `updated_at`
- [ ] Both migrations run cleanly via `npm run migrate` against a fresh database
- [ ] Both migrations are reversible (down migrations drop the tables)

## Blocked by

None — can start immediately.
