import { getRequestUser } from "../../src/auth/request-user";
import { anonymousEvent, eventWithUser } from "../setup/test-events";

describe("getRequestUser", () => {
  it("extracts the user from authorizer claims", () => {
    const event = eventWithUser(null, {
      sub: "abc-123",
      email: "a@b.com",
      username: "a@b.com",
    });
    const user = getRequestUser(event);
    expect(user.sub).toBe("abc-123");
    expect(user.email).toBe("a@b.com");
    expect(user.username).toBe("a@b.com");
  });

  it("throws when authorizer claims are missing", () => {
    expect(() => getRequestUser(anonymousEvent())).toThrow(
      /missing authorizer/
    );
  });

  it("falls back to email when cognito:username is absent", () => {
    const event = eventWithUser(null, {
      sub: "abc-123",
      email: "a@b.com",
    });
    delete (event.requestContext.authorizer!.claims as Record<string, string>)[
      "cognito:username"
    ];
    const user = getRequestUser(event);
    expect(user.username).toBe("a@b.com");
  });
});
