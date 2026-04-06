# Enterprise App Scaffold

TypeScript REST API scaffold deployed to API Gateway + Lambda on AWS (test environment first).

## What is implemented

- TypeScript Lambda handler for `GET /v1/health`.
- API Gateway routing + Lambda integration currently defined in `infra/template.yaml` (SAM `Events.Api`).
- OpenAPI contract file exists in `openapi/openapi.yaml`, but it is not currently wired into SAM deployment.
- Jest-based unit and integration tests.
- AWS SAM/CloudFormation template in `infra/template.yaml`.

## Prerequisites

- Node.js 20+
- npm 10+
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

Run unit tests:

```bash
npm run test:unit
```

Run local API integration tests (starts SAM local API, then runs Jest integration tests):

```bash
npm run test:integration:local
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
  "message": "success"
}
```
