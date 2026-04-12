import { Sequelize } from "sequelize";
import { loadDbConfig } from "./config";

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const config = loadDbConfig();
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging ? console.log : false,
        pool: {
          max: 2,
          min: 0,
          idle: 5000,
          acquire: 30000,
        },
      }
    );
  }
  return sequelize;
}

export async function closeSequelize(): Promise<void> {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}
