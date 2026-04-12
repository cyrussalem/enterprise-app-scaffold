import { startPostgres, stopPostgres } from "../setup/docker-postgres";
import { handler } from "../../src/handlers/get-health";

beforeAll(async () => {
  await startPostgres();
}, 60000);

afterAll(async () => {
  await stopPostgres();
}, 30000);

describe("get-health handler", () => {
  it("returns HTTP 200 with devices array", async () => {
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(Array.isArray(body.devices)).toBe(true);
  });
});
