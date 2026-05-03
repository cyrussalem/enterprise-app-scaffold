---
title: Fleet overview — recent alerts feed
type: AFK
layer: Frontend
---

## What to build

Add a recent alerts feed to the fleet overview page showing the 20 latest status changes and threshold breaches across the user's fleet. This is a read-only list — no alert management actions in this phase.

## Acceptance criteria

- [ ] Alerts feed renders below the map on the fleet overview page
- [ ] Displays the 20 most recent alert events (status changes, threshold breaches) sorted newest-first
- [ ] Each entry shows: device name, alert type, timestamp (human-readable relative time)
- [ ] Entries link to the relevant device detail page
- [ ] Feed refreshes when the user manually reloads the page (no polling required in this phase)
- [ ] Empty state shown if there are no alerts

## Blocked by

- [12 — Fleet overview KPI cards + charts](./12-fleet-overview-kpi-charts.md) (same page — build after base page exists)
- [06 — Device CRUD endpoints](./06-device-crud-endpoints.md)
