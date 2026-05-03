---
title: Device detail — health gauges + telemetry time-series chart
type: AFK
layer: Frontend
---

## What to build

Add health gauges and a telemetry time-series chart to the device detail page. All data comes from the telemetry endpoint. The chart supports time-range selection and metric switching.

Components:
- Three side-by-side radial gauges (ApexCharts): battery level %, internal temperature, uptime (hours)
- Time-series chart (ApexCharts line): one metric at a time, with 1h / 24h / 7d range selectors and a metric selector dropdown

## Acceptance criteria

- [ ] Battery, temperature, and uptime gauges render with the most recent values from the device's telemetry
- [ ] Time-series chart defaults to the 24h range and the first available metric on page load
- [ ] Selecting a different time range re-fetches telemetry for that window and re-renders the chart
- [ ] Selecting a different metric from the dropdown re-renders the chart without changing the time range
- [ ] Chart x-axis shows human-readable timestamps; y-axis label reflects the selected metric's unit
- [ ] Loading skeleton shown while telemetry is fetching
- [ ] Empty state shown if no readings exist for the selected range/metric

## Blocked by

- [07 — Telemetry ingestion endpoint](./07-telemetry-ingestion-endpoint.md)
- [15 — Device detail info card](./15-device-detail-info-card.md) (same page — build after page shell exists)
