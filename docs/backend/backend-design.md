# Backend Design: TypeScript REST API on AWS (Test Environment First)

> **Implementation note (2026-04-19):** the current deployment consolidates every route behind a single Lambda (`src/handlers/api.ts`) with an internal router. The "one Lambda per endpoint" framing earlier in this document describes the original plan; see [consolidated-lambda-design.md](consolidated-lambda-design.md) for the current model.

## 1. Scope and Goal

This document defines the first deployable backend slice for this repository:
- A TypeScript REST API.
- API contract defined by OpenAPI.
- Local unit + integration testability.
- AWS deployment to a **test environment** only (for now).
- API Gateway invokes Lambda.
- Lambda returns HTTP 200 with a success JSON payload.

Initial success response:
```json
{
  "ok": true,
  "message": "success"
}
```

## 2. Architecture (MVP)

Request flow:
1. Client sends HTTP request to API Gateway endpoint.
2. API Gateway routes request based on OpenAPI definition.
3. API Gateway invokes a Lambda function.
4. Lambda returns JSON response with status code 200.

AWS resources in test environment:
- API Gateway (REST API)
- Lambda function (Node.js + TypeScript build output)
- IAM execution role for Lambda
- CloudWatch Log Group
- Optional S3 bucket for deployment artifacts (if packaging manually)

## 3. OpenAPI-First Contract

### 3.1 Contract source of truth
- Keep the API contract in `openapi/openapi.yaml`.
- Start with one path, e.g. `GET /v1/health`.
- Define response schema for status 200.

Example (minimal conceptual shape):
```yaml
openapi: 3.0.3
info:
  title: Enterprise App Scaffold API
  version: 0.1.0
paths:
  /v1/health:
    get:
      operationId: getHealth
      responses:
        '200':
          description: Health response
          content:
            application/json:
              schema:
                type: object
                required: [ok, message]
                properties:
                  ok:
                    type: boolean
                  message:
                    type: string
```

### 3.2 API Gateway and Lambda integration from OpenAPI
- API Gateway must be created directly from `openapi/openapi.yaml` (OpenAPI is the source of truth).
- Lambda integration must be declared in the OpenAPI document using `x-amazon-apigateway-integration` on each operation.
- CloudFormation should import/deploy that same OpenAPI document into API Gateway without redefining routes separately.
- Keep operation IDs stable; they become useful for handler mapping and generated clients later.

Example OpenAPI integration snippet (conceptual):
```yaml
paths:
  /v1/health:
    get:
      operationId: getHealth
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        payloadFormatVersion: "2.0"
        uri: arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${healthLambdaArn}/invocations
      responses:
        '200':
          description: Health response
```

## 4. Proposed Repository Layout

```text
.
├─ .claude/
│  └─ README.md
├─ docs/
│  └─ backend-design.md
├─ openapi/
│  └─ openapi.yaml
├─ src/
│  ├─ handlers/
│  │  └─ get-health.ts
│  └─ types/
├─ test/
│  ├─ unit/
│  │  └─ get-health.test.ts
│  └─ integration/
│     └─ health.api.test.ts
├─ infra/
│  └─ template.yaml
├─ package.json
├─ tsconfig.json
└─ README.md
```

## 5. Local Development and Test Strategy

## 5.1 Unit tests
Purpose:
- Validate Lambda handler behavior in-process.
- Assert status code, headers, and JSON body.

Required stack:
- Test runner: Jest.
- Assertions: Jest built-in `expect`.
- Coverage: Jest coverage reports.

Unit test checks for MVP:
- Returns `statusCode: 200`.
- Returns body containing `{ ok: true, message: "success" }`.
- Returns `content-type: application/json`.

## 5.2 Integration tests (local)
Purpose:
- Validate end-to-end behavior from HTTP request through API emulation into Lambda handler.

Recommended approach:
- Run Lambda + API locally with AWS SAM local (`sam local start-api`).
- Execute integration tests against local endpoint (`http://127.0.0.1:3000/v1/health`).

Integration test checks for MVP:
- HTTP status is 200.
- Response body matches OpenAPI contract.
- Route path is wired correctly.

Notes:
- Local integration tests should run in CI as a separate test stage.
- Keep unit tests fast and broad; keep integration tests small and high-value.

## 6. Build and Packaging

TypeScript build targets Node.js runtime used by Lambda (for example Node.js 20).

Typical build pipeline:
1. `npm ci`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration:local`
5. `npm run build`
6. Package Lambda artifact (zip) from compiled output
7. Deploy CloudFormation stack with AWS CLI

## 7. Deployment to AWS Test Environment (AWS CLI)

This project should deploy as a dedicated **test stack** in one AWS account/region first.

Naming convention example:
- Stack: `enterprise-app-test`
- Lambda: `enterprise-app-test-health`
- API: `enterprise-app-test-api`

## 7.1 Prerequisites
- AWS CLI configured (`aws configure` or SSO profile).
- Valid AWS credentials with permissions for CloudFormation, IAM, Lambda, API Gateway, Logs, and S3 (if used).
- Chosen AWS region exported (example: `us-east-1`).

## 7.2 Deployment model
Use CloudFormation template (`infra/template.yaml`) and deploy with AWS CLI.

Hard requirement:
- API Gateway routes and Lambda integrations must come from the OpenAPI file, not from duplicated route resources in infrastructure code.
- The CloudFormation template should reference/import `openapi/openapi.yaml` (or an S3-uploaded copy of it) as the API definition body.

High-level steps:
1. Build the TypeScript handler.
2. Ensure OpenAPI file includes `x-amazon-apigateway-integration` for the Lambda ARN.
3. Upload artifact(s) to S3 (Lambda zip and OpenAPI file if template references S3 objects).
4. Deploy stack via `aws cloudformation deploy`.
5. Read stack outputs to get API URL.
6. Call endpoint to verify 200 success response.

Example command flow:
```bash
# 1) Build
npm ci
npm run build

# 2) Package artifact (example)
zip -r function.zip dist node_modules package.json

# 3) Upload artifacts
aws s3 cp function.zip s3://<artifact-bucket>/enterprise-app/test/function.zip --region <region>
aws s3 cp openapi/openapi.yaml s3://<artifact-bucket>/enterprise-app/test/openapi.yaml --region <region>

# 4) Deploy stack
aws cloudformation deploy \
  --template-file infra/template.yaml \
  --stack-name enterprise-app-test \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=test \
    ArtifactBucket=<artifact-bucket> \
    ArtifactKey=enterprise-app/test/function.zip \
    OpenApiKey=enterprise-app/test/openapi.yaml \
  --region <region>

# 5) Read outputs
aws cloudformation describe-stacks \
  --stack-name enterprise-app-test \
  --query "Stacks[0].Outputs" \
  --output table \
  --region <region>
```

## 7.3 Post-deploy verification
- Retrieve API base URL from CloudFormation outputs.
- Send request:
```bash
curl <api-base-url>/v1/health
```
- Expected:
  - HTTP 200
  - JSON body with `ok=true` and `message="success"`

## 8. Test Environment Only (for now)

Environment plan at this stage:p
- `test` only.
- No staging or production deployment in this phase.
- Keep resource names explicitly suffixed with `-test`.
- Keep blast radius low with minimal IAM permissions and separate stack.

Future environments (`staging`, `prod`) will be introduced later with:
- Separate stacks/accounts as needed.
- Promotion strategy.
- Stronger release gates.

## 9. Implementation Plan (Next Step)

1. Add baseline TypeScript project scaffolding (`package.json`, `tsconfig.json`).
2. Add `openapi/openapi.yaml` with `GET /v1/health` contract.
3. Add Lambda handler implementing success response.
4. Add unit and local integration tests.
5. Add `infra/template.yaml` for API Gateway + Lambda + IAM.
6. Add deployment script/commands for `test` stack using AWS CLI.
7. Validate full local -> deploy -> invoke flow.

## 10. Risks and Mitigations

- Risk: API and code drift from OpenAPI contract.
  - Mitigation: Contract validation in CI and integration tests against OpenAPI schema.
- Risk: Local behavior diverges from API Gateway behavior.
  - Mitigation: Keep at least one deployed smoke test in test environment after each deploy.
- Risk: Overly broad IAM permissions during bootstrap.
  - Mitigation: Start with least privilege and tighten iteratively.
