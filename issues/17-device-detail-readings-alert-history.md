---
title: Device detail — raw readings table + alert history timeline
type: AFK
layer: Frontend
---

## What to build

Add the bottom section of the device detail page: a paginated table of raw telemetry readings for debugging, and an alert history timeline showing past threshold breaches for this device.

## Acceptance criteria

- [ ] Readings table displays columns: timestamp, metric, value, unit — sorted newest-first
- [ ] Table is paginated (page size 25); navigation controls work correctly at boundaries
- [ ] Alert history timeline lists past status changes and threshold breaches for this device only
- [ ] Each timeline entry shows: timestamp, alert type, resolved/ongoing indicator
- [ ] Empty state shown for both sections if no data exists
- [ ] Both sections are below the fold on the device detail page (scroll to reach)

## Blocked by

- [07 — Telemetry ingestion endpoint](./07-telemetry-ingestion-endpoint.md)
- [15 — Device detail info card](./15-device-detail-info-card.md) (same page — build after page shell exists)
