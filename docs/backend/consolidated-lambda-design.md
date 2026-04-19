# Backend Design: Consolidated API Lambda

Last updated: 2026-04-19

## 1. Motivation

The current backend defines one Lambda function per endpoint
(`healthFunction`, `usersMeFunction`, `signupFunction`, `confirmFunction`,
`loginFunction`, `refreshFunction`). This is fine in production, but it has
real cost in local development:

- `sam local start-api` bootstraps a Docker container per function on
  first invoke, and re-reads the CloudFormation template for each.
- Warm-up is dominated by function count, not by code size.
- As more endpoints land (users, devices, admin routes, etc.), local
  startup and iteration time get worse linearly.

The consolidated design collapses every HTTP endpoint into **one Lambda**
("the API Lambda") with an internal router that dispatches by
`(httpMethod, path)` to a child handler. The existing per-endpoint
handlers become plain functions that the router calls.

Goals:
- Single Lambda for every API Gateway route.
- Internal router selects child handler from HTTP method + path.
- Unit tests keep testing child handlers directly.
- Integration tests hit the same HTTP routes and keep passing.

Non-goals:
- No change to the OpenAPI contract.
- No change to Cognito authorization model at the edge.
- No move to OpenAPI-driven API Gateway provisioning (tracked separately).

## 2. Target Architecture

### 2.1 Request flow

1. API Gateway receives request, applies authorizer (where configured).
2. API Gateway forwards the event to the single API Lambda via proxy
   integration.
3. API Lambda's router inspects `event.resource` (preferred) or
   `event.path` + `event.httpMethod` and dispatches to the correct
   child handler.
4. Child handler returns an `APIGatewayProxyResult`; the router returns
   it unchanged.

### 2.2 Authorization

API Gateway still enforces Cognito at the route level. Public routes
(`/v1/auth/*`) opt out with `Auth.Authorizer: NONE`. The consolidated
Lambda itself does not re-check tokens — it trusts the authorizer, same
as today. `getRequestUser` continues to read claims from
`event.requestContext.authorizer.claims`.

### 2.3 IAM permissions

Today each function has a scoped policy (e.g. `cognito-idp:SignUp` only
on the signup function). The consolidated Lambda needs the **union** of
those permissions:

- `cognito-idp:SignUp`
- `cognito-idp:ConfirmSignUp`
- `cognito-idp:InitiateAuth`
- `VPCAccessPolicy` (for DB access used by `/v1/health`)

This widens blast radius for any single handler, but the operations are
all against the same user pool and none are destructive. Acceptable
trade-off for now; if we later need stricter isolation, we can split
hot paths back out.

### 2.4 Environment variables

The API Lambda gets the union of env vars the individual functions used
today:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
- `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `COGNITO_ENDPOINT`

### 2.5 VPC placement

All endpoints run inside the VPC (needed for DB-backed handlers). Cognito
calls leave the VPC via its public endpoint; this matches what health +
auth already do when they share a network today.

## 3. Router Design

### 3.1 Dispatch key

Prefer `event.resource` (e.g. `/v1/auth/login`) because API Gateway sets
it to the **route template**, so path params (`/v1/devices/{id}`) don't
break matching. Fall back to `event.path` for local SAM parity.

### 3.2 Route table

A single in-memory table mapping `"METHOD RESOURCE"` → child handler:

```ts
const routes: Record<string, Handler> = {
  "GET /v1/health": getHealth,
  "GET /v1/users/me": getUsersMe,
  "POST /v1/auth/signup": postAuthSignup,
  "POST /v1/auth/confirm": postAuthConfirm,
  "POST /v1/auth/login": postAuthLogin,
  "POST /v1/auth/refresh": postAuthRefresh,
};
```

404 on unknown key; 405 is not required at the Lambda since API Gateway
rejects unmapped methods before invocation.

### 3.3 Child handler shape

Child handlers keep today's signature
`(event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>`. No
wrapping, no middleware. The router is a flat switch.

## 4. File-Level Roadmap

### 4.1 New files

- `src/handlers/api.ts` — the consolidated Lambda entrypoint. Imports
  every child handler, builds the route table, exports `handler`.
- `src/handlers/router.ts` — pure function `route(event)` that picks the
  child handler; isolated for unit testing.
- `test/unit/router.test.ts` — unit tests for the router: known routes
  dispatch correctly, unknown routes return 404, path-param routes
  match by resource template.

### 4.2 Files to edit

- `infra/template.yaml`
  - Remove the six per-endpoint `AWS::Serverless::Function` resources.
  - Add one `apiFunction` with `Handler: dist/handlers/api.handler`.
  - Move all six `Events.Api` blocks under `apiFunction.Events` (keep
    paths and methods; keep `Auth: Authorizer: NONE` on the four
    `/v1/auth/*` routes).
  - Merge environment variables and IAM policies as described in §2.3
    and §2.4.
  - Keep `VpcConfig`, `Timeout`, `MemorySize`. Consider raising
    `MemorySize` to 256 MB — the Lambda now covers DB + Cognito paths.
- `src/handlers/get-health.ts`, `get-users-me.ts`, `post-auth-*.ts`
  - No behavior change. They stay as exported `handler` functions.
  - Optional cleanup: rename the exported symbol from `handler` to
    something like `getHealth` inside each file to avoid collisions
    when imported side-by-side in `api.ts`. The router imports them
    under explicit names either way; renaming is style-only.
- `README.md`
  - Update any text that says "one Lambda per endpoint."
- `docs/backend/backend-design.md`
  - Add a pointer to this doc and note the consolidated-Lambda model
    as the current implementation fact.
- `CLAUDE.md`
  - Update "Current Implementation Facts": Lambda handler entrypoint
    becomes `src/handlers/api.ts`; child handlers listed as internal.

### 4.3 Files that do NOT change

- `src/auth/*`, `src/db/*` — untouched.
- `openapi/openapi.yaml` — contract is unchanged.
- `test/setup/*` — Docker Postgres + Cognito fixtures untouched.
- `test/integration/*.api.test.ts` — they call HTTP routes, not
  handlers. They should pass as-is once the new template is deployed
  locally.
- `test/unit/get-*.test.ts`, `test/unit/post-auth-*.test.ts` — they
  import child handlers directly. They should pass as-is (with a
  rename touch-up if we rename the exported symbol per §4.2).

## 5. Test Strategy

### 5.1 Unit tests

- Existing per-handler unit tests continue to import the child
  handlers directly and pass unchanged.
- Add `test/unit/router.test.ts`:
  - Dispatches `GET /v1/health` to the health handler (mock child
    handler, assert it was called with the event).
  - Dispatches `POST /v1/auth/login` to the login handler.
  - Returns 404 JSON body for an unknown route.
  - Matches by `event.resource` when path params are present
    (future-proofing; no current route uses them, but the behavior
    should be correct from day one).

### 5.2 Integration tests

- `health.api.test.ts` and `auth.api.test.ts` hit HTTP endpoints and
  don't care how many Lambdas back them. Expected to pass with zero
  code changes.
- Expected SAM local startup win: one container cold-start instead of
  six. This is the whole point.

### 5.3 Manual verification

After template change, locally:
```bash
npm run build
npm run test:integration:local
```
Confirm all existing integration tests pass and that `sam local
start-api` boot is meaningfully faster.

## 6. Migration Steps (execution order)

1. **Add the router** — create `src/handlers/router.ts` and
   `src/handlers/api.ts`. Wire the existing child handlers. Add
   `test/unit/router.test.ts`. Unit suite still green.
2. **Switch infra to the consolidated Lambda** — edit
   `infra/template.yaml`: delete the six functions, add `apiFunction`
   with merged env + IAM + VPC config, attach all six `Events.Api`
   entries to it.
3. **Run integration suite locally** — `npm run
   test:integration:local`. Fix any env var drift exposed by the
   merge. Confirm startup is faster.
4. **Update docs** — `README.md`,
   `docs/backend/backend-design.md`, `CLAUDE.md` to reflect the new
   model.
5. **Deploy to the test stack** — `npm run deploy:test`. Smoke test
   `/v1/health` and `/v1/auth/login` against the deployed URL.
6. **Clean up** — no per-endpoint Lambda artifacts should remain in
   CloudFormation after the deploy; confirm via
   `aws cloudformation describe-stack-resources`.

## 7. Risks and Mitigations

- **Risk:** Widened IAM policy on the single Lambda.
  - *Mitigation:* All merged actions are against the same user pool
    and are non-destructive. Revisit if we add privileged admin routes.
- **Risk:** A bug in one handler (e.g. unhandled promise rejection)
  affects the shared Lambda's warm container state.
  - *Mitigation:* Each child handler is already isolated — no shared
    mutable module state beyond the DB/Cognito client singletons,
    which are safe to share.
- **Risk:** Cold-start latency for infrequently-hit endpoints goes up
  because the Lambda now carries imports for every route.
  - *Mitigation:* Bundle sizes are small today (AWS SDK + Sequelize
    already dominate). If cold start becomes a problem, revisit with
    a bundler step (esbuild) before splitting functions back out.
- **Risk:** Route-matching bug silently sends requests to the wrong
  handler.
  - *Mitigation:* Router unit tests cover the exact route table;
    integration tests cover the HTTP path end-to-end.

## 8. Out of Scope (Tracked Elsewhere)

- Importing `openapi/openapi.yaml` as the API Gateway definition body.
- Splitting back out any endpoint for isolation / scaling reasons.
- Structured logging and request-id propagation through the router.
