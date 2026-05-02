import { DataTypes, Model, Sequelize } from "sequelize";

export interface UserProfileAttributes {
  id: string;
  user_id: string;
  whatsapp_number: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserProfileCreationAttributes = Omit<UserProfileAttributes, "id" | "createdAt" | "updatedAt">;

export class UserProfile
  extends Model<UserProfileAttributes, UserProfileCreationAttributes>
  implements UserProfileAttributes {
  declare id: string;
  declare user_id: string;
  declare whatsapp_number: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initUserProfileModel(sequelize: Sequelize): typeof UserProfile {
  UserProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      whatsapp_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
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
      tableName: "user_profiles",
      underscored: true,
      timestamps: true,
    }
  );
  return UserProfile;
}
