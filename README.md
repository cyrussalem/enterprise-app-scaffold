# Enterprise App Scaffold

OpenAPI-first TypeScript REST API deployed to API Gateway + Lambda on AWS (test environment first).

## What is implemented

- TypeScript Lambda handler for `GET /v1/health`.
- OpenAPI contract in `openapi/openapi.yaml`.
- API Gateway routing + Lambda integration defined in OpenAPI via `x-amazon-apigateway-integration`.
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
curl <HealthEndpoint from stack outputs>
```

Expected body:

```json
{
  "ok": true,
  "message": "success"
}
```
