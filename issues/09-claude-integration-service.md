---
title: Claude integration service
type: AFK
layer: External Integrations
---

## What to build

Implement `src/services/claudeService.ts` — a deep module that wraps the Anthropic SDK. Accepts a user question and a device context JSON object, returns a plain-language string reply. This module is independently testable via a mock Anthropic client. The WhatsApp handler is the sole caller.

## Acceptance criteria

- [ ] Module exports a single function: `generateReply(question: string, deviceContext: object): Promise<string>`
- [ ] Uses model `claude-sonnet-4-6`, max tokens 300
- [ ] System prompt is marked for prompt caching (cache_control on the system prompt block) to reduce latency on repeated WhatsApp queries
- [ ] Unit test injects a mock Anthropic client and asserts: the correct model is called, the system prompt contains device context, and the returned string from the mock is passed back unchanged
- [ ] Module throws a typed error (not an unhandled rejection) if the Anthropic call fails

## Blocked by

- [02 — `telemetry_readings` + `user_profiles` migrations](./02-telemetry-user-profiles-migrations.md) (context: know the data shape before writing prompts)
