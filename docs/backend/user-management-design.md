# Design: User Management & API Authentication

Last updated: 2026-04-18

## 1. Overview

This document defines the design for introducing user management and authenticated API access to the enterprise-app-scaffold. The integration introduces:

- An identity provider (IdP) that owns user records, credentials, and token issuance.
- A request authorizer on API Gateway that rejects any request without a valid, unexpired access token.
- A small set of first-party endpoints for sign-up, sign-in, token refresh, and "who am I".
- A local testing strategy that covers both unit and integration layers without depending on live AWS.
- Cloud resources deployed via the existing SAM template.

After this work, every existing endpoint (starting with `GET /v1/health`) will be inaccessible to unauthenticated callers. An authenticated caller's identity will be available to every handler as a first-class request attribute.

---

## 2. Options Considered

Two options were evaluated, both of which can be hosted entirely in AWS.

### 2.1 Option A — AWS Cognito User Pools (preferred)

A fully managed user directory and OAuth2/OIDC-compliant token issuer. Cognito stores users, hashes passwords, enforces password policies, issues JWTs (ID token, access token, refresh token), supports MFA, and integrates directly with API Gateway as a first-class authorizer.

**Pros**
- No code to write for password storage, hashing, lockout, password reset, email verification, or token signing.
- Native API Gateway integration (`AWS::ApiGateway::Authorizer` of type `COGNITO_USER_POOLS`) — no Lambda authorizer code needed.
- Standard JWTs with public JWKS; any language/runtime can verify.
- MFA, hosted UI, and federation (Google/Azure AD/SAML) are flip-a-switch features we get for free later.
- Charged per monthly active user — cheap at test scale, predictable at production scale.

**Cons**
- Cognito is opinionated — custom password rules, custom token payload shape, and custom flows require Lambda triggers.
- Token payloads cannot be arbitrarily shaped; custom claims go in `custom:` attributes or are injected via a Pre Token Generation trigger.
- Local emulation is imperfect. We either use the `cognito-local` OSS emulator or sign our own test JWTs with a known keypair and stub the JWKS endpoint.

### 2.2 Option B — Self-hosted users table + custom JWT

A `users` table in the existing RDS PostgreSQL database, plus a Lambda-based auth service that hashes passwords with `argon2id`, issues JWTs signed by a KMS-held asymmetric key, and a Lambda authorizer that validates them.

**Pros**
- Complete control over the token payload, user schema, and auth flows.
- No external identity system — one database, one source of truth.
- Trivial to emulate locally (it is just another Postgres table and a Lambda).

**Cons**
- We own password storage, hash upgrades, account lockout, reset-token expiry, email verification delivery, MFA, and session revocation. Every one of these has a well-known failure mode.
- Compliance review surface area is much larger — auditors ask about hashing parameters, salt handling, reset-token entropy, etc.
- We must build and maintain the Lambda authorizer ourselves, including JWKS rotation, key rotation, and clock-skew handling.
- Significantly more code to write, test, and own forever for zero differentiated value.

### 2.3 Recommendation

**Option A (Cognito) is preferred.** User management is undifferentiated heavy lifting for this product; Cognito handles the boring-but-critical security primitives correctly by default and plugs directly into API Gateway. The rest of this document assumes Option A.

---

## 3. Updated Architecture

```
Authenticated request flow (cloud):

  Client
    -> POST /v1/auth/login (Cognito InitiateAuth via Lambda)
       <- { idToken, accessToken, refreshToken }
    -> GET /v1/health
         Authorization: Bearer <accessToken>
       -> API Gateway
          -> Cognito Authorizer (validates JWT via JWKS)
             -> Lambda (get-health)
                -> event.requestContext.authorizer.claims.sub  (user id)
                -> Sequelize -> RDS PostgreSQL
                <- 200

  Unauthenticated request (cloud):

  Client
    -> GET /v1/health             (no Authorization header)
       -> API Gateway
          -> Cognito Authorizer rejects
             <- 401 Unauthorized   (API Gateway never invokes Lambda)
```

---

## 4. Proposed Repository Layout

New and changed files are marked with `*`.

```
.
├── docs/
│   └── backend/
│       └── user-management-design.md            *
├── openapi/
│   └── openapi.yaml                             * (add /v1/auth/* + security schemes)
├── src/
│   ├── auth/                                    *
│   │   ├── cognito-client.ts                    *  AWS SDK CognitoIdentityProvider wrapper
│   │   ├── jwt-verifier.ts                      *  aws-jwt-verify wrapper (used only in unit tests)
│   │   └── request-user.ts                      *  Extracts authenticated user from APIGW event
│   ├── handlers/
│   │   ├── get-health.ts                         * (reads req user; returns it in response)
│   │   ├── post-auth-signup.ts                  *
│   │   ├── post-auth-login.ts                   *
│   │   ├── post-auth-refresh.ts                 *
│   │   └── get-users-me.ts                      *
│   └── db/
│       └── models/
│           └── user.model.ts                    *  Optional mirror of Cognito users (see §6.4)
├── infra/
│   ├── template.yaml                             * (add Cognito + Authorizer + protected routes)
│   └── env.local.json                            * (add Cognito emulator env vars)
├── test/
│   ├── setup/
│   │   ├── cognito-local.ts                     *  Start/stop cognito-local container
│   │   └── test-jwt.ts                          *  Sign test JWTs for unit tests
│   ├── unit/
│   │   ├── request-user.test.ts                 *
│   │   └── post-auth-login.test.ts              *
│   └── integration/
│       ├── auth.api.test.ts                     *
│       └── health.api.test.ts                    * (updated: must send Bearer token)
└── docker-compose.test.yml                       * (add cognito-local service)
```

---

## 5. Cognito Configuration

### 5.1 What Cognito resources we create

| Resource | Purpose |
|---|---|
| **User Pool** | The directory. Owns user records, passwords, email verification status. |
| **User Pool Client** (app client) | The OAuth client our Lambda auth handlers authenticate as. Server-side, with `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH` flows enabled. No client secret (we call from Lambda with IAM, not with a secret). |
| **API Gateway Authorizer** (`COGNITO_USER_POOLS`) | Validates the incoming `Authorization: Bearer <jwt>` on every protected route. Rejects with 401 before Lambda is invoked. |

### 5.2 Token model

Cognito issues three tokens per successful login:

| Token | Purpose | Lifetime (initial) |
|---|---|---|
| **ID token** | Contains user identity claims (`sub`, `email`, `cognito:username`). Consumed by clients that need to display "who am I". Not used for API authorization in this design. | 1 hour |
| **Access token** | Sent as `Authorization: Bearer <accessToken>` to API Gateway. Contains `sub`, `scope`, `token_use: "access"`. This is what the authorizer validates. | 1 hour |
| **Refresh token** | Sent to `POST /v1/auth/refresh` to obtain a new access token without re-entering credentials. Rotation/revocation managed by Cognito. | 30 days |

We standardize on the **access token** for API calls. The authorizer is configured with `IdentitySource: method.request.header.Authorization` and Cognito enforces `token_use` matches the pool.

### 5.3 Custom claims

If/when handlers need additional attributes (e.g. tenant id, role) beyond `sub`/`email`, we add them as custom attributes on the user pool (`custom:tenant_id`, `custom:role`) and surface them in the token via a Pre Token Generation Lambda trigger. Out of scope for this first slice.

---

## 6. Authentication API

### 6.1 Endpoints

| Method | Path | Protected? | Purpose |
|---|---|---|---|
| `POST` | `/v1/auth/signup` | No | Creates a user in the pool. Triggers Cognito email verification. |
| `POST` | `/v1/auth/confirm` | No | Confirms email with the 6-digit code Cognito emailed the user. |
| `POST` | `/v1/auth/login` | No | Exchanges email + password for `{ idToken, accessToken, refreshToken }`. |
| `POST` | `/v1/auth/refresh` | No | Exchanges a `refreshToken` for a new `accessToken` + `idToken`. |
| `GET`  | `/v1/users/me` | **Yes** | Returns the authenticated user's profile. |
| `GET`  | `/v1/health` | **Yes** (changed) | Existing endpoint, now requires auth. |

Auth endpoints are unauthenticated by definition — you cannot require a valid token in order to obtain one. Everything else requires a token.

### 6.2 Login handler sketch (`src/handlers/post-auth-login.ts`)

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { email, password } = JSON.parse(event.body ?? "{}");

  try {
    const result = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID!,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      })
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idToken: result.AuthenticationResult?.IdToken,
        accessToken: result.AuthenticationResult?.AccessToken,
        refreshToken: result.AuthenticationResult?.RefreshToken,
        expiresIn: result.AuthenticationResult?.ExpiresIn,
      }),
    };
  } catch (err) {
    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, message: "invalid credentials" }),
    };
  }
};
```

### 6.3 Reading the authenticated user in a handler (`src/auth/request-user.ts`)

When a request passes the Cognito authorizer, API Gateway injects the decoded JWT claims into `event.requestContext.authorizer.claims`. Handlers should never re-validate the token — API Gateway already did.

```typescript
import type { APIGatewayProxyEvent } from "aws-lambda";

export interface RequestUser {
  sub: string;        // Cognito user id
  email: string;
  username: string;
}

export function getRequestUser(event: APIGatewayProxyEvent): RequestUser {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims?.sub) {
    // Should be impossible behind a configured authorizer; fail loudly.
    throw new Error("missing authorizer claims on authenticated route");
  }
  return {
    sub: claims.sub,
    email: claims.email,
    username: claims["cognito:username"],
  };
}
```

Updated `get-health.ts` uses it:

```typescript
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const user = getRequestUser(event);
  const { Device } = initModels();
  const devices = await Device.findAll();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true, message: "success", user, devices }),
  };
};
```

### 6.4 Do we also mirror users in Postgres?

Not in this slice. Cognito is the source of truth for identity. If/when a handler needs to join against user-owned data (e.g. "all devices owned by user X"), we reference users by their Cognito `sub` as a foreign key string column. If we later need application-specific user attributes (preferences, roles, etc.) we add a `users` table keyed by `sub`, populated via a Cognito Post Confirmation trigger. That is explicitly out of scope here.

---

## 7. Putting the Existing API Behind the Authorizer

### 7.1 The mechanism

API Gateway supports per-method authorizers. When a request arrives:

1. API Gateway reads the `Authorization` header.
2. It calls the configured Cognito authorizer, which validates the JWT signature against the User Pool's public JWKS, checks `exp`, `iss`, and `token_use`.
3. **If validation fails, API Gateway returns 401 immediately. Lambda is never invoked.**
4. If validation succeeds, the decoded claims are attached to the request and Lambda is invoked.

This means the "no endpoint is accessible without auth" guarantee is enforced at the API Gateway layer, not in handler code. Handler code cannot forget to check — the code path is unreachable without a valid token.

### 7.2 Wiring it in SAM

SAM's `AWS::Serverless::Api` resource supports a top-level `Auth` block that declares a default authorizer applied to every route unless explicitly overridden. This is the cleanest way to make auth the default.

```yaml
Resources:

  # ---- Cognito ----

  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub enterprise-app-${Environment}-users
      AutoVerifiedAttributes: [email]
      UsernameAttributes: [email]
      Policies:
        PasswordPolicy:
          MinimumLength: 12
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: false

  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref UserPool
      ClientName: !Sub enterprise-app-${Environment}-app
      GenerateSecret: false
      ExplicitAuthFlows:
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH

  # ---- API with default Cognito authorizer ----

  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn
            Identity:
              Header: Authorization

  # ---- Protected function (default authorizer applies) ----

  healthFunction:
    Type: AWS::Serverless::Function
    Properties:
      # ... existing properties ...
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /v1/health
            Method: GET

  # ---- Unauthenticated auth endpoints (explicitly opt out) ----

  loginFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ../
      Handler: dist/handlers/post-auth-login.handler
      Runtime: nodejs22.x
      Environment:
        Variables:
          COGNITO_CLIENT_ID: !Ref UserPoolClient
      Policies:
        - Statement:
            - Effect: Allow
              Action:
                - cognito-idp:InitiateAuth
              Resource: !GetAtt UserPool.Arn
      Events:
        Api:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /v1/auth/login
            Method: POST
            Auth:
              Authorizer: NONE        # explicit opt-out
```

### 7.3 Key point

`DefaultAuthorizer: CognitoAuthorizer` at the API level means **every new route added to this API is authenticated by default**. The only way to expose an unauthenticated route is to write `Auth: { Authorizer: NONE }` on that event — which is visible in diff review. This is the configuration we want: secure-by-default, with opt-outs that are loud.

---

## 8. Local Testing Strategy

The hardest part of adopting Cognito is preserving the fast local test loop we already have. The plan is two-layered: unit tests use signed-locally JWTs and never talk to Cognito; integration tests use the `cognito-local` emulator.

### 8.1 Unit tests — sign our own JWTs

Unit tests exercise handler logic in-process. They do not go through API Gateway, so the authorizer does not run. Instead, the unit test helper constructs a fake `APIGatewayProxyEvent` with pre-populated `requestContext.authorizer.claims` — exactly what API Gateway would have populated had the request been real.

```typescript
// test/setup/test-jwt.ts
import type { APIGatewayProxyEvent } from "aws-lambda";

export function eventWithUser(
  partial: Partial<APIGatewayProxyEvent>,
  user = { sub: "user-1", email: "test@example.com", username: "test@example.com" }
): APIGatewayProxyEvent {
  return {
    ...partial,
    requestContext: {
      ...(partial.requestContext ?? {}),
      authorizer: {
        claims: {
          sub: user.sub,
          email: user.email,
          "cognito:username": user.username,
        },
      },
    },
  } as APIGatewayProxyEvent;
}
```

Unit test example:

```typescript
// test/unit/get-health.test.ts
it("returns the authenticated user's sub in the response", async () => {
  const event = eventWithUser({}, { sub: "abc-123", email: "a@b.com", username: "a@b.com" });
  const result = await handler(event);
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body).user.sub).toBe("abc-123");
});

it("throws when authorizer claims are missing", async () => {
  await expect(handler({} as APIGatewayProxyEvent)).rejects.toThrow(/missing authorizer/);
});
```

This tests the code we own — the handler, `getRequestUser`, and their interaction — without depending on Cognito at all.

For the login handler specifically, we stub the `CognitoIdentityProviderClient` using `aws-sdk-client-mock`:

```typescript
// test/unit/post-auth-login.test.ts
import { mockClient } from "aws-sdk-client-mock";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => cognitoMock.reset());

it("returns tokens on valid credentials", async () => {
  cognitoMock.on(InitiateAuthCommand).resolves({
    AuthenticationResult: {
      IdToken: "id", AccessToken: "access", RefreshToken: "refresh", ExpiresIn: 3600,
    },
  });
  const result = await handler({ body: JSON.stringify({ email: "a@b.com", password: "p" }) } as any);
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body).accessToken).toBe("access");
});

it("returns 401 on NotAuthorizedException", async () => {
  cognitoMock.on(InitiateAuthCommand).rejects(new Error("NotAuthorizedException"));
  const result = await handler({ body: JSON.stringify({ email: "a@b.com", password: "wrong" }) } as any);
  expect(result.statusCode).toBe(401);
});
```

### 8.2 Integration tests — cognito-local

SAM local by itself does not emulate API Gateway Cognito authorizers — it treats authorizer-protected routes as if the authorizer always passes (claims will be empty). That is not good enough if we want to prove the auth wiring works end-to-end locally.

The fix is the OSS [`cognito-local`](https://github.com/jagregory/cognito-local) project: a Node server that implements the Cognito IDP API (sign up, confirm, initiate auth) on `localhost:9229`. We point our Lambda code at it by overriding the SDK endpoint in `env.local.json`.

**Extend `docker-compose.test.yml`:**

```yaml
services:
  postgres:
    # ... existing ...

  cognito:
    image: jagregory/cognito-local:latest
    container_name: enterprise-app-cognito-test
    ports:
      - "9229:9229"
    volumes:
      - ./test/setup/cognito-local-seed:/app/.cognito   # pre-seeded pool + users
```

**Extend `infra/env.local.json`:**

```json
{
  "healthFunction": {
    "DB_HOST": "host.docker.internal",
    "DB_PORT": "5432",
    "DB_NAME": "enterprise_app",
    "DB_USERNAME": "postgres",
    "DB_PASSWORD": "postgres"
  },
  "loginFunction": {
    "COGNITO_CLIENT_ID": "local-test-client-id",
    "COGNITO_ENDPOINT": "http://host.docker.internal:9229",
    "AWS_REGION": "local"
  }
}
```

Handlers read `COGNITO_ENDPOINT` (when set) and pass it to the SDK:

```typescript
const cognito = new CognitoIdentityProviderClient({
  endpoint: process.env.COGNITO_ENDPOINT,   // undefined in cloud; set locally
});
```

**Integration test flow:**

```typescript
// test/integration/auth.api.test.ts
it("rejects GET /v1/health without a token", async () => {
  const res = await fetch("http://127.0.0.1:3000/v1/health");
  expect(res.status).toBe(401);
});

it("accepts GET /v1/health with a valid token", async () => {
  const loginRes = await fetch("http://127.0.0.1:3000/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "seed@example.com", password: "SeedPassword123" }),
  });
  const { accessToken } = await loginRes.json();

  const res = await fetch("http://127.0.0.1:3000/v1/health", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.status).toBe(200);
});
```

### 8.3 Caveat on SAM local authorizer behavior

SAM local's support for Cognito authorizers has historically been partial — it validates the presence of the header but does not always verify the token signature against a local JWKS. Two mitigations:

1. **Accept it for local integration tests.** The goal of local integration is to prove wiring and handler behavior. Token signature verification is exercised in a deployed smoke test (§9.4).
2. **Optional: add a local Lambda authorizer.** If we want the "reject invalid tokens locally" behavior, we add a parallel Lambda authorizer resource that is only used in local mode (conditioned on `Environment=local`) and validates tokens against `cognito-local`'s JWKS endpoint. This is extra complexity and only worth it if the gap actually bites us.

Default recommendation: start without the local Lambda authorizer, add it only if a real bug slips through because of the gap.

### 8.4 Local test flow summary

```
Unit tests:
  1. docker compose up (postgres only)
  2. sequelize db:migrate
  3. jest --selectProjects unit        (JWTs are synthesized in-process)
  4. docker compose down

Integration tests:
  1. docker compose up (postgres + cognito-local)
  2. sequelize db:migrate
  3. seed cognito-local with a test user
  4. sam local start-api (with --env-vars pointing to local PG + cognito-local)
  5. jest --selectProjects integration
  6. teardown
```

---

## 9. Cloud Deployment

### 9.1 What gets deployed

| Resource | Notes |
|---|---|
| `AWS::Cognito::UserPool` | Directory. Email as username. Password policy enforced. |
| `AWS::Cognito::UserPoolClient` | Server-side client, no secret, `USER_PASSWORD_AUTH` + `REFRESH_TOKEN_AUTH` flows. |
| `AWS::Serverless::Api` | Explicit API resource (we previously relied on the implicit one) so we can attach `DefaultAuthorizer`. |
| Four new `AWS::Serverless::Function`s | `signup`, `confirm`, `login`, `refresh` (all with `Auth: NONE`), plus `getUsersMe` (default authorizer). |
| IAM policy on auth Lambdas | Scoped to `cognito-idp:InitiateAuth`, `cognito-idp:SignUp`, `cognito-idp:ConfirmSignUp`, `cognito-idp:RespondToAuthChallenge` on the specific User Pool ARN. |

### 9.2 Environment variable summary (Lambda)

| Variable | Local | Cloud |
|---|---|---|
| `COGNITO_CLIENT_ID` | `local-test-client-id` | `!Ref UserPoolClient` |
| `COGNITO_USER_POOL_ID` | `local_test` | `!Ref UserPool` |
| `COGNITO_ENDPOINT` | `http://host.docker.internal:9229` | unset (SDK uses real Cognito) |
| `AWS_REGION` | `local` | set by Lambda runtime |

### 9.3 Deployment order

Because Cognito, the API, and the functions are all in the same template, a single `sam deploy` handles it. Order of creation within the stack is dependency-driven by CloudFormation — the User Pool is created before the Authorizer, which is created before the API is usable.

```
1. npm ci && npm run build
2. sam package / sam deploy
3. Capture outputs: ApiUrl, UserPoolId, UserPoolClientId
4. Create a verified test user via AWS CLI (admin-create-user + admin-set-user-password)
5. Smoke test:
     curl -X POST <ApiUrl>/v1/auth/login -d '{"email":"...","password":"..."}'
     -> expect 200 with accessToken
     curl <ApiUrl>/v1/health                              -> expect 401
     curl <ApiUrl>/v1/health -H "Authorization: Bearer $TOKEN" -> expect 200
```

### 9.4 Deployed smoke test as a guard

A post-deploy script runs the three-call smoke sequence above and fails the deploy if any assertion fails. This catches the SAM-local gap described in §8.3 — if an invalid token is accepted by the deployed stack, the smoke test will notice.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| **SAM local does not fully emulate the Cognito authorizer.** Tests may pass locally but fail in the cloud (or vice versa). | Treat the deployed smoke test (§9.4) as the source of truth for "auth is wired correctly". Keep local integration focused on handler behavior, not authorizer behavior. |
| **`cognito-local` drifts behind real Cognito's API.** | Pin the container image tag. When a real Cognito call fails in the cloud that worked locally, update the pin and add a regression test. |
| **Handlers forget to treat a route as protected.** | `DefaultAuthorizer` on the API means protection is the default, not the exception. Opt-outs are explicit `Auth: { Authorizer: NONE }` lines — visible in code review. |
| **Refresh tokens leak from clients.** | Out-of-scope for this slice (client concern). Server-side we enable refresh token revocation on the User Pool Client and document the Cognito `GlobalSignOut` operation. |
| **Cost surprise at scale.** | Cognito is billed per MAU; at test volume this is pennies. Track MAU in the monthly cost review once we reach staging. |
| **Breaking `/v1/health` existing callers.** | `/v1/health` currently has no authenticated callers (scaffold-only), so flipping it to protected is safe. If that changes before this ships, add a second unauthenticated liveness endpoint (e.g. `/v1/ping`) for load balancer health checks. |

---

## 11. Implementation Steps

1. Add Cognito resources (`UserPool`, `UserPoolClient`) to `infra/template.yaml`.
2. Convert the implicit API to an explicit `AWS::Serverless::Api` with a `DefaultAuthorizer`.
3. Add `src/auth/request-user.ts` and its unit tests.
4. Add auth Lambda handlers: signup, confirm, login, refresh (with `Auth: NONE`).
5. Add `src/handlers/get-users-me.ts` (uses default authorizer).
6. Update `src/handlers/get-health.ts` to read and return the authenticated user.
7. Extend `docker-compose.test.yml` with the `cognito-local` service and seed data.
8. Update `infra/env.local.json` with Cognito env vars for every function.
9. Add `aws-sdk-client-mock` to dev dependencies; write unit tests for each auth handler.
10. Write integration tests asserting: (a) 401 without token, (b) 200 with valid token, (c) login returns well-formed tokens.
11. Add a post-deploy smoke-test script that exercises the unauth-401 / auth-200 path against the deployed stack.
12. Update `openapi/openapi.yaml` with `/v1/auth/*` paths and a `securitySchemes` entry for the bearer token (documentation-only for now, since the deployment does not yet import OpenAPI).
13. Update `README.md` and `docs/backend/backend-design.md` to reflect that all non-auth endpoints require a bearer token.
