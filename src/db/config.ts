export interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: "postgres";
  logging: boolean;
  ssl: boolean;
}

export function loadDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "enterprise_app",
    username: process.env.DB_USERNAME ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    dialect: "postgres",
    logging: process.env.DB_LOGGING === "true",
    ssl: process.env.DB_SSL === "true",
  };
}
