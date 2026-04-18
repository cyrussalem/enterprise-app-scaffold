import { handler } from "../../src/handlers/get-users-me";
import { anonymousEvent, eventWithUser } from "../setup/test-events";

describe("get-users-me handler", () => {
  it("returns the authenticated user", async () => {
    const event = eventWithUser(null, {
      sub: "user-1",
      email: "u@example.com",
    });
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.user.sub).toBe("user-1");
    expect(body.user.email).toBe("u@example.com");
  });

  it("returns 401 when no claims are present", async () => {
    const res = await handler(anonymousEvent());
    expect(res.statusCode).toBe(401);
  });
});
