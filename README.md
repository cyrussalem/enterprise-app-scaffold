# Enterprise App Scaffold

TypeScript REST API scaffold deployed to API Gateway + Lambda on AWS (test environment first).

## What is implemented

- A single consolidated API Lambda (`src/handlers/api.ts`) backs every route. An internal router (`src/handlers/router.ts`) dispatches by `(httpMethod, event.resource)` to child handlers.
- Endpoints: `GET /v1/health`, `GET /v1/users/me`, `POST /v1/auth/{signup,confirm,login,refresh}`.
- Health endpoint queries the `devices` table in PostgreSQL to verify full-stack connectivity.
- Cognito-backed signup / confirm / login / refresh via the AWS SDK.
- Sequelize ORM for database interactions.
- API Gateway routing + Lambda integration defined in `infra/template.yaml` (SAM `Events.Api` — all six events attached to the single `apiFunction`).
- OpenAPI contract file exists in `openapi/openapi.yaml`, but it is not currently wired into SAM deployment.
- Jest-based unit and integration tests (both require local Docker containers).
- AWS SAM/CloudFormation template in `infra/template.yaml` with VPC, RDS PostgreSQL, Cognito, and the Lambda VPC configuration.

See [docs/backend/consolidated-lambda-design.md](docs/backend/consolidated-lambda-design.md) for the rationale and layout of the single-Lambda model.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for local PostgreSQL test container)
- AWS CLI v2 configured
- AWS SAM CLI (for local API integration tests)

## Install

```bash
npm ci
```

## Build

```bash
npm run build
```

## Run the app locally (API + frontend end-to-end)

The backend runs as a single consolidated Lambda in `sam local start-api`
against `cognito-local` and a Postgres container. `cognito-local` uses
`tmpfs`, so its user pool + app client IDs regenerate on every container
start. `npm run dev:up` takes care of this by (re)seeding and writing the
fresh IDs into `infra/env.local.json`.

Start the stack once, leave it running, and iterate with hot reload:

```bash
# Terminal 1 — bring up Docker (Postgres + cognito-local) and seed
npm run dev:up

# Terminal 2 — start SAM local API on http://127.0.0.1:3000
npm run dev:api

# Terminal 3 — start the Vite frontend on http://127.0.0.1:5173
npm run dev:web
```

The seed creates a confirmed test user (`seed@example.com` /
`SeedPassword123!`) you can log in with. When you're done:

```bash
npm run dev:down
```

If you restart `cognito-local` (or rebuild Docker state) **you must
re-run `npm run dev:seed` and restart `npm run dev:api`** — the previous
SAM process has stale client IDs in its environment.

## Test

### Unit tests

Unit tests start a Docker PostgreSQL container, run the handler in-process against it, then tear it down.

```bash
npm run test:unit
```

### Local API integration tests

Integration tests start the Docker PostgreSQL container, run SAM local API, execute tests against `http://127.0.0.1:3000/v1/health`, then tear everything down.

```bash
npm run test:integration:local
```

## Database

### Start local PostgreSQL container

```bash
npm run db:start
```

### Stop local PostgreSQL container

```bash
npm run db:stop
```

### Run migrations

```bash
npm run db:migrate
```

### Undo last migration

```bash
npm run db:migrate:undo
```

### Generate a new migration

```bash
npm run db:migrate:generate -- <migration-name>
```

## Deploy to AWS test environment (AWS CLI)

Set your artifact bucket first:

PowerShell:

```powershell
$env:ARTIFACT_BUCKET = "<your-artifact-bucket>"
```

Bash:

```bash
export ARTIFACT_BUCKET=<your-artifact-bucket>
```

Build and package:

```bash
npm run build
npm run package:test
```

Deploy test stack:

```bash
npm run deploy:test
```

Get stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name enterprise-app-test \
  --query "Stacks[0].Outputs" \
  --output table
```

Verify endpoint:

```bash
curl <WebEndpoint from stack outputs>v1/health
```

Expected body:

```json
{
  "ok": true,
  "message": "success",
  "devices": []
}
```
