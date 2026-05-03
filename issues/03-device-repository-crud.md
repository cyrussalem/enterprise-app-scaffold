---
title: Device repository — CRUD + ownership scoping
type: AFK
layer: Repository
---

## What to build

Implement the device repository module (`src/repositories/deviceRepository.ts`) covering the core CRUD interface. All read operations must filter by `user_id` so no user can access another's devices. This module is the single entry point for all device data access — no controller or handler touches Sequelize directly.

## Acceptance criteria

- [ ] `list(userId)` returns all devices owned by the given user, no others
- [ ] `get(deviceId, userId)` returns a single device or throws a not-found error if the device doesn't exist or belongs to another user
- [ ] `create(userId, attrs)` creates a device scoped to the given user
- [ ] `update(deviceId, userId, attrs)` updates only fields provided; ownership check enforced
- [ ] `delete(deviceId, userId)` removes the device; ownership check enforced
- [ ] Integration tests cover each method using a real test database (SAM local + Postgres, consistent with existing test pattern)
- [ ] Tests assert ownership isolation: a device created by user A is not visible to user B

## Blocked by

- [01 — Extended `devices` table migration](./01-devices-table-migration.md)
