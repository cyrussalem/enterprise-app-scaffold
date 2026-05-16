'use strict';

/**
 * Seeds 50 simulated devices and 7 days of telemetry for the demo user.
 * Requires seed-integration.js to have run first (schema synced, Cognito user created).
 */

const fs = require('fs');
const path = require('path');

// Load env from infra/env.local.json if present (local dev only).
// Existing env vars (set by the caller) take precedence so production values are not overwritten.
try {
  const envPath = path.join(__dirname, '..', '..', 'infra', 'env.local.json');
  const fnEnv = JSON.parse(fs.readFileSync(envPath, 'utf8'))['apiFunction'] ?? {};
  for (const [k, v] of Object.entries(fnEnv)) {
    if (typeof v === 'string' && !process.env[k]) {
      process.env[k] = v.replace(/host\.docker\.internal/g, '127.0.0.1');
    }
  }
} catch {
  // env.local.json absent — caller must set DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD/DB_SSL
}

const projectRoot = path.resolve(__dirname, '..', '..');
const distRoot = path.join(projectRoot, 'dist');

// ── Reference data ─────────────────────────────────────────────────────────

const TYPES = ['sensor', 'tracker', 'meter', 'actuator', 'gateway'];

const LOCATIONS = [
  { lat: 51.5074,   lon:  -0.1278,  label: 'London, UK',        tz: 'Europe/London' },
  { lat: 40.7128,   lon: -74.0060,  label: 'New York, USA',     tz: 'America/New_York' },
  { lat: 35.6762,   lon: 139.6503,  label: 'Tokyo, Japan',      tz: 'Asia/Tokyo' },
  { lat: -33.8688,  lon: 151.2093,  label: 'Sydney, Australia',  tz: 'Australia/Sydney' },
  { lat: 25.2048,   lon:  55.2708,  label: 'Dubai, UAE',        tz: 'Asia/Dubai' },
];

const MANUFACTURERS = {
  sensor:   ['Bosch Sensortec', 'Honeywell Analytics'],
  tracker:  ['CalAmp',          'Teltonika Networks'],
  meter:    ['Landis+Gyr',      'Itron'],
  actuator: ['Schneider Electric', 'Siemens'],
  gateway:  ['Cisco',           'Advantech'],
};

const MODELS = {
  sensor:   ['BME680',   'HIH8120'],
  tracker:  ['LMU-3030', 'FMB140'],
  meter:    ['E360',     'Centron C2SE'],
  actuator: ['SXF50',    'EVK400'],
  gateway:  ['IR829',    'ECU-1251'],
};

// Metric definitions: { metric, unit, base, variance }
const METRICS = {
  sensor:   [
    { metric: 'temperature',       unit: 'C',     base: 22,    variance: 8    },
    { metric: 'humidity',          unit: '%',     base: 55,    variance: 20   },
    { metric: 'pressure',          unit: 'hPa',   base: 1013,  variance: 5    },
  ],
  tracker:  [
    { metric: 'speed',             unit: 'km/h',  base: 35,    variance: 35   },
    { metric: 'battery',           unit: '%',     base: 68,    variance: 22   },
    { metric: 'signal_strength',   unit: 'dBm',   base: -68,   variance: 15   },
  ],
  meter:    [
    { metric: 'consumption',       unit: 'kWh',   base: 48,    variance: 25   },
    { metric: 'voltage',           unit: 'V',     base: 230,   variance: 8    },
    { metric: 'current',           unit: 'A',     base: 14,    variance: 6    },
  ],
  actuator: [
    { metric: 'position',          unit: '%',     base: 50,    variance: 50   },
    { metric: 'power_draw',        unit: 'W',     base: 185,   variance: 90   },
    { metric: 'cycle_count',       unit: 'count', base: 950,   variance: 450  },
  ],
  gateway:  [
    { metric: 'latency_ms',        unit: 'ms',    base: 14,    variance: 8    },
    { metric: 'packet_loss_pct',   unit: '%',     base: 0.4,   variance: 0.4  },
    { metric: 'connected_devices', unit: 'count', base: 11,    variance: 7    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function rand(base, variance) {
  const raw = base + (Math.random() - 0.5) * 2 * variance;
  return Math.round(raw * 100) / 100;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Cognito: resolve demo user sub ─────────────────────────────────────────

async function getDemoUserSub() {
  // Production shortcut: set SEED_USER_ID to the target user's Cognito sub and skip Cognito auth.
  if (process.env.SEED_USER_ID) return process.env.SEED_USER_ID;

  const {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
  } = require(path.join(projectRoot, 'node_modules', '@aws-sdk', 'client-cognito-identity-provider'));

  const cognito = new CognitoIdentityProviderClient({
    region: 'us-east-1',
    endpoint: 'http://127.0.0.1:9229',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });

  const result = await cognito.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: 'seed@example.com', PASSWORD: 'SeedPassword123!' },
  }));

  // Use the IdToken sub — the frontend sends the idToken as Bearer (since commit 9d7e5f1),
  // so the API decodes the idToken to identify the user. Seeded devices must use that sub.
  // In real Cognito both tokens share the same sub; in cognito-local they can differ.
  const idToken = result.AuthenticationResult.IdToken;
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
  return payload.sub;
}

// ── Device + telemetry generation ──────────────────────────────────────────

function buildDeviceSpecs(userId, statuses) {
  const specs = [];
  for (let i = 0; i < 50; i++) {
    const type      = TYPES[Math.floor(i / 10)];          // 10 per type
    const location  = LOCATIONS[i % LOCATIONS.length];    // cycle through all 5
    const status    = statuses[i];
    const mfg       = MANUFACTURERS[type][i % 2];
    const mdl       = MODELS[type][i % 2];
    const seq       = String(i + 1).padStart(3, '0');
    const now       = Date.now();

    const lastSeenAt =
      status === 'online'  ? new Date(now - randInt(0, 5 * 60_000)) :
      status === 'warning' ? new Date(now - randInt(30 * 60_000, 2 * 3600_000)) :
                             new Date(now - randInt(4 * 3600_000, 24 * 3600_000));

    specs.push({
      name:                     `${mdl}-${seq}`,
      status,
      device_type:              type,
      serial_number:            `SN-${type.slice(0, 3).toUpperCase()}-${seq}`,
      manufacturer:             mfg,
      model:                    mdl,
      firmware_version:         `${randInt(1, 3)}.${randInt(0, 9)}.${randInt(0, 19)}`,
      hardware_revision:        `rev${randInt(1, 3)}`,
      latitude:                 location.lat  + (Math.random() - 0.5) * 0.08,
      longitude:                location.lon  + (Math.random() - 0.5) * 0.08,
      location_label:           location.label,
      timezone:                 location.tz,
      ip_address:               `10.${Math.floor(i / 10)}.${i % 10}.${randInt(1, 254)}`,
      signal_strength:          randInt(-85, -40),
      battery_level:            status === 'offline' ? randInt(0, 15) : randInt(20, 98),
      uptime_seconds:           status === 'online'  ? randInt(3600, 86400 * 30) : randInt(0, 3600),
      error_count:              status === 'warning' ? randInt(1, 15) : randInt(0, 2),
      device_temperature:       randInt(22, 52),
      polling_interval_seconds: [30, 60, 120, 300][randInt(0, 3)],
      last_seen_at:             lastSeenAt,
      last_ota_update_at:       new Date(now - randInt(1, 90) * 86400_000),
      tags:                     [type, location.label.split(',')[0].toLowerCase().replace(/\s+/g, '-')],
      alert_threshold_config:   { battery_level_min: 15, temperature_max: 55, signal_strength_min: -85 },
      user_id:                  userId,
    });
  }
  return specs;
}

function buildReadings(devices) {
  const readings = [];
  const now      = Date.now();
  const INTERVAL = 4 * 3600_000;      // 4-hour intervals
  const STEPS    = 7 * 6;             // 42 readings per metric (7 days × 6 per day)

  for (const device of devices) {
    const metrics = METRICS[device.device_type] ?? METRICS.sensor;
    for (const m of metrics) {
      let value = rand(m.base, m.variance);
      for (let step = STEPS - 1; step >= 0; step--) {
        // Random-walk so readings look correlated over time
        value = clamp(
          value + (Math.random() - 0.5) * m.variance * 0.4,
          m.base - m.variance,
          m.base + m.variance
        );
        readings.push({
          device_id:   device.id,
          recorded_at: new Date(now - step * INTERVAL),
          metric:      m.metric,
          value:       Math.round(value * 100) / 100,
          unit:        m.unit,
        });
      }
    }
  }
  return readings;
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    const { initModels }    = require(path.join(distRoot, 'db', 'models'));
    const { closeSequelize } = require(path.join(distRoot, 'db', 'connection'));
    const { Device, TelemetryReading } = initModels();

    const userId = await getDemoUserSub();
    console.log(`seeding devices for user: ${userId}`);

    // 70% online / 15% offline / 15% warning, randomly distributed
    const statuses = shuffle([
      ...Array(35).fill('online'),
      ...Array(8).fill('offline'),
      ...Array(7).fill('warning'),
    ]);

    const specs   = buildDeviceSpecs(userId, statuses);
    const devices = await Device.bulkCreate(specs, { returning: true });
    console.log(`created ${devices.length} devices`);

    const readings = buildReadings(devices);
    for (let i = 0; i < readings.length; i += 1000) {
      await TelemetryReading.bulkCreate(readings.slice(i, i + 1000));
    }
    console.log(`created ${readings.length} telemetry readings`);

    await closeSequelize();
    console.log('device seed complete');
  } catch (err) {
    console.error('seed-devices failed:', err);
    process.exit(1);
  }
})();
