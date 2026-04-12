import { execSync } from "child_process";
import { getSequelize, closeSequelize } from "../../src/db/connection";
import { initModels } from "../../src/db/models";

const COMPOSE_FILE = "docker-compose.test.yml";

export async function startPostgres(): Promise<void> {
  execSync(
    `docker compose -f ${COMPOSE_FILE} up -d --wait`,
    { stdio: "inherit" }
  );

  const sequelize = getSequelize();

  // Run migrations programmatically using Sequelize sync
  // This avoids needing sequelize-cli to parse TypeScript migrations at runtime
  initModels();
  await sequelize.sync({ force: true });
}

export async function stopPostgres(): Promise<void> {
  await closeSequelize();

  execSync(
    `docker compose -f ${COMPOSE_FILE} down -v`,
    { stdio: "inherit" }
  );
}
