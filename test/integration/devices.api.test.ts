import { login, API_BASE } from "./helpers";

jest.setTimeout(30000);

describe("Device CRUD API", () => {
  let accessToken: string;
  let deviceId: string;

  beforeAll(async () => {
    const tokens = await login();
    accessToken = tokens.accessToken;
  });

  const auth = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  it("POST /v1/devices — creates a device and returns 201", async () => {
    const res = await fetch(`${API_BASE}/v1/devices`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        name: "Integration Sensor",
        device_type: "sensor",
        status: "offline",
        firmware_version: "1.0.0",
        latitude: 51.5074,
        longitude: -0.1278,
        location_label: "London HQ",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.device.id).toBeDefined();
    expect(body.device.name).toBe("Integration Sensor");
    expect(body.device.device_type).toBe("sensor");
    deviceId = body.device.id;
  });

  it("GET /v1/devices — lists devices including the new one", async () => {
    const res = await fetch(`${API_BASE}/v1/devices`, { headers: auth() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.devices)).toBe(true);
    expect(body.devices.some((d: { id: string }) => d.id === deviceId)).toBe(true);
  });

  it("GET /v1/devices — filters by status", async () => {
    const res = await fetch(`${API_BASE}/v1/devices?status=offline`, { headers: auth() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.devices.every((d: { status: string }) => d.status === "offline")).toBe(true);
  });

  it("GET /v1/devices/:id — retrieves a specific device", async () => {
    const res = await fetch(`${API_BASE}/v1/devices/${deviceId}`, { headers: auth() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.device.id).toBe(deviceId);
    expect(body.device.name).toBe("Integration Sensor");
  });

  it("GET /v1/devices/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${API_BASE}/v1/devices/00000000-0000-0000-0000-000000000000`, {
      headers: auth(),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /v1/devices/:id — updates fields", async () => {
    const res = await fetch(`${API_BASE}/v1/devices/${deviceId}`, {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({ name: "Updated Sensor", battery_level: 88 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.device.name).toBe("Updated Sensor");
    expect(body.device.battery_level).toBe(88);
  });

  it("POST /v1/devices/:id/telemetry — ingests readings and marks device online", async () => {
    const now = new Date();
    const res = await fetch(`${API_BASE}/v1/devices/${deviceId}/telemetry`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        readings: [
          { recorded_at: now.toISOString(), metric: "temperature", value: 22.5, unit: "C" },
          { recorded_at: now.toISOString(), metric: "humidity", value: 55, unit: "%" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const deviceRes = await fetch(`${API_BASE}/v1/devices/${deviceId}`, { headers: auth() });
    const deviceBody = await deviceRes.json();
    expect(deviceBody.device.status).toBe("online");
  });

  it("GET /v1/dashboard/summary — returns fleet aggregates", async () => {
    const res = await fetch(`${API_BASE}/v1/dashboard/summary`, { headers: auth() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.summary.total).toBe("number");
    expect(typeof body.summary.online).toBe("number");
    expect(typeof body.summary.offline).toBe("number");
    expect(typeof body.summary.healthScore).toBe("number");
    expect(body.summary.total).toBeGreaterThan(0);
  });

  it("DELETE /v1/devices/:id — deletes the device", async () => {
    const res = await fetch(`${API_BASE}/v1/devices/${deviceId}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("GET /v1/devices/:id — returns 404 after deletion", async () => {
    const res = await fetch(`${API_BASE}/v1/devices/${deviceId}`, { headers: auth() });
    expect(res.status).toBe(404);
  });

  it("POST /v1/devices — returns 400 when name is missing", async () => {
    const res = await fetch(`${API_BASE}/v1/devices`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ device_type: "sensor" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("GET /v1/devices — returns 401 without auth token", async () => {
    const res = await fetch(`${API_BASE}/v1/devices`);
    expect(res.status).toBe(401);
  });
});
