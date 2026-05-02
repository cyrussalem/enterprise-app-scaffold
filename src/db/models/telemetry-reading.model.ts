import { DataTypes, Model, Sequelize } from "sequelize";

export interface TelemetryReadingAttributes {
  id: string;
  device_id: string;
  recorded_at: Date;
  metric: string;
  value: number;
  unit: string | null;
  createdAt: Date;
}

export type TelemetryReadingCreationAttributes = Omit<TelemetryReadingAttributes, "id" | "createdAt">;

export class TelemetryReading
  extends Model<TelemetryReadingAttributes, TelemetryReadingCreationAttributes>
  implements TelemetryReadingAttributes {
  declare id: string;
  declare device_id: string;
  declare recorded_at: Date;
  declare metric: string;
  declare value: number;
  declare unit: string | null;
  declare readonly createdAt: Date;
}

export function initTelemetryReadingModel(sequelize: Sequelize): typeof TelemetryReading {
  TelemetryReading.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      device_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "devices",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      recorded_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      metric: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      value: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "telemetry_readings",
      underscored: true,
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ["device_id", "recorded_at"],
          name: "idx_telemetry_device_recorded",
        },
      ],
    }
  );
  return TelemetryReading;
}
