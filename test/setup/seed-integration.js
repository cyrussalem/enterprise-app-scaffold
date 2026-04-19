/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Seeds the local integration stack:
 *   1. Syncs the Postgres schema (from the compiled dist/).
 *   2. Creates a Cognito user pool, app client, and confirmed test user in
 *      cognito-local via API calls.
 *   3. Rewrites infra/env.local.json so SAM local picks up the generated IDs.
 */
const fs = require("fs");
const path = require("path");

process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_PORT = process.env.DB_PORT || "5432";
process.env.DB_NAME = process.env.DB_NAME || "enterprise_app";
process.env.DB_USERNAME = process.env.DB_USERNAME || "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "postgres";

const projectRoot = path.resolve(__dirname, "..", "..");
const distRoot = path.join(projectRoot, "dist");
const envLocalPath = path.join(projectRoot, "infra", "env.local.json");

const SEED_EMAIL = "seed@example.com";
const SEED_PASSWORD = "SeedPassword123!";
const COGNITO_ENDPOINT = "http://127.0.0.1:9229";

const {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} = require(path.join(
  projectRoot,
  "node_modules",
  "@aws-sdk",
  "client-cognito-identity-provider"
));

async function syncPostgres() {
  const { getSequelize, closeSequelize } = require(path.join(distRoot, "db", "connection"));
  const { initModels } = require(path.join(distRoot, "db", "models"));
  initModels();
  await getSequelize().sync({ force: true });
  await closeSequelize();
  console.log("postgres schema synced");
}

async function seedCognito() {
  const cognito = new CognitoIdentityProviderClient({
    region: "us-east-1",
    endpoint: COGNITO_ENDPOINT,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });

  const pool = await cognito.send(
    new CreateUserPoolCommand({
      PoolName: "enterprise_local",
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: false,
          RequireLowercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
        },
      },
    })
  );
  const userPoolId = pool.UserPool.Id;
  console.log(`created user pool: ${userPoolId}`);

  const client = await cognito.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: "enterprise_local_client",
      GenerateSecret: false,
      ExplicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_ADMIN_USER_PASSWORD_AUTH",
      ],
    })
  );
  const clientId = client.UserPoolClient.ClientId;
  console.log(`created user pool client: ${clientId}`);

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: SEED_EMAIL,
      UserAttributes: [
        { Name: "email", Value: SEED_EMAIL },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS",
    })
  );

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: SEED_EMAIL,
      Password: SEED_PASSWORD,
      Permanent: true,
    })
  );
  console.log(`created confirmed user: ${SEED_EMAIL}`);

  return { userPoolId, clientId };
}

function writeEnvLocal({ userPoolId, clientId }) {
  const endpointFromContainer = "http://host.docker.internal:9229";
  const envLocal = {
    apiFunction: {
      DB_HOST: "host.docker.internal",
      DB_PORT: "5432",
      DB_NAME: "enterprise_app",
      DB_USERNAME: "postgres",
      DB_PASSWORD: "postgres",
      COGNITO_CLIENT_ID: clientId,
      COGNITO_USER_POOL_ID: userPoolId,
      COGNITO_ENDPOINT: endpointFromContainer,
    },
  };
  fs.writeFileSync(envLocalPath, JSON.stringify(envLocal, null, 2) + "\n");
  console.log(`wrote ${envLocalPath}`);
}

(async () => {
  await syncPostgres();
  const ids = await seedCognito();
  writeEnvLocal(ids);
})().catch((err) => {
  console.error("seed-integration failed:", err);
  process.exit(1);
});
