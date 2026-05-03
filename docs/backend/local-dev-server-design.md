# Local Dev Server Design: Express Adapter for Lambda Handlers

Last updated: 2026-05-02

## 1. Problem

`sam local start-api` is the current mechanism for running the API locally. It has two compounding costs:

1. **Cold-start overhead on every invocation.** SAM spins up a Docker container per Lambda invocation. On most machines this adds 5–15 seconds per request, making interactive development and Playwright-driven end-to-end tests impractically slow.
2. **Full-stack startup time.** `sam build` + container image pulls + runtime bootstrap means `dev:api` can take 1–3 minutes before the first request can land.

The result is a feedback loop that discourages running integration or UI tests locally.

## 2. Goal

Replace `dev:api` with a lightweight in-process Node.js server that:

- Starts in **under 5 seconds**.
- Handles every request in the **same Node.js process** — no container cold-start.
- Faithfully reproduces the API surface (`APIGatewayProxyEvent` → handler → HTTP response) without requiring SAM or Docker for Lambda.
- Keeps Docker Compose for the services that actually need containers: PostgreSQL and Cognito-local.
- Keeps the existing integration test suite passing against `http://127.0.0.1:3000` with no changes to test code.

## 3. Architecture

```
┌────────────────────────────────────────────────────────┐
│  Local Dev Server  (scripts/local-server.ts)           │
│                                                        │
│  Express HTTP listener  :3000                          │
│       │                                                │
│       ▼                                                │
│  Request Adapter                                       │
│  (Express req → APIGatewayProxyEvent)                  │
│       │                                                │
│       ▼                                                │
│  handler(event)  ← src/handlers/api.ts (in-process)   │
│       │                                                │
│       ▼                                                │
│  Response Adapter                                      │
│  (APIGatewayProxyResult → Express res)                 │
└────────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
  PostgreSQL :5432          Cognito-local :9229
  (Docker Compose)          (Docker Compose)
```

The Lambda handler code (`src/handlers/api.ts`) is imported and called directly. No subprocess, no container boundary, no IPC overhead.

## 4. Request Adapter

The adapter constructs a minimal `APIGatewayProxyEvent` from the incoming Express request. The fields that matter to the current handlers are:

| APIGatewayProxyEvent field | Source |
|---|---|
| `httpMethod` | `req.method` |
| `path` | `req.path` |
| `resource` | `req.path` (same value — router uses either) |
| `headers` | `req.headers` (lowercased) |
| `body` | Raw request body string (or `null`) |
| `requestContext.authorizer.claims` | Decoded from `Authorization: Bearer <jwt>` (see §6) |
| `queryStringParameters` | `req.query` (string values only) |
| `pathParameters` | `{}` (no path params in current routes) |
| `isBase64Encoded` | `false` |

Fields not used by any current handler (multiValueHeaders, stageVariables, etc.) are set to empty objects or `null`.

## 5. Response Adapter

After the handler resolves, the adapter writes:

```
res.status(result.statusCode)
res.set(result.headers)
res.send(result.body)
```

If the handler throws (unhandled error), the adapter returns `{ statusCode: 500, body: '{"ok":false,"message":"internal server error"}' }`.

## 6. Authorization Handling

In API Gateway, the Cognito authorizer populates `event.requestContext.authorizer.claims` before the Lambda is invoked. SAM local reproduces this by contacting Cognito-local. The current code already has a fallback path for this in `src/auth/request-user.ts` that decodes the JWT payload directly when `AWS_SAM_LOCAL === "true"`.

The local server reuses that same fallback:

- Set `AWS_SAM_LOCAL=true` in the process environment when starting the local server.
- The request adapter extracts the `Authorization: Bearer <token>` header and decodes the JWT payload (no signature verification — same as the SAM fallback), then injects it into `requestContext.authorizer.claims`.
- Auth endpoints (`/v1/auth/*`) have no authorizer requirement and pass through unchanged.

This means Cognito-local still issues real tokens, and those tokens work end-to-end through the server without any stub.

## 7. Environment Configuration

The local server reads environment variables from `infra/env.local.json` at startup (the same file already used by `sam local start-api --env-vars`). This keeps a single source of truth for local environment config.

The server loads the variables like this:

```ts
const envVars = JSON.parse(fs.readFileSync("infra/env.local.json", "utf8"));
const fnEnv = envVars["apiFunction"] ?? {};
Object.assign(process.env, fnEnv);
process.env.AWS_SAM_LOCAL = "true";
```

## 8. Implementation Plan

### Phase 1 — New server script (additive, non-breaking)

1. Add `express` and `@types/express` as dev dependencies (or use Node's built-in `http` if we want zero new deps — see §9).
2. Create `scripts/local-server.ts` implementing the adapter (§4–§7).
3. Add npm scripts:
   ```json
   "local:start": "ts-node scripts/local-server.ts",
   "local:test": "cross-env WAIT_ON_TIMEOUT=30000 start-server-and-test local:start tcp:127.0.0.1:3000 test:integration"
   ```
4. Run integration tests against the new server and confirm they all pass.

### Phase 2 — Wire into the dev loop

5. Replace `dev:api` to call `local:start` instead of `sam:local:start`.
6. Update CLAUDE.md to reflect the new startup flow.
7. Keep `sam:local:start` and `sam:build` scripts intact for CI/pre-prod verification.

### Phase 3 — Update integration test timeout

8. Reduce `WAIT_ON_TIMEOUT` in `test:integration:local` from 600 000 ms to 30 000 ms now that there is no SAM container to wait for.

## 9. Dependency Choice: Express vs. Built-in `http`

| | Express | Node `http` |
|---|---|---|
| Routing | Built-in | Manual string parsing |
| Body parsing | `express.text()` middleware | Manual buffer accumulation |
| Dev dependency | One package + types | Zero new packages |
| Readability | High | Low |

**Recommendation: use Express.** It is already a de-facto standard, the adapter is ~60 lines, and body parsing is one middleware call. Using raw `http` saves one dependency but adds brittle manual parsing for no meaningful gain.

## 10. Trade-offs vs. SAM Local

| Concern | SAM local | Local Express server |
|---|---|---|
| Startup time | 1–3 min | < 5 s |
| Request latency | 5–15 s (cold container) | < 100 ms (in-process) |
| Cognito-local integration | Full emulation | Full emulation (same Docker service) |
| PostgreSQL integration | Full (Docker Compose) | Full (Docker Compose) |
| API Gateway authorizer emulation | Via SAM + Cognito-local | JWT decode fallback (existing pattern) |
| Multivalue headers | Supported | Not implemented (not used by any handler) |
| Binary payloads | Supported | Not implemented (not used) |
| Production fidelity | Higher (actual Lambda runtime) | Lower (Node.js process, not container) |
| Feedback loop speed | Slow | Fast |

The production fidelity gap is mitigated by:
- Unit tests covering handler logic in isolation.
- Deployed smoke tests in the `test` AWS environment after each deploy.
- The existing `sam:local:start` scripts remaining available for occasional full-fidelity checks.

## 11. Files to Create / Modify

| File | Action |
|---|---|
| `scripts/local-server.ts` | Create — Express adapter implementation |
| `package.json` | Add `local:start`, `local:test` scripts; add `express` + `@types/express` devDeps |
| `dev:api` script | Update to call `local:start` instead of `sam:local:start` |
| `CLAUDE.md` | Update dev loop instructions |
| `docs/backend/backend-design.md` | Note the local server as the preferred local integration target |

## 12. Out of Scope

- Hot-reload (ts-node with `--watch` can be added later as a follow-on).
- Path parameter extraction (no parameterised routes currently exist).
- Binary / multipart body handling.
- Replacing SAM for CI/CD packaging and deployment.
