import { Op, QueryTypes } from "sequelize";
import { getSequelize } from "../db/connection";
import { initModels } from "../db/models";
import {
  Device,
  DeviceAttributes,
  DeviceCreationAttributes,
  DeviceStatus,
  DeviceType,
} from "../db/models/device.model";
import { TelemetryReading } from "../db/models/telemetry-reading.model";

// ---- Public types ----

export interface ListDevicesOptions {
  userId: string;
  status?: DeviceStatus;
  deviceType?: DeviceType;
  limit?: number;
  offset?: number;
}

export interface CreateDeviceInput {
  name: string;
  status?: DeviceStatus;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  device_type?: DeviceType;
  tags?: string[];
  ip_address?: string;
  signal_strength?: number;
  latitude?: number;
  longitude?: number;
  location_label?: string;
  timezone?: string;
  firmware_version?: string;
  hardware_revision?: string;
  battery_level?: number;
  uptime_seconds?: number;
  error_count?: number;
  device_temperature?: number;
  polling_interval_seconds?: number;
  alert_threshold_config?: Record<string, number | undefined>;
  user_id: string;
}

export type UpdateDeviceInput = Partial<Omit<CreateDeviceInput, "user_id">>;

export interface TelemetryReadingInput {
  recorded_at: Date;
  metric: string;
  value: number;
  unit?: string;
}

export interface IngestTelemetryInput {
  deviceId: string;
  userId: string;
  readings: TelemetryReadingInput[];
}

export interface QueryTelemetryOptions {
  deviceId: string;
  userId: string;
  metric?: string;
  from: Date;
  to: Date;
  limit?: number;
  offset?: number;
}

export interface FleetSummary {
  total: number;
  online: number;
  offline: number;
  warning: number;
  byType: Partial<Record<DeviceType, number>>;
  healthScore: number;
}

// ---- Repository ----

function getModels() {
  return initModels();
}

export async function listDevices(options: ListDevicesOptions): Promise<Device[]> {
  const { Device: DeviceModel } = getModels();
  const where: Record<string, unknown> = { user_id: options.userId };
  if (options.status) where.status = options.status;
  if (options.deviceType) where.device_type = options.deviceType;

  return DeviceModel.findAll({
    where,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
    order: [["createdAt", "DESC"]],
  });
}

export async function getDevice(
  deviceId: string,
  userId: string
): Promise<Device | null> {
  const { Device: DeviceModel } = getModels();
  return DeviceModel.findOne({ where: { id: deviceId, user_id: userId } });
}

export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  const { Device: DeviceModel } = getModels();
  return DeviceModel.create(input as DeviceCreationAttributes);
}

export async function updateDevice(
  deviceId: string,
  userId: string,
  input: UpdateDeviceInput
): Promise<Device | null> {
  const { Device: DeviceModel } = getModels();
  const device = await DeviceModel.findOne({ where: { id: deviceId, user_id: userId } });
  if (!device) return null;
  return device.update(input as Partial<DeviceAttributes>);
}

export async function deleteDevice(
  deviceId: string,
  userId: string
): Promise<boolean> {
  const { Device: DeviceModel } = getModels();
  const deleted = await DeviceModel.destroy({
    where: { id: deviceId, user_id: userId },
  });
  return deleted > 0;
}

export async function ingestTelemetry(input: IngestTelemetryInput): Promise<void> {
  const { Device: DeviceModel, TelemetryReading: TelemetryReadingModel } = getModels();

  // Verify device ownership
  const device = await DeviceModel.findOne({
    where: { id: input.deviceId, user_id: input.userId },
  });
  if (!device) {
    throw new Error(`Device ${input.deviceId} not found or not owned by user`);
  }

  if (input.readings.length === 0) return;

  // Bulk insert readings
  await TelemetryReadingModel.bulkCreate(
    input.readings.map((r) => ({
      device_id: input.deviceId,
      recorded_at: r.recorded_at,
      metric: r.metric,
      value: r.value,
      unit: r.unit ?? null,
    }))
  );

  // Update device last_seen_at and status
  await DeviceModel.update(
    {
      last_seen_at: new Date(),
      status: "online" as DeviceStatus,
    },
    { where: { id: input.deviceId } }
  );
}

export async function queryTelemetry(
  options: QueryTelemetryOptions
): Promise<TelemetryReading[]> {
  const { Device: DeviceModel, TelemetryReading: TelemetryReadingModel } = getModels();

  // Verify device ownership
  const device = await DeviceModel.findOne({
    where: { id: options.deviceId, user_id: options.userId },
  });
  if (!device) {
    throw new Error(`Device ${options.deviceId} not found or not owned by user`);
  }

  const where: Record<string, unknown> = {
    device_id: options.deviceId,
    recorded_at: { [Op.between]: [options.from, options.to] },
  };
  if (options.metric) where.metric = options.metric;

  return TelemetryReadingModel.findAll({
    where,
    order: [["recorded_at", "DESC"]],
    limit: options.limit ?? 500,
    offset: options.offset ?? 0,
  });
}

export async function getFleetSummary(userId: string): Promise<FleetSummary> {
  const sequelize = getSequelize();
  getModels(); // ensure models are initialised

  type StatusRow = { status: string; count: string };
  type TypeRow = { device_type: string | null; count: string };

  const [statusRows, typeRows] = await Promise.all([
    sequelize.query<StatusRow>(
      `SELECT status, COUNT(*)::int AS count
         FROM devices
        WHERE user_id = :userId
        GROUP BY status`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    ),
    sequelize.query<TypeRow>(
      `SELECT device_type, COUNT(*)::int AS count
         FROM devices
        WHERE user_id = :userId
        GROUP BY device_type`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    ),
  ]);

  const online = statusRows.find((r) => r.status === "online")?.count ?? "0";
  const offline = statusRows.find((r) => r.status === "offline")?.count ?? "0";
  const warning = statusRows.find((r) => r.status === "warning")?.count ?? "0";
  const total = statusRows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

  const byType: Partial<Record<DeviceType, number>> = {};
  for (const row of typeRows) {
    if (row.device_type) {
      byType[row.device_type as DeviceType] = parseInt(row.count, 10);
    }
  }

  const onlineCount = parseInt(online, 10);
  const healthScore = total > 0 ? Math.round((onlineCount / total) * 100) : 0;

  return {
    total,
    online: onlineCount,
    offline: parseInt(offline, 10),
    warning: parseInt(warning, 10),
    byType,
    healthScore,
  };
}
