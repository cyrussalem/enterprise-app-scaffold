---
title: Fleet overview — KPI cards + status donut + type bar chart + health gauge
type: AFK
layer: Frontend
---

## What to build

Build the top half of the fleet overview dashboard page. All data comes from a single call to `GET /v1/dashboard/summary`. No per-device fetching.

Components:
- KPI summary row: total / online / offline / warning device counts as MUI cards
- Status donut chart (ApexCharts): proportion of online / offline / warning devices
- Device-type breakdown bar chart (ApexCharts): count per device type
- Fleet health gauge (ApexCharts radial): single health-score percentage dial

## Acceptance criteria

- [ ] Page fetches `GET /v1/dashboard/summary` once on mount; all four components render from that response
- [ ] KPI cards display total, online, offline, and warning counts
- [ ] Donut chart segments match the status counts from the API
- [ ] Bar chart shows a bar per device type with correct counts
- [ ] Health gauge displays the `healthScore` percentage
- [ ] Loading state shown while the API call is in flight
- [ ] Error state shown if the API call fails (no uncaught exceptions)
- [ ] Page is reachable from the app's main navigation

## Blocked by

- [08 — Fleet summary endpoint](./08-fleet-summary-endpoint.md)
