---
title: Device detail — info card + live status indicator
type: AFK
layer: Frontend
---

## What to build

Build the device detail page shell and its top section: a device info card showing all identity, location, and firmware fields, and a live status indicator that auto-refreshes every 30 seconds.

## Acceptance criteria

- [ ] Page is reachable at `/devices/{id}` and navigable from the fleet map and device list
- [ ] Info card displays: serial number, manufacturer, model, device type, firmware version, hardware revision, last OTA update, location label, latitude/longitude, IP address, signal strength, tags
- [ ] Status indicator (online / offline / warning) refreshes every 30 seconds without a full page reload
- [ ] `last_seen_at` is displayed as a human-readable relative timestamp and updates on each refresh
- [ ] HTTP 404 from the API renders a "device not found" message, not a blank page
- [ ] Page title reflects the device name/serial

## Blocked by

- [06 — Device CRUD endpoints](./06-device-crud-endpoints.md)
