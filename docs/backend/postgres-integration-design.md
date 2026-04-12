# Design: PostgreSQL Integration with Sequelize ORM

## 1. Overview

This document defines the design for adding PostgreSQL to the enterprise-app-scaffold. The integration introduces:

- **Sequelize** as the ORM for all database interactions.
- A `devices` table as the first and only table.
- An update to the `GET /v1/health` endpoint that queries all devices to verify full-stack connectivity.
- A local PostgreSQL container for unit and integration testing.
- An AWS RDS PostgreSQL instance deployed via CloudFormation/SAM for the test environment.

After this work, a successful health check means: Lambda can reach the database, execute a query, and return results.

---

## 2. Updated Architecture

```
Request flow (cloud):

  Client
    -> API Gateway
      -> Lambda (get-health)
        -> Sequelize ORM
          -> RDS PostgreSQL

Request flow (local):

  Integration test (HTTP)
    -> SAM local start-api (localhost:3000)
      -> Lambda (get-health)
        -> Sequelize ORM
          -> Docker PostgreSQL (localhost:5432)

  Unit test (in-process):
    -> handler function
      -> Sequelize ORM
        -> Docker PostgreSQL (localhost:5432)
```

---

## 3. Proposed Repository Layout

New and changed files are marked with `*`.

```
.
├── docs/
│   └── backend/
│       ├── backend-design.md
│       └── postgres-integration-design.md          *
├── openapi/
│   └── openapi.yaml                                * (updated response schema)
├── src/
│   ├── db/                                         *
│   │   ├── config.ts                               *  Database connection config
│   │   ├── connection.ts                            *  Sequelize instance factory
│   │   └── models/                                 *
│   │       ├── index.ts                            *  Model registration & export
│   │       └── device.model.ts                     *  Device model definition
│   ├── handlers/
│   │   └── get-health.ts                            * (updated to query devices)
│   └── migrations/                                 *
│       └── 20260412000000-create-devices-table.ts  *  Initial migration
├── infra/
│   ├── template.yaml                                * (add RDS, VPC, security groups)
│   └── samconfig.toml
├── test/
│   ├── setup/                                      *
│   │   └── docker-postgres.ts                      *  Start/stop container helper
│   ├── unit/
│   │   └── get-health.test.ts                       * (updated)
│   └── integration/
│       └── health.api.test.ts                       * (updated)
├── docker-compose.test.yml                         *  Postgres container for tests
├── .sequelizerc                                    *  Sequelize CLI path config
├── package.json                                     * (new dependencies)
└── tsconfig.json
```

---

## 4. Database Schema

### 4.1 Where schemas are defined

Schemas are defined in two places, each serving a distinct purpose:

| Artifact | Location | Purpose |
|---|---|---|
| **Migrations** | `src/migrations/` | Source of truth for the database schema. Each migration is a versioned, ordered change applied to the database. Migrations create, alter, and drop tables. |
| **Models** | `src/db/models/` | TypeScript representation of each table used by Sequelize at runtime. Models define column types, associations, and query helpers. Models must stay in sync with migrations. |

Migrations are the authority on what the database looks like. Models are the authority on how application code interacts with it.

### 4.2 `devices` table

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Auto-generated UUID. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Human-readable device name. |
| `status` | `VARCHAR(50)` | `NOT NULL`, `DEFAULT 'active'` | Device status (e.g., `active`, `inactive`). |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT NOW()` | Row creation time. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`, `DEFAULT NOW()` | Last update time. |

---

## 5. Sequelize Configuration

### 5.1 Connection config (`src/db/config.ts`)

Database connection parameters are read from environment variables so the same code works locally and in AWS.

```typescript
export interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: "postgres";
  logging: boolean;
}

export function loadDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "enterprise_app",
    username: process.env.DB_USERNAME ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    dialect: "postgres",
    logging: process.env.DB_LOGGING === "true",
  };
}
```

### 5.2 Sequelize instance (`src/db/connection.ts`)

A singleton Sequelize instance, initialized once per Lambda cold start.

```typescript
import { Sequelize } from "sequelize";
import { loadDbConfig } from "./config";

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const config = loadDbConfig();
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging ? console.log : false,
        pool: {
          max: 2,     // Lambda has limited connections
          min: 0,
          idle: 5000,
          acquire: 30000,
        },
      }
    );
  }
  return sequelize;
}
```

> **Note on Lambda connection pooling:** Lambda concurrency means each instance holds its own pool. `max: 2` keeps connection count low. For production workloads, consider RDS Proxy to multiplex connections across Lambda instances.

### 5.3 `.sequelizerc` (project root)

Tells the Sequelize CLI where to find config, models, and migrations so that CLI commands like `npx sequelize-cli db:migrate` work correctly.

```javascript
const path = require("path");

module.exports = {
  config: path.resolve("src", "db", "config.ts"),
  "models-path": path.resolve("src", "db", "models"),
  "migrations-path": path.resolve("src", "migrations"),
};
```

---

## 6. Model Definition

### 6.1 Device model (`src/db/models/device.model.ts`)

```typescript
import { DataTypes, Model, Sequelize } from "sequelize";

export interface DeviceAttributes {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeviceCreationAttributes = Omit<DeviceAttributes, "id" | "createdAt" | "updatedAt">;

export class Device extends Model<DeviceAttributes, DeviceCreationAttributes>
  implements DeviceAttributes {
  declare id: string;
  declare name: string;
  declare status: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initDeviceModel(sequelize: Sequelize): typeof Device {
  Device.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "active",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "devices",
      underscored: true,    // maps createdAt -> created_at in SQL
      timestamps: true,
    }
  );
  return Device;
}
```

### 6.2 Model index (`src/db/models/index.ts`)

Central registration point. Every new model gets imported and initialized here.

```typescript
import { getSequelize } from "../connection";
import { Device, initDeviceModel } from "./device.model";

let initialized = false;

export function initModels(): { Device: typeof Device } {
  if (!initialized) {
    const sequelize = getSequelize();
    initDeviceModel(sequelize);
    initialized = true;
  }
  return { Device };
}
```

---

## 7. Migrations

### 7.1 Where migrations live

All migrations live in `src/migrations/`. Each file is a timestamped TypeScript file following the naming convention:

```
YYYYMMDDHHMMSS-<description>.ts
```

### 7.2 Initial migration (`src/migrations/20260412000000-create-devices-table.ts`)

```typescript
import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable("devices", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "active",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable("devices");
}
```

### 7.3 Creating a new migration

To create a new migration:

```bash
# Generate a blank timestamped migration file
npx sequelize-cli migration:generate --name <description>
```

This creates a file in `src/migrations/` with stub `up` and `down` functions. The developer fills in the schema changes.

### 7.4 Running migrations

```bash
# Apply all pending migrations
npx sequelize-cli db:migrate

# Undo the most recent migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

For local development and testing, migrations are run against the Docker PostgreSQL container. For cloud environments, migrations are run as a deployment step (see Section 10).

### 7.5 Migration npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo",
    "db:migrate:generate": "sequelize-cli migration:generate --name"
  }
}
```

---

## 8. Updated Health Endpoint

### 8.1 Handler (`src/handlers/get-health.ts`)

The health endpoint queries all devices from the database. A successful response proves Lambda-to-database connectivity.

```typescript
import type { APIGatewayProxyResult } from "aws-lambda";
import { initModels } from "../db/models";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const { Device } = initModels();
    const devices = await Device.findAll();

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "success",
        devices,
      }),
    };
  } catch (error) {
    console.error("Health check failed:", error);
    return {
      statusCode: 503,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        message: "database connection failed",
      }),
    };
  }
};
```

### 8.2 Updated OpenAPI response schema

The `GET /v1/health` response schema in `openapi/openapi.yaml` is updated to include the `devices` array:

```yaml
responses:
  '200':
    description: Health response with device list
    content:
      application/json:
        schema:
          type: object
          required: [ok, message, devices]
          properties:
            ok:
              type: boolean
            message:
              type: string
            devices:
              type: array
              items:
                type: object
                required: [id, name, status]
                properties:
                  id:
                    type: string
                    format: uuid
                  name:
                    type: string
                  status:
                    type: string
  '503':
    description: Database unreachable
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

---

## 9. Local Testing Infrastructure

### 9.1 Docker Compose (`docker-compose.test.yml`)

A dedicated compose file for spinning up PostgreSQL during testing. Kept separate from any future application compose file.

```yaml
services:
  postgres:
    image: postgres:16
    container_name: enterprise-app-postgres-test
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: enterprise_app
    tmpfs:
      - /var/lib/postgresql/data    # RAM-backed storage for speed
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 5s
      retries: 10
```

Key decisions:
- **`tmpfs` mount:** Data is stored in memory, not disk. Tests run faster and nothing persists between runs.
- **Port 5432:** Standard PostgreSQL port, matches the default in `src/db/config.ts`.
- **Healthcheck:** Ensures the container is ready before tests start.

### 9.2 Test lifecycle helper (`test/setup/docker-postgres.ts`)

A helper module that starts the container, runs migrations, and tears it down. Used by both unit and integration test setups.

```typescript
import { execSync } from "child_process";
import { getSequelize } from "../../src/db/connection";

const COMPOSE_FILE = "docker-compose.test.yml";

export async function startPostgres(): Promise<void> {
  // Start container and wait for healthcheck
  execSync(
    `docker compose -f ${COMPOSE_FILE} up -d --wait`,
    { stdio: "inherit" }
  );

  // Run migrations against the local container
  execSync("npm run db:migrate", { stdio: "inherit" });
}

export async function stopPostgres(): Promise<void> {
  // Close Sequelize connection pool
  const sequelize = getSequelize();
  await sequelize.close();

  // Tear down container
  execSync(
    `docker compose -f ${COMPOSE_FILE} down -v`,
    { stdio: "inherit" }
  );
}
```

### 9.3 Unit tests

Unit tests run the handler function in-process against the local PostgreSQL container. No HTTP layer, no SAM.

**Jest global setup (unit):**

```typescript
// test/unit/setup.ts
import { startPostgres, stopPostgres } from "../setup/docker-postgres";

beforeAll(async () => {
  await startPostgres();
});

afterAll(async () => {
  await stopPostgres();
});
```

**Updated unit test (`test/unit/get-health.test.ts`):**

```typescript
import { handler } from "../../src/handlers/get-health";

describe("get-health handler", () => {
  it("returns HTTP 200 with devices array", async () => {
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(Array.isArray(body.devices)).toBe(true);
  });
});
```

### 9.4 Integration tests

Integration tests hit the SAM local HTTP endpoint. The PostgreSQL container must be running and accessible to the SAM-hosted Lambda. SAM local runs Lambda in a Docker container, so the database host must be reachable from within Docker.

**Environment variable forwarding for SAM local:**

Create `infra/env.local.json` to pass database connection variables to the Lambda container:

```json
{
  "healthFunction": {
    "DB_HOST": "host.docker.internal",
    "DB_PORT": "5432",
    "DB_NAME": "enterprise_app",
    "DB_USERNAME": "postgres",
    "DB_PASSWORD": "postgres"
  }
}
```

> `host.docker.internal` allows the SAM Lambda container to reach the PostgreSQL container on the host network.

**Updated SAM local start command:**

```bash
sam local start-api \
  --template infra/template.yaml \
  --port 3000 \
  --env-vars infra/env.local.json
```

**Updated npm scripts in `package.json`:**

```json
{
  "scripts": {
    "pretest:start-db": "docker compose -f docker-compose.test.yml up -d --wait && npm run db:migrate",
    "posttest:stop-db": "docker compose -f docker-compose.test.yml down -v",
    "sam:local:start": "sam local start-api --template infra/template.yaml --port 3000 --env-vars infra/env.local.json",
    "test:integration:local": "npm run pretest:start-db && start-server-and-test \"npm run sam:local:start\" http://127.0.0.1:3000/v1/health \"npm run test:integration\" ; npm run posttest:stop-db"
  }
}
```

**Updated integration test (`test/integration/health.api.test.ts`):**

```typescript
describe("GET /v1/health (local API integration)", () => {
  it("returns HTTP 200 with devices from the database", async () => {
    const response = await fetch("http://127.0.0.1:3000/v1/health");

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(Array.isArray(body.devices)).toBe(true);
  });
});
```

### 9.5 Local test flow summary

```
Unit tests:
  1. docker compose up (PostgreSQL)
  2. sequelize db:migrate
  3. jest --selectProjects unit
  4. docker compose down

Integration tests:
  1. docker compose up (PostgreSQL)
  2. sequelize db:migrate
  3. sam local start-api (with --env-vars pointing Lambda to local PG)
  4. jest --selectProjects integration
  5. sam local stop + docker compose down
```

---

## 10. Cloud Infrastructure (RDS via CloudFormation)

### 10.1 Resources added to `infra/template.yaml`

The SAM template gains VPC networking resources and an RDS PostgreSQL instance.

```yaml
Parameters:
  Environment:
    Type: String
    Default: test
  DBUsername:
    Type: String
    Default: postgres
    NoEcho: true
  DBPassword:
    Type: String
    NoEcho: true

Resources:

  # ---- VPC & Networking ----

  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub enterprise-app-${Environment}-vpc

  PrivateSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub enterprise-app-${Environment}-private-a

  PrivateSubnetB:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub enterprise-app-${Environment}-private-b

  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnets for RDS
      SubnetIds:
        - !Ref PrivateSubnetA
        - !Ref PrivateSubnetB

  # ---- Security Groups ----

  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Lambda functions
      VpcId: !Ref VPC

  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for RDS PostgreSQL
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref LambdaSecurityGroup

  # ---- RDS PostgreSQL ----

  PostgresInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub enterprise-app-${Environment}-db
      Engine: postgres
      EngineVersion: "16"
      DBInstanceClass: db.t4g.micro          # Smallest instance for test
      AllocatedStorage: 20
      StorageType: gp3
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      DBName: enterprise_app
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      DBSubnetGroup: !Ref DBSubnetGroup
      PubliclyAccessible: false
      DeletionProtection: false              # Test only; enable in prod
      BackupRetentionPeriod: 1

  # ---- Updated Lambda ----

  healthFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ../dist
      Handler: handlers/get-health.handler
      Runtime: nodejs22.x
      Architectures:
        - x86_64
      MemorySize: 128
      Timeout: 100
      Description: Health endpoint Lambda function.
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnetA
          - !Ref PrivateSubnetB
      Environment:
        Variables:
          DB_HOST: !GetAtt PostgresInstance.Endpoint.Address
          DB_PORT: !GetAtt PostgresInstance.Endpoint.Port
          DB_NAME: enterprise_app
          DB_USERNAME: !Ref DBUsername
          DB_PASSWORD: !Ref DBPassword
      Events:
        Api:
          Type: Api
          Properties:
            Path: /v1/health
            Method: GET
      Policies:
        - VPCAccessPolicy: {}
```

### 10.2 Key infrastructure decisions

| Decision | Rationale |
|---|---|
| **Private subnets only** | RDS is not publicly accessible. Lambda connects over the private VPC. |
| **`db.t4g.micro`** | Smallest Graviton instance. Adequate for test workloads, cheap to run. |
| **Two subnets in different AZs** | Required by RDS subnet groups. Provides HA foundation for future multi-AZ. |
| **Security group ingress from Lambda SG only** | Only Lambda can reach PostgreSQL on port 5432. No public access. |
| **Password via parameter (NoEcho)** | Password is not stored in plaintext in the template. For production, use AWS Secrets Manager instead. |
| **gp3 storage** | Baseline IOPS at no extra cost. Sufficient for test. |

### 10.3 Cloud migration strategy

Migrations must run after RDS is available but before traffic is routed to the new Lambda code. Options:

**Option A: Pre-deploy migration step (recommended for now)**

Run migrations from a local machine or CI runner that has network access to the RDS instance (via bastion host, VPN, or SSM port forwarding).

```bash
# Forward RDS port through SSM to localhost
aws ssm start-session \
  --target <bastion-instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"<rds-endpoint>\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5432\"]}"

# In another terminal, run migrations
DB_HOST=localhost DB_PORT=5432 DB_NAME=enterprise_app \
  DB_USERNAME=postgres DB_PASSWORD=<password> \
  npm run db:migrate
```

**Option B: Custom CloudFormation resource (future)**

A dedicated Lambda function triggered by CloudFormation that runs migrations as part of the deployment. More automated but more complex to set up.

### 10.4 Updated deployment flow

```
1. npm ci && npm run build
2. Deploy CloudFormation stack (creates/updates RDS + Lambda)
3. Wait for RDS to be available
4. Run migrations against RDS (via SSM port forwarding or bastion)
5. Smoke test: curl <api-url>/v1/health
6. Verify response: { ok: true, message: "success", devices: [...] }
```

---

## 11. New Dependencies

Added to `package.json`:

```json
{
  "dependencies": {
    "pg": "^8.13.0",
    "sequelize": "^6.37.0"
  },
  "devDependencies": {
    "sequelize-cli": "^6.6.0",
    "@types/pg": "^8.11.0"
  }
}
```

> `sequelize` and `pg` are runtime dependencies (bundled with Lambda). `sequelize-cli` is dev-only, used for running migrations locally and in CI.

---

## 12. Environment Variables Summary

| Variable | Local (unit/integration) | Cloud (Lambda) |
|---|---|---|
| `DB_HOST` | `localhost` / `host.docker.internal` | RDS endpoint (injected by CloudFormation) |
| `DB_PORT` | `5432` | RDS port (injected by CloudFormation) |
| `DB_NAME` | `enterprise_app` | `enterprise_app` |
| `DB_USERNAME` | `postgres` | CloudFormation parameter |
| `DB_PASSWORD` | `postgres` | CloudFormation parameter |
| `DB_LOGGING` | `true` (optional) | `false` |

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| **Lambda cold start latency increases** with VPC attachment. | Use provisioned concurrency if latency becomes a problem. VPC cold starts have improved significantly with AWS Hyperplane. |
| **Connection exhaustion** if Lambda scales to many concurrent instances. | Keep pool `max: 2` per Lambda. Introduce RDS Proxy before production to multiplex connections. |
| **Migration/model drift** where the Sequelize model and migration disagree. | Enforce a review checklist: every migration PR must update the corresponding model. |
| **Plaintext password in CloudFormation parameters.** | Acceptable for test. Before staging/prod, switch to Secrets Manager with `resolve:ssm` or `resolve:secretsmanager` dynamic references. |
| **Docker required for local testing.** | Docker Desktop or Colima must be installed. Document this prerequisite in the README. |

---

## 14. Implementation Steps

1. Install dependencies (`sequelize`, `pg`, `sequelize-cli`, `@types/pg`).
2. Create `src/db/config.ts`, `src/db/connection.ts`.
3. Create `src/db/models/device.model.ts` and `src/db/models/index.ts`.
4. Create initial migration `src/migrations/20260412000000-create-devices-table.ts`.
5. Add `.sequelizerc` to project root.
6. Add `docker-compose.test.yml`.
7. Create `test/setup/docker-postgres.ts` helper.
8. Update `src/handlers/get-health.ts` to query devices.
9. Update `openapi/openapi.yaml` response schema.
10. Update `infra/template.yaml` with VPC, security groups, and RDS.
11. Create `infra/env.local.json` for SAM local env vars.
12. Update `package.json` scripts for database and test lifecycle.
13. Update `jest.config.cjs` to wire up database setup/teardown.
14. Update `README.md` with new prerequisites and commands.
