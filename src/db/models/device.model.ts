import { DataTypes, Model, Sequelize } from "sequelize";

export interface DeviceAttributes {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DeviceCreationAttributes = Omit<DeviceAttributes, "id" | "createdAt" | "updatedAt">;

export class Device extends Model<DeviceAttributes, DeviceCreationAttributes>
  implements DeviceAttributes {
  declare id: string;
  declare name: string;
  declare status: string;
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
        defaultValue: "active",
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
