# PRD: IoT Device Management Platform

**Date:** 2026-05-01  
**Status:** Needs Triage  

---

## Problem Statement

Enterprise customers operating mixed IoT device fleets have no centralized, demo-ready platform
to monitor device health, visualize telemetry, and query fleet status in natural language. The
existing scaffold provides authentication and a minimal device model, but it lacks the data
depth, dashboard richness, and AI-driven interfaces that would make it a compelling proof of
capability when demoing to prospective customers.

---

## Solution

Extend the scaffold into a full IoT Device Management Platform. The solution has three layers:

1. **A rich device data model** — an extended `devices` table covering identity, connectivity,
   location, firmware, health, and configuration, plus a separate time-series `telemetry_readings`
   table. Devices are scoped to the authenticated user.

2. **A polished dashboard** — a fleet overview page (KPI cards, status charts, a live map,
   alerts feed) and a per-device detail page (gauges, time-series chart, readings table, alert
   history), built with MUI, ApexCharts, and React Leaflet.

3. **A WhatsApp AI assistant** — customers send a plain-language WhatsApp message to ask about
   their devices; the platform queries the database and uses Claude to compose a concise, accurate
   reply. Built on Twilio for messaging and the Anthropic SDK for language generation.

Fifty simulated devices with 7 days of seed telemetry ensure the platform looks fully populated
from day one of a demo.

---

## User Stories

### Device Data Model

1. As a platform user, I want each device to have a serial number, manufacturer, and model, so
   that I can identify physical hardware unambiguously.
2. As a platform user, I want devices to have a `device_type` (sensor, tracker, meter, actuator,
   gateway), so that the dashboard can break down the fleet by type.
3. As a platform user, I want each device to store its last known IP address and signal strength,
   so that I can diagnose connectivity issues without SSH-ing into the device.
4. As a platform user, I want devices to record latitude, longitude, and a human-readable
   location label, so that I can see where my hardware is deployed on a map.
5. As a platform user, I want devices to track firmware version and last OTA update timestamp,
   so that I can identify devices running outdated software.
6. As a platform user, I want devices to report battery level, uptime, error count, and internal
   temperature, so that I can proactively service devices before they fail.
7. As a platform user, I want to attach free-form tags to devices, so that I can group and
   filter them by project, site, or custom category.
8. As a platform user, I want each device to have a configurable polling interval and per-device
   alert threshold config, so that the platform can flag anomalies automatically.
9. As a platform user, I want device records to be scoped to my user account, so that I only
   ever see my own devices and never another customer's data.

### Telemetry Ingestion

10. As a device (or a device simulator), I want to POST telemetry readings in a batch, so that
    the platform captures time-series data without one round-trip per metric.
11. As a platform user, I want the device's `last_seen_at` and status to update automatically
    whenever a telemetry payload arrives, so that the dashboard always reflects real connectivity.
12. As a developer, I want a seed script that populates 50 devices and 7 days of readings, so
    that I can demo the platform without needing real hardware.

### Fleet Overview Dashboard

13. As a platform user, I want a KPI summary row showing total, online, offline, and warning
    device counts, so that I can assess overall fleet health at a glance.
14. As a platform user, I want a status donut chart, so that I can instantly see the proportion
    of healthy vs. unhealthy devices.
15. As a platform user, I want a device-type breakdown bar chart, so that I can understand the
    composition of my fleet.
16. As a platform user, I want a fleet health gauge (a single percentage dial), so that I can
    summarize fleet state in a single number for executive reporting.
17. As a platform user, I want a world map with color-coded pins for each device, so that I
    can see which sites have issues without scrolling through a table.
18. As a platform user, I want to click a map pin and navigate directly to that device's detail
    page, so that I can investigate issues from the map without extra navigation steps.

19. As a platform user, I want a recent alerts feed showing the 20 latest status changes and
    threshold breaches, so that I am aware of emerging issues as soon as they occur.

### Device Detail Page

20. As a platform user, I want a device info card showing all identity, location, and firmware
    fields, so that I have a single source of truth for a device's full profile.
21. As a platform user, I want a live status indicator that refreshes every 30 seconds, so that
    the page stays current without a manual reload.
22. As a platform user, I want battery, temperature, and uptime gauges displayed side by side,
    so that I can assess device health at a glance without reading raw numbers.
23. As a platform user, I want a telemetry time-series chart with 1h / 24h / 7d time-range
    selectors and a metric selector dropdown, so that I can explore historical readings for any
    metric the device reports.
24. As a platform user, I want a paginated table of the most recent raw telemetry readings, so
    that I can inspect exact values and timestamps for debugging.
25. As a platform user, I want an alert history timeline showing past threshold breaches for this
    device, so that I can understand whether a problem is recurring or one-off.

### WhatsApp AI Assistant

26. As a platform user, I want to send a WhatsApp message to ask how many of my devices are
    online, and receive an accurate count in reply, so that I can check fleet status from my phone.
27. As a platform user, I want to ask whether a specific device is online, and receive a direct
    yes/no with last-seen time, so that I can respond quickly to field reports without opening a
    browser.
28. As a platform user, I want to ask which devices have issues right now, and receive a short
    list of offline and warning devices, so that I can triage problems from anywhere.
29. As a platform user, I want to ask about the battery level of a specific device, and receive
    a plain-language answer, so that I can plan maintenance visits without logging in.
30. As a platform user, I want to ask when a specific device last checked in, and receive a
    human-readable time, so that I can quickly assess whether a device has gone dark.
31. As a platform user, I want the bot to proactively mention any critical alerts in its reply
    even if I didn't ask, so that I am never blindsided by a serious issue.
32. As a platform user, I want to register my WhatsApp number with the platform, so that the
    bot can identify me and only share data for my own devices.
33. As a platform user, I want to receive a clear "number not recognised" message if my number
    is not recognized, so that I know exactly what to do to get access.

---

## Implementation Decisions

### Modules to Build or Modify

**Device repository (deep module)**  
A single service layer that encapsulates all read and write access to the `devices` and
`telemetry_readings` tables. The interface exposes typed methods: list, get, create, update,
delete, ingestTelemetry, queryTelemetry, and getFleetSummary. Controllers and the WhatsApp
handler both call this module — neither touches Sequelize directly. This makes the data layer
independently testable.

**Telemetry ingestion endpoint**  
A new handler for `POST /v1/devices/:id/telemetry`. Accepts a batch of readings, validates
ownership, bulk-inserts into `telemetry_readings`, and side-effects the parent device row
(`last_seen_at`, `status → online`).

**Fleet summary endpoint**  
A new handler for `GET /v1/dashboard/summary`. Runs aggregation queries (counts by status, counts
by type, health score) and returns a single payload consumed by the fleet overview widgets. This
avoids N+1 fetching in the frontend.

**Device CRUD endpoints**  
New handlers for `GET /v1/devices`, `GET /v1/devices/:id`, `POST /v1/devices`,
`PATCH /v1/devices/:id`, `DELETE /v1/devices/:id`.

**WhatsApp webhook handler**  
A new handler for `POST /v1/whatsapp/webhook` (no Cognito authorizer — validated via Twilio
signature). Resolves the incoming phone number to a user, fetches their device data via the
device repository, calls Claude with a structured prompt, and sends the reply via Twilio.

**Claude integration service (deep module)**  
Encapsulates the Anthropic SDK call: accepts a user question + device context JSON, returns a
plain-language string. Prompt caching is applied to the system prompt. Model: `claude-sonnet-4-6`,
max tokens: 300. This module is independently testable by injecting mock device data.

**Twilio send utility**  
A thin wrapper around the Twilio REST API for sending outbound WhatsApp messages. Configured via
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` environment variables.

**Seed script**  
A standalone script that creates 50 devices (across 5 types, spread across 5 fictional locations,
mixed statuses: 70% online / 15% offline / 15% warning) and 7 days of telemetry readings per
device, all assigned to a configurable demo user.

### Schema Changes

**`devices` table — additive migration**  
Adds: `serial_number`, `manufacturer`, `model`, `device_type` (enum), `tags` (array),
`last_seen_at`, `ip_address`, `signal_strength`, `latitude`, `longitude`, `location_label`,
`timezone`, `firmware_version`, `hardware_revision`, `last_ota_update_at`, `battery_level`,
`uptime_seconds`, `error_count`, `device_temperature`, `polling_interval_seconds`,
`alert_threshold_config` (jsonb), `user_id`.

**`telemetry_readings` table — new**  
Fields: `id` (UUID PK), `device_id` (FK), `recorded_at`, `metric`, `value`, `unit`, `created_at`.  
Index on `(device_id, recorded_at DESC)`.

**`user_profiles` table — new (or Cognito custom attribute)**  
Stores `whatsapp_number` ↔ `user_id` mapping for the WhatsApp bot resolver.

### Key Architectural Decisions

- **Consolidated Lambda** — all new routes are added to the existing single Lambda via the
  internal router. The WhatsApp webhook skips the Cognito authorizer and validates using the
  Twilio signature header instead.
- **User-scoped data** — all device queries filter by the authenticated user's Cognito sub.
  No cross-user data access is possible.
- **ApexCharts** for all charts and gauges (fleet overview + device detail).
- **React Leaflet + OpenStreetMap** for the device location map (no API key required).
- **Prompt caching** on the Claude system prompt to reduce latency and cost for repeated
  WhatsApp queries.

---

## Testing Decisions

**What makes a good test here:** Tests should assert on the observable output of a module
given a controlled input — not on internal state, SQL calls, or SDK method invocations. The
device repository should be tested against a real test database (consistent with the project's
existing integration-test pattern using SAM local). The Claude service and Twilio utility should
be tested with injected mocks at the module boundary.

**Modules to test:**

- **Device repository** — integration tests covering list/get/create/update/delete, telemetry
  ingestion, fleet summary aggregation. Use the existing local integration test pattern
  (SAM local + real Postgres).
- **Fleet summary endpoint** — integration test asserting correct aggregation counts.
- **Claude integration service** — unit test with a mock Anthropic client asserting that the
  correct prompt structure is sent and the returned string is passed back unchanged.
- **WhatsApp webhook handler** — unit test covering the query-routing logic: given a known
  user message and stubbed device data, assert the correct query type is resolved and the
  Claude service is called with the correct context.

---

## Out of Scope

- Real hardware SDK or device agent — devices are simulated via the seed script and ingestion endpoint.
- Multi-tenant / organization management — devices are user-owned only.
- Push notifications or native mobile application.
- Billing, usage metering, or rate limiting.
- Alert threshold evaluation engine (thresholds are stored but not actively evaluated server-side in this phase).
- Self-service WhatsApp number registration UI (number is set directly on the user profile record).
- OpenAPI-driven API Gateway deployment (existing scaffold limitation, noted in CLAUDE.md).

---

## Further Notes

- The three open questions from the design session are intentionally left unresolved:
  (1) which fictional locations/geographies the seed data should use,
  (2) whether WhatsApp number registration is self-service or admin-assigned,
  (3) whether alert thresholds are configured per-device only or also at a device-type level.
- The `gh` CLI is not available in this environment, so this PRD is stored locally at
  `docs/prd/iot-platform-prd.md` rather than published as a GitHub Issue. Install `gh` and
  run `gh issue create --title "IoT Platform" --body-file docs/prd/iot-platform-prd.md --label needs-triage`
  to publish it when ready.
