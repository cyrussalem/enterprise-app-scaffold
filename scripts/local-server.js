'use strict';

/**
 * Local dev server — runs the Lambda handler in-process via an Express adapter.
 *
 * Replaces `sam local start-api` for local development and integration testing.
 * Starts in < 5 s; no Docker container cold-start per request.
 *
 * Requires a prior `npm run build` (dist/ must be present).
 * Env vars are loaded from infra/env.local.json (same file SAM uses).
 *
 * See docs/backend/local-dev-server-design.md for design rationale.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

// ── 1. Load env vars before importing the handler ─────────────────────────────

const envPath = path.join(__dirname, '..', 'infra', 'env.local.json');
if (!fs.existsSync(envPath)) {
  console.error('[local-server] infra/env.local.json not found');
  process.exit(1);
}

const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf8'));
const fnEnv = envConfig['apiFunction'] ?? {};

// infra/env.local.json uses host.docker.internal so that SAM containers (which
// run inside Docker) can reach backing services on the host. When running on the
// host directly, Docker port bindings listen on 127.0.0.1, not on the LAN IP
// that host.docker.internal resolves to, so we remap it here.
for (const [k, v] of Object.entries(fnEnv)) {
  fnEnv[k] = typeof v === 'string' ? v.replace(/host\.docker\.internal/g, '127.0.0.1') : v;
}

Object.assign(process.env, fnEnv);

// Activates the JWT-decode fallback in src/auth/request-user.ts so that
// authenticated routes work without a real API Gateway authorizer.
process.env.AWS_SAM_LOCAL = 'true';

// ── 2. Verify dist/ exists ────────────────────────────────────────────────────

const distHandler = path.join(__dirname, '..', 'dist', 'handlers', 'api.js');
if (!fs.existsSync(distHandler)) {
  console.error('[local-server] dist/handlers/api.js not found — run `npm run build` first');
  process.exit(1);
}

// ── 3. Import handler AFTER env vars are set ─────────────────────────────────

const { handler } = require('../dist/handlers/api');

// ── 4. Build Express app ──────────────────────────────────────────────────────

const PORT = parseInt(process.env.LOCAL_SERVER_PORT ?? '3000', 10);
const app = express();

// Capture the raw body as a string — Lambda receives string bodies.
app.use(express.text({ type: '*/*', limit: '10mb' }));

// Express 5 changed wildcard syntax; app.use catches all routes in both 4 and 5.
app.use(async (req, res) => {
  // Flatten query params to string values (ignore arrays).
  const qs = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') qs[k] = v;
  }

  /** @type {import('aws-lambda').APIGatewayProxyEvent} */
  const event = {
    httpMethod: req.method,
    path: req.path,
    resource: req.path,
    headers: /** @type {any} */ (req.headers),
    body: typeof req.body === 'string' && req.body.length > 0 ? req.body : null,
    isBase64Encoded: false,
    queryStringParameters: Object.keys(qs).length > 0 ? qs : null,
    pathParameters: null,
    stageVariables: null,
    multiValueHeaders: null,
    multiValueQueryStringParameters: null,
    requestContext: /** @type {any} */ ({
      resourceId: 'local',
      resourcePath: req.path,
      httpMethod: req.method,
      requestId: `local-${Date.now()}`,
      apiId: 'local',
      authorizer: {},
      stage: 'local',
      identity: {},
      path: req.path,
    }),
  };

  try {
    const result = await handler(event);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }
    res.status(result.statusCode).send(result.body ?? '');
  } catch (err) {
    console.error('[local-server] unhandled handler error:', err);
    res.status(500).send(JSON.stringify({ ok: false, message: 'internal server error' }));
  }
});

// ── 5. Start server ───────────────────────────────────────────────────────────

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-server] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[local-server] DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`[local-server] Cognito: ${process.env.COGNITO_ENDPOINT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[local-server] Port ${PORT} is already in use. Is SAM local or another server running?`);
    console.error('[local-server] Run: npm run sam:local:stop  — or kill the process holding that port.');
  } else {
    console.error('[local-server] Server error:', err);
  }
  process.exit(1);
});
