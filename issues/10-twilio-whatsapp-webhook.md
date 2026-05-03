---
title: Twilio utility + WhatsApp webhook handler
type: AFK
layer: External Integrations
---

## What to build

Implement two modules and wire up the webhook endpoint:

1. `src/services/twilioService.ts` — thin wrapper around the Twilio REST API for sending outbound WhatsApp messages. Configured via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` env vars.

2. `POST /v1/whatsapp/webhook` handler — validates the incoming Twilio signature, resolves the sender's phone number to a `user_id` via `user_profiles`, fetches device data from the device repository, calls the Claude service, and sends the reply via the Twilio utility.

This route skips the Cognito authorizer and uses Twilio signature validation instead.

## Acceptance criteria

- [ ] `POST /v1/whatsapp/webhook` is declared in `infra/template.yaml` without a Cognito authorizer
- [ ] Requests with an invalid Twilio signature return HTTP 403
- [ ] If the sender's `whatsapp_number` is not found in `user_profiles`, the handler sends a "number not recognised" reply via Twilio and returns HTTP 200 (Twilio expects 200)
- [ ] For recognised users, the handler fetches their device data, calls `claudeService.generateReply`, and sends the result via the Twilio utility
- [ ] `twilioService.send` is a thin wrapper: no business logic, just the API call
- [ ] Unit tests cover: invalid signature → 403, unrecognised number → "not recognised" reply, recognised user → Claude called with correct context

## Blocked by

- [03 — Device repository — CRUD](./03-device-repository-crud.md)
- [09 — Claude integration service](./09-claude-integration-service.md)
