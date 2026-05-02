import { startPostgres, stopPostgres } from "../setup/docker-postgres";
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  ingestTelemetry,
  queryTelemetry,
  getFleetSummary,
} from "../../src/devices/device.repository";

const USER_A = "user-a";
const USER_B = "user-b";

beforeAll(async () => {
  await startPostgres();
}, 60000);

afterAll(async () => {
  await stopPostgres();
}, 30000);

describe("createDevice / getDevice / listDevices", () => {
  it("creates a device and retrieves it by id", async () => {
    const device = await createDevice({
      name: "Sensor Alpha",
      device_type: "sensor",
      status: "online",
      user_id: USER_A,
    });

    expect(device.id).toBeDefined();
    expect(device.name).toBe("Sensor Alpha");
    expect(device.device_type).toBe("sensor");
    expect(device.user_id).toBe(USER_A);

    const fetched = await getDevice(device.id, USER_A);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(device.id);
  });

  it("returns null when device belongs to another user", async () => {
    const device = await createDevice({
      name: "Private Device",
      user_id: USER_A,
      status: "offline",
    });

    const result = await getDevice(device.id, USER_B);
    expect(result).toBeNull();
  });

  it("lists only devices belonging to the requesting user", async () => {
    await createDevice({ name: "B-Device", user_id: USER_B, status: "offline" });

    const aDevices = await listDevices({ userId: USER_A });
    const ids = aDevices.map((d) => d.user_id);
    expect(ids.every((id) => id === USER_A)).toBe(true);
  });

  it("filters by status", async () => {
    await createDevice({ name: "Warning Device", user_id: USER_A, status: "warning" });

    const warningDevices = await listDevices({ userId: USER_A, status: "warning" });
    expect(warningDevices.length).toBeGreaterThan(0);
    expect(warningDevices.every((d) => d.status === "warning")).toBe(true);
  });
});

describe("updateDevice", () => {
  it("updates fields on an owned device", async () => {
    const device = await createDevice({
      name: "Update Me",
      user_id: USER_A,
      status: "offline",
    });

    const updated = await updateDevice(device.id, USER_A, {
      name: "Updated Name",
      firmware_version: "2.0.0",
      battery_level: 85,
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.firmware_version).toBe("2.0.0");
    expect(updated!.battery_level).toBe(85);
  });

  it("returns null when device does not belong to the user", async () => {
    const device = await createDevice({
      name: "Not Yours",
      user_id: USER_A,
      status: "offline",
    });

    const result = await updateDevice(device.id, USER_B, { name: "Stolen" });
    expect(result).toBeNull();
  });
});

describe("deleteDevice", () => {
  it("deletes an owned device and returns true", async () => {
    const device = await createDevice({
      name: "Delete Me",
      user_id: USER_A,
      status: "offline",
    });

    const deleted = await deleteDevice(device.id, USER_A);
    expect(deleted).toBe(true);

    const fetched = await getDevice(device.id, USER_A);
    expect(fetched).toBeNull();
  });

  it("returns false when device does not belong to the user", async () => {
    const device = await createDevice({
      name: "Delete Denied",
      user_id: USER_A,
      status: "offline",
    });

    const deleted = await deleteDevice(device.id, USER_B);
    expect(deleted).toBe(false);
  });
});

describe("ingestTelemetry", () => {
  it("inserts readings and marks device online", async () => {
    const device = await createDevice({
      name: "Telemetry Device",
      user_id: USER_A,
      status: "offline",
    });

    const now = new Date();
    await ingestTelemetry({
      deviceId: device.id,
      userId: USER_A,
      readings: [
        { recorded_at: new Date(now.getTime() - 60000), metric: "temperature", value: 22.5, unit: "C" },
        { recorded_at: now, metric: "humidity", value: 60, unit: "%" },
      ],
    });

    const refreshed = await getDevice(device.id, USER_A);
    expect(refreshed!.status).toBe("online");
    expect(refreshed!.last_seen_at).not.toBeNull();
  });

  it("throws when device does not belong to the user", async () => {
    const device = await createDevice({
      name: "Telemetry Denied",
      user_id: USER_A,
      status: "offline",
    });

    await expect(
      ingestTelemetry({
        deviceId: device.id,
        userId: USER_B,
        readings: [{ recorded_at: new Date(), metric: "temp", value: 10 }],
      })
    ).rejects.toThrow();
  });
});

describe("queryTelemetry", () => {
  it("returns readings within the requested time range", async () => {
    const device = await createDevice({
      name: "Query Device",
      user_id: USER_A,
      status: "offline",
    });
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

    await ingestTelemetry({
      deviceId: device.id,
      userId: USER_A,
      readings: [
        { recorded_at: oneHourAgo, metric: "temperature", value: 20 },
        { recorded_at: twoDaysAgo, metric: "temperature", value: 18 },
      ],
    });

    const readings = await queryTelemetry({
      deviceId: device.id,
      userId: USER_A,
      from: new Date(now.getTime() - 7200000), // 2h ago
      to: now,
    });

    expect(readings.length).toBe(1);
    expect(readings[0].value).toBeCloseTo(20);
  });

  it("filters by metric when provided", async () => {
    const device = await createDevice({
      name: "Multi-metric Device",
      user_id: USER_A,
      status: "offline",
    });
    const now = new Date();

    await ingestTelemetry({
      deviceId: device.id,
      userId: USER_A,
      readings: [
        { recorded_at: now, metric: "temperature", value: 25 },
        { recorded_at: now, metric: "pressure", value: 1013 },
      ],
    });

    const readings = await queryTelemetry({
      deviceId: device.id,
      userId: USER_A,
      metric: "pressure",
      from: new Date(now.getTime() - 60000),
      to: new Date(now.getTime() + 60000),
    });

    expect(readings.length).toBe(1);
    expect(readings[0].metric).toBe("pressure");
  });
});

describe("getFleetSummary", () => {
  it("returns correct counts and health score for a user's fleet", async () => {
    // Create a fresh user to avoid interference from earlier tests
    const fleetUser = "fleet-test-user";
    await createDevice({ name: "F-Online-1", user_id: fleetUser, status: "online", device_type: "sensor" });
    await createDevice({ name: "F-Online-2", user_id: fleetUser, status: "online", device_type: "tracker" });
    await createDevice({ name: "F-Offline-1", user_id: fleetUser, status: "offline", device_type: "sensor" });
    await createDevice({ name: "F-Warning-1", user_id: fleetUser, status: "warning", device_type: "meter" });

    const summary = await getFleetSummary(fleetUser);

    expect(summary.total).toBe(4);
    expect(summary.online).toBe(2);
    expect(summary.offline).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.healthScore).toBe(50);
    expect(summary.byType["sensor"]).toBe(2);
    expect(summary.byType["tracker"]).toBe(1);
    expect(summary.byType["meter"]).toBe(1);
  });

  it("returns zero counts and healthScore 0 for a user with no devices", async () => {
    const summary = await getFleetSummary("no-devices-user");
    expect(summary.total).toBe(0);
    expect(summary.healthScore).toBe(0);
  });
});
