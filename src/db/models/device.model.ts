import { DataTypes, Model, Sequelize } from "sequelize";

export type DeviceType = "sensor" | "tracker" | "meter" | "actuator" | "gateway";
export type DeviceStatus = "online" | "offline" | "warning";

export interface AlertThresholdConfig {
  battery_level_min?: number;
  temperature_max?: number;
  signal_strength_min?: number;
  [key: string]: number | undefined;
}

export interface DeviceAttributes {
  id: string;
  name: string;
  status: DeviceStatus;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  device_type: DeviceType | null;
  tags: string[] | null;
  last_seen_at: Date | null;
  ip_address: string | null;
  signal_strength: number | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  timezone: string | null;
  firmware_version: string | null;
  hardware_revision: string | null;
  last_ota_update_at: Date | null;
  battery_level: number | null;
  uptime_seconds: number | null;
  error_count: number | null;
  device_temperature: number | null;
  polling_interval_seconds: number | null;
  alert_threshold_config: AlertThresholdConfig | null;
  user_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DeviceCreationAttributes = Omit<DeviceAttributes, "id" | "createdAt" | "updatedAt">;

export class Device extends Model<DeviceAttributes, DeviceCreationAttributes>
  implements DeviceAttributes {
  declare id: string;
  declare name: string;
  declare status: DeviceStatus;
  declare serial_number: string | null;
  declare manufacturer: string | null;
  declare model: string | null;
  declare device_type: DeviceType | null;
  declare tags: string[] | null;
  declare last_seen_at: Date | null;
  declare ip_address: string | null;
  declare signal_strength: number | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare location_label: string | null;
  declare timezone: string | null;
  declare firmware_version: string | null;
  declare hardware_revision: string | null;
  declare last_ota_update_at: Date | null;
  declare battery_level: number | null;
  declare uptime_seconds: number | null;
  declare error_count: number | null;
  declare device_temperature: number | null;
  declare polling_interval_seconds: number | null;
  declare alert_threshold_config: AlertThresholdConfig | null;
  declare user_id: string | null;
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
        defaultValue: "offline",
      },
      serial_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manufacturer: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      device_type: {
        type: DataTypes.ENUM("sensor", "tracker", "meter", "actuator", "gateway"),
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      signal_strength: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      location_label: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      timezone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      firmware_version: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hardware_revision: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      last_ota_update_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      battery_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      uptime_seconds: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      error_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      device_temperature: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      polling_interval_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 60,
      },
      alert_threshold_config: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      underscored: true,
      timestamps: true,
    }
  );
  return Device;
}
