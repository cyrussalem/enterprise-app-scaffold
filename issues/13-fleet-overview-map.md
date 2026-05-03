---
title: Fleet overview — world map with device pins
type: AFK
layer: Frontend
---

## What to build

Add a React Leaflet map to the fleet overview page showing every device as a color-coded map pin. Clicking a pin navigates to that device's detail page. Uses OpenStreetMap tiles — no API key required.

## Acceptance criteria

- [ ] Map renders all devices returned by `GET /v1/devices` as pins
- [ ] Pin color reflects device status: green = online, red = offline, amber = warning
- [ ] Clicking a pin navigates to `/devices/{id}`
- [ ] Map fits bounds to contain all pins on initial load
- [ ] Map is usable at mobile viewport widths (pins remain clickable)
- [ ] No API key or third-party tile service beyond OpenStreetMap is required

## Blocked by

- [06 — Device CRUD endpoints](./06-device-crud-endpoints.md)
- [12 — Fleet overview KPI cards + charts](./12-fleet-overview-kpi-charts.md) (same page — build after base page exists)
