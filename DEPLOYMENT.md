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

$env:ACCESS_TOKEN = ($TOKEN_RESPONSE | ConvertFrom-Json).accessToken
```

### Call an authenticated endpoint

```powershell
curl.exe -s "$env:API_URL/v1/users/me" `
  -H "Authorization: Bearer $env:ACCESS_TOKEN"
```

---

## Part 4 — Frontend on CloudFront (Overachiever)

This deploys the Vite/React web app to S3 and serves it via CloudFront, with API calls routed through CloudFront behaviors so the frontend uses relative `/v1/...` paths (no `VITE_API_URL` changes needed).

### Step 1: Build the frontend

```powershell
cd web
npm ci
npm run build
cd ..
```

The build output lands in `web/dist/`.

### Step 2: Create an S3 bucket for the assets

```powershell
$ACCOUNT_ID   = aws sts get-caller-identity --query Account --output text
$REGION       = aws configure get region
$BUCKET_NAME  = "enterprise-app-test-web-$ACCOUNT_ID"

aws s3 mb "s3://$BUCKET_NAME" --region $REGION

aws s3api put-public-access-block `
  --bucket $BUCKET_NAME `
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Step 3: Sync the built assets to S3

```powershell
aws s3 sync web/dist/ "s3://$BUCKET_NAME/" --delete
```

### Step 4: Create the CloudFront distribution

This single distribution serves both the frontend (from S3) and the API (from API Gateway) using path-based behaviors:

- `Default (*)` → S3 origin (SPA with `index.html` fallback for client-side routing)
- `/v1/*` → API Gateway origin (forwards `Authorization` header, cache disabled)

Extract the API Gateway domain (strip `https://` and the stage path):

```powershell
$API_DOMAIN     = ($env:API_URL -replace "^https://","").Split("/")[0]
$API_STAGE_PATH = "/test"
$CALLER_REF     = "enterprise-app-test-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
```

Write the distribution config to a temp file (PowerShell here-string):

```powershell
@"
{
  "CallerReference": "$CALLER_REF",
  "Comment": "enterprise-app-test",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 2,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
        "S3OriginConfig": { "OriginAccessIdentity": "" }
      },
      {
        "Id": "APIOrigin",
        "DomainName": "$API_DOMAIN",
        "CustomOriginConfig": {
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSSLProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
        },
        "OriginPath": "$API_STAGE_PATH"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] },
    "CachedMethods":  { "Quantity": 2, "Items": ["GET","HEAD"] },
    "ForwardedValues": { "QueryString": false, "Cookies": { "Forward": "none" } },
    "MinTTL": 0, "DefaultTTL": 86400, "MaxTTL": 31536000,
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [{
      "PathPattern": "/v1/*",
      "TargetOriginId": "APIOrigin",
      "ViewerProtocolPolicy": "https-only",
      "AllowedMethods": { "Quantity": 7, "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"] },
      "CachedMethods":  { "Quantity": 2, "Items": ["GET","HEAD"] },
      "ForwardedValues": {
        "QueryString": true,
        "Headers": { "Quantity": 2, "Items": ["Authorization","Content-Type"] },
        "Cookies": { "Forward": "none" }
      },
      "MinTTL": 0, "DefaultTTL": 0, "MaxTTL": 0,
      "Compress": false
    }]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [{ "ErrorCode": 403, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 0 }]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2"
}
"@ | Out-File -Encoding utf8 "$env:TEMP\cf-dist.json"
```

Create the distribution and save the ID:

```powershell
$DISTRIBUTION_ID = aws cloudfront create-distribution `
  --distribution-config "file://$env:TEMP/cf-dist.json" `
  --query "Distribution.Id" --output text

$CF_DOMAIN = aws cloudfront get-distribution `
  --id $DISTRIBUTION_ID --query "Distribution.DomainName" --output text

Write-Host "Distribution ID : $DISTRIBUTION_ID"
Write-Host "CloudFront URL  : https://$CF_DOMAIN"
```

### Step 5: Grant CloudFront access to the S3 bucket

While the distribution is deploying (~5 minutes), set the bucket policy:

```powershell
@"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipal",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/$DISTRIBUTION_ID"
      }
    }
  }]
}
"@ | Out-File -Encoding utf8 "$env:TEMP\s3-policy.json"

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy "file://$env:TEMP/s3-policy.json"
```

### Step 6: Wait for the distribution to deploy

```powershell
aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
Write-Host "Live at: https://$CF_DOMAIN"
```

### Step 7: Subsequent frontend deployments

After any code change:

```powershell
cd web; npm run build; cd ..
aws s3 sync web/dist/ "s3://$BUCKET_NAME/" --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

---

## Stack Teardown

To destroy all AWS resources when you are done:

```powershell
# Disable and delete the CloudFront distribution (if created)
$CF_CONFIG = aws cloudfront get-distribution-config --id $DISTRIBUTION_ID | ConvertFrom-Json
$CF_CONFIG.DistributionConfig.Enabled = $false
$ETAG = $CF_CONFIG.ETag
$CF_CONFIG.DistributionConfig | ConvertTo-Json -Depth 20 | Out-File -Encoding utf8 "$env:TEMP\cf-disabled.json"
aws cloudfront update-distribution --id $DISTRIBUTION_ID --distribution-config "file://$env:TEMP/cf-disabled.json" --if-match $ETAG
aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
$ETAG2 = (aws cloudfront get-distribution --id $DISTRIBUTION_ID | ConvertFrom-Json).ETag
aws cloudfront delete-distribution --id $DISTRIBUTION_ID --if-match $ETAG2

# Empty and delete the S3 bucket
aws s3 rm "s3://$BUCKET_NAME" --recursive
aws s3 rb "s3://$BUCKET_NAME"

# Delete the SAM/CloudFormation stack (removes Lambda, API Gateway, Cognito, RDS, VPC)
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

Retrieve at any time:

```powershell
aws cloudformation describe-stacks `
  --stack-name enterprise-app-test `
  --query "Stacks[0].Outputs" `
  --output table
```
