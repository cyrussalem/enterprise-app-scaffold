# Enterprise App Scaffold

TypeScript REST API scaffold deployed to API Gateway + Lambda on AWS (test environment first).

## What is implemented

- TypeScript Lambda handler for `GET /v1/health`.
- Health endpoint queries the `devices` table in PostgreSQL to verify full-stack connectivity.
- Sequelize ORM for database interactions.
- API Gateway routing + Lambda integration currently defined in `infra/template.yaml` (SAM `Events.Api`).
- OpenAPI contract file exists in `openapi/openapi.yaml`, but it is not currently wired into SAM deployment.
- Jest-based unit and integration tests (both require a local PostgreSQL container via Docker).
- AWS SAM/CloudFormation template in `infra/template.yaml` with VPC, RDS PostgreSQL, and Lambda VPC configuration.

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
