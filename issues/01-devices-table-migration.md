---
title: Extended `devices` table migration
type: AFK
layer: Schema
---

## What to build

Add all new columns to the existing `devices` table via an additive Sequelize migration. No data is removed or renamed — existing rows remain valid. The migration covers identity, connectivity, location, firmware, health, configuration, and user-scoping fields.

## Acceptance criteria

- [ ] Migration adds `serial_number`, `manufacturer`, `model`, `device_type` (enum: sensor, tracker, meter, actuator, gateway) columns
- [ ] Migration adds `tags` (array), `last_seen_at`, `ip_address`, `signal_strength` columns
- [ ] Migration adds `latitude`, `longitude`, `location_label`, `timezone` columns
- [ ] Migration adds `firmware_version`, `hardware_revision`, `last_ota_update_at` columns
- [ ] Migration adds `battery_level`, `uptime_seconds`, `error_count`, `device_temperature` columns
- [ ] Migration adds `polling_interval_seconds`, `alert_threshold_config` (jsonb) columns
- [ ] Migration adds `user_id` (FK to users) column
- [ ] All new columns are nullable or have sensible defaults so existing rows are unaffected
- [ ] Migration runs cleanly via `npm run migrate` against a fresh database
- [ ] Migration is reversible (down migration drops the added columns)

## Blocked by

None — can start immediately.
