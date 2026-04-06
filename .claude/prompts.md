# Reusable Prompts

## README Accuracy Pass

Review README.md against infra/template.yaml, package.json scripts, and implemented handlers/tests. Update wording to match current behavior only.

## Context Sync Pass

Update CLAUDE.md and .claude/project-context.md after any changes to routes, deployment wiring, scripts, or test workflow.

## Deployment Wiring Check

Verify whether openapi/openapi.yaml is imported by infra/template.yaml. If not wired, ensure docs do not claim OpenAPI-driven deployment.
