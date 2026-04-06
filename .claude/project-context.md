# Project Context

Last updated: 2026-04-06

## Implemented Scope

- TypeScript Lambda handler for GET /v1/health.
- API Gateway routing and Lambda integration defined in infra/template.yaml.
- OpenAPI contract file present at openapi/openapi.yaml.
- OpenAPI contract is not currently wired into SAM deployment.
- Unit and local integration tests are configured with Jest.

## Deployment Notes

- Deploy target is test environment first.
- package:test requires ARTIFACT_BUCKET to be set.
- CloudFormation output currently exposes WebEndpoint base URL.
