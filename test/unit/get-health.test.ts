import { startPostgres, stopPostgres } from "../setup/docker-postgres";
import { handler } from "../../src/handlers/get-health";
import { anonymousEvent, eventWithUser } from "../setup/test-events";

beforeAll(async () => {
  await startPostgres();
}, 60000);

afterAll(async () => {
  await stopPostgres();
}, 30000);

describe("get-health handler", () => {
  it("returns HTTP 200 with the authenticated user and devices array", async () => {
    const event = eventWithUser(null, {
      sub: "user-1",
      email: "test@example.com",
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.["content-type"]).toBe("application/json");

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.message).toBe("success");
    expect(body.user.sub).toBe("user-1");
    expect(Array.isArray(body.devices)).toBe(true);
  });

  it("returns 401 when the event has no authorizer claims", async () => {
    const result = await handler(anonymousEvent());
    expect(result.statusCode).toBe(401);
  });
});
