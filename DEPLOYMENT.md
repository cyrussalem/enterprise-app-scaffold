# Deployment Guide

This guide covers deploying the Enterprise App Scaffold to AWS after completing `aws sso login` (or equivalent credential setup). It covers SAM backend infrastructure, database migrations, and an optional CloudFront frontend deployment.

> **Shell note (Windows):** Part 1 and Part 3 commands are written for **PowerShell**. The migration scripts in Part 2 use bash syntax (`$()`, `export`, `\` continuation) — run those in **Git Bash** or **WSL** if you're on Windows, or adapt them manually.

---

## Prerequisites

Ensure these tools are installed and on your PATH:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x | https://nodejs.org |
| AWS CLI | v2 | https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html |
| SAM CLI | latest | https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html |

> **Docker not required.** The Lambda uses SAM's esbuild bundler, which runs natively on your machine. `sam build --use-container` (Docker-based) is not used here.

Verify credentials are active:

```bash
aws sts get-caller-identity
```

You should see your Account ID, User ID, and ARN. If you get an error, re-run your login command.

---

## Part 1 — Build & SAM Deploy

### Step 1: Install dependencies

```bash
npm ci
```

### Step 2: SAM build (compiles TypeScript via esbuild)

`npm ci` (Step 1) installs `esbuild` as a devDependency. SAM detects it in `node_modules/.bin/` and uses it to compile TypeScript directly from `src/` and bundle all dependencies into a single small file — no separate `npm run build` step is needed for deployment.

```bash
sam build --template-file infra/template.yaml
```

The build output lands in `.aws-sam/build/apiFunction/`. A successful build prints `Build Succeeded` with a list of built resources.

> **Note:** `npm run build` (outputs to `dist/`) is still used for **local development** with the Express dev server. For AWS deployment, `sam build` replaces it.

### Step 3: Deploy the stack

The SAM template is at `infra/template.yaml`. It provisions:
- VPC with two private subnets
- RDS PostgreSQL 16 (`db.t4g.micro`) in the private subnets
- Cognito User Pool and App Client
- API Gateway (REST) with a Cognito authorizer
- Lambda function (`nodejs22.x`, 256 MB, 100 s timeout) wired to all API routes

Run the deployment. Replace the `DBPassword` value with a strong password you choose — store it somewhere safe (you will need it again for migrations).

**PowerShell:**
```powershell
sam deploy `
  --stack-name enterprise-app-test `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides Environment=test DBUsername=postgres DBPassword=YOUR_STRONG_PASSWORD_HERE `
  --resolve-s3 `
  --confirm-changeset
```

**Bash / macOS / Linux:**
```bash
sam deploy \
  --stack-name enterprise-app-test \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment=test DBUsername=postgres DBPassword=YOUR_STRONG_PASSWORD_HERE \
  --resolve-s3 \
  --confirm-changeset
```

> **Important:** Do not add `--template-file` to the deploy command. After `sam build`, SAM uses `.aws-sam/build/template.yaml` which contains the esbuild bundle (~12 MB). Passing `--template-file infra/template.yaml` would bypass the build output and repackage the raw source directory — causing the 262 MB size limit error.

SAM will print a changeset summary and prompt you to confirm before making any changes. Review it, then type `y`.

> **First deploy only**: `--resolve-s3` automatically creates a managed S3 bucket for deployment artifacts. On subsequent deploys this flag is optional (the bucket already exists).

The deploy takes approximately **5–10 minutes** — most of that is RDS instance creation.

### Step 4: Capture stack outputs

Once the deploy succeeds, retrieve the outputs you will need in later steps:

```powershell
aws cloudformation describe-stacks `
  --stack-name enterprise-app-test `
  --query "Stacks[0].Outputs" `
  --output table
```

Note down these values:

| Output Key | What it is |
|---|---|
| `WebEndpoint` | API Gateway base URL (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/test/`) |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito App Client ID |
| `DBEndpoint` | RDS hostname |

Save them as PowerShell variables for the steps below (replace placeholder values with your actual outputs):

```powershell
$env:API_URL    = "https://8qzl33t0k8.execute-api.us-east-1.amazonaws.com/test/"
$env:USER_POOL_ID = "us-east-1_mirfldD7Z"
$env:CLIENT_ID  = "69jmukc6pvp77hcb370nd17ql7"
$env:DB_HOST    = "enterprise-app-test-db.cfwczakbdqaj.us-east-1.rds.amazonaws.com"
$env:DB_PORT    = "5432"
$env:DB_NAME    = "enterprise_app"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "YOUR_STRONG_PASSWORD_HERE"
```

> These variables live for the current terminal session only. Re-run this block if you open a new terminal.

### Step 5: Verify the health endpoint

```powershell
curl.exe -s "$env:API_URL/v1/health"
```

Expected response:

```json
{"status":"ok"}
```

> Use `curl.exe` in PowerShell — plain `curl` is aliased to `Invoke-WebRequest` and has different syntax.

---

## Part 2 — Database Migrations

The RDS instance is deployed with `PubliclyAccessible: true` and port 5432 open in its security group, so migrations run directly from your local machine — no bastion or tunnel needed.

### Step 1: Set connection variables

Use the `DBEndpoint` value from the stack outputs captured in Part 1:

```powershell
$env:DB_HOST     = "<DBEndpoint from stack outputs>"
$env:DB_PORT     = "5432"
$env:DB_NAME     = "enterprise_app"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "YOUR_STRONG_PASSWORD_HERE"
$env:NODE_ENV    = "production"
```

### Step 2: Run migrations

```powershell
npx sequelize-cli db:migrate
```

Expected output — each migration printed once with `migrated`:

```
== 20260412000000-create-devices-table: migrating =======
== 20260412000000-create-devices-table: migrated (Xs)
== 20260502000000-extend-devices-table: migrating =======
== 20260502000000-extend-devices-table: migrated (Xs)
== 20260502000001-create-telemetry-readings: migrating ======
== 20260502000001-create-telemetry-readings: migrated (Xs)
== 20260502000002-create-user-profiles: migrating =======
== 20260502000002-create-user-profiles: migrated (Xs)
```

### Step 3: (Optional) Inspect the database

```powershell
psql "host=$env:DB_HOST port=5432 dbname=enterprise_app user=postgres password=$env:DB_PASSWORD sslmode=require"
```

Useful queries once connected:

```sql
\dt                          -- list all tables
\d devices                   -- device schema
\d telemetry_readings        -- telemetry schema
SELECT * FROM "SequelizeMeta";  -- migration history
\q
```

---

## Part 2b — Seed Devices & Telemetry

This seeds 50 simulated devices (sensors, trackers, meters, actuators, gateways) and 7 days of telemetry readings (~6,300 rows) into the production database. It does **not** create users — you must already have a registered, confirmed account (Part 3 → "Register a user").

The seed script in `test/setup/seed-devices.js` loads your compiled models from `dist/`, so a TypeScript build is required.

### Step 1: Build TypeScript

```powershell
npm run build
```

### Step 2: Look up your user's Cognito sub

The seed script needs a `user_id` to assign devices to. Get it from AWS Cognito using the email you registered with:

```powershell
$env:SEED_USER_ID = aws cognito-idp admin-get-user `
  --user-pool-id $env:USER_POOL_ID `
  --username you@example.com `
  --query "UserAttributes[?Name=='sub'].Value" `
  --output text
```

Verify it printed a UUID (e.g. `a1b2c3d4-...`):

```powershell
$env:SEED_USER_ID
```

> `$env:USER_POOL_ID` must be set from Part 1 Step 4. If you opened a new terminal, re-run that block.

### Step 3: Set connection variables

These must match what you used for migrations in Part 2:

```powershell
$env:DB_HOST     = "<DBEndpoint from stack outputs>"
$env:DB_PORT     = "5432"
$env:DB_NAME     = "enterprise_app"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "YOUR_STRONG_PASSWORD_HERE"
$env:DB_SSL      = "true"
$env:NODE_ENV    = "production"
```

### Step 4: Run the seed

```powershell
node test/setup/seed-devices.js
```

Expected output:

```
seeding devices for user: a1b2c3d4-...
created 50 devices
created 6300 telemetry readings
device seed complete
```

> Running the seed a second time will create a second set of 50 devices alongside the first. To reset, connect via `psql` and run `TRUNCATE devices CASCADE;` before re-seeding.

---

## Part 3 — Verify the API End-to-End

### Register a user

```powershell
curl.exe -s -X POST "$env:API_URL/v1/auth/signup" `
  -H "Content-Type: application/json" `
  -d '{"email":"you@example.com","password":"TestPassword123!"}'
```

### Confirm the account

Cognito sends a verification email. Get the code from your inbox, then:

```powershell
curl.exe -s -X POST "$env:API_URL/v1/auth/confirm" `
  -H "Content-Type: application/json" `
  -d '{"email":"you@example.com","code":"123456"}'
```

### Log in and capture the token

```powershell
$TOKEN_RESPONSE = curl.exe -s -X POST "$env:API_URL/v1/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"you@example.com","password":"TestPassword123!"}'

$env:ID_TOKEN = ($TOKEN_RESPONSE | ConvertFrom-Json).idToken
```

### Call an authenticated endpoint

```powershell
curl.exe -s "$env:API_URL/v1/users/me" `
  -H "Authorization: Bearer $env:ID_TOKEN"
```

---

## Part 4 — Frontend on CloudFront

The S3 bucket, CloudFront OAC, and CloudFront distribution are all defined in `infra/template.yaml` and provisioned automatically by `sam deploy`. No manual CLI setup is needed.

The distribution has two behaviors:
- `Default (*)` → S3 origin — serves the SPA, with 403/404 mapped to `index.html` for client-side routing
- `/v1/*` → API Gateway origin — proxied with no caching, `Authorization` header forwarded

### Step 1: Build the frontend

```powershell
npm --prefix web ci
npm --prefix web run build
```

The build output lands in `web/dist/`.

### Step 2: Deploy (provisions all infra including CloudFront)

```powershell
sam build --template-file infra/template.yaml

sam deploy `
  --stack-name enterprise-app-test `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides Environment=test DBUsername=postgres DBPassword=YOUR_STRONG_PASSWORD_HERE `
  --resolve-s3 `
  --confirm-changeset
```

> **First deploy:** CloudFront takes ~5 minutes to provision. The `WebURL` output won't be reachable until the distribution status is `Deployed`.

### Step 3: Upload the frontend bundle to S3

Pull the bucket name and distribution ID from the stack outputs:

```powershell
$BUCKET_NAME      = aws cloudformation describe-stacks --stack-name enterprise-app-test --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" --output text
$DISTRIBUTION_ID  = aws cloudformation describe-stacks --stack-name enterprise-app-test --query "Stacks[0].Outputs[?OutputKey=='WebDistributionId'].OutputValue" --output text
$WEB_URL          = aws cloudformation describe-stacks --stack-name enterprise-app-test --query "Stacks[0].Outputs[?OutputKey=='WebURL'].OutputValue" --output text
```

Sync and invalidate:

```powershell
aws s3 sync web/dist/ "s3://$BUCKET_NAME/" --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
Write-Host "Live at: $WEB_URL"
```

### Subsequent frontend deployments

After any frontend code change:

```powershell
npm --prefix web run build
aws s3 sync web/dist/ "s3://$BUCKET_NAME/" --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

---

## Stack Teardown

S3 must be emptied before CloudFormation can delete the bucket. Everything else is handled by `cloudformation delete-stack`.

```powershell
# Read outputs
$BUCKET_NAME     = aws cloudformation describe-stacks --stack-name enterprise-app-test --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" --output text

# Empty the S3 bucket so CloudFormation can delete it
aws s3 rm "s3://$BUCKET_NAME" --recursive

# Delete the stack (removes all resources: Lambda, API GW, Cognito, RDS, VPC, S3, CloudFront)
aws cloudformation delete-stack --stack-name enterprise-app-test
aws cloudformation wait stack-delete-complete --stack-name enterprise-app-test
```

---

## Reference: Key Stack Outputs

| Output | Description |
|---|---|
| `WebEndpoint` | API Gateway base URL |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito App Client ID |
| `DBEndpoint` | RDS PostgreSQL hostname |
| `DBPort` | RDS port (5432) |
| `WebBucketName` | S3 bucket for the web UI bundle |
| `WebDistributionId` | CloudFront distribution ID |
| `WebURL` | Web UI URL (CloudFront) |

Retrieve at any time:

```powershell
aws cloudformation describe-stacks `
  --stack-name enterprise-app-test `
  --query "Stacks[0].Outputs" `
  --output table
```
