import { mockClient } from "aws-sdk-client-mock";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { handler } from "../../src/handlers/post-auth-signup";
import { resetCognitoClient } from "../../src/auth/cognito-client";
import { anonymousEvent } from "../setup/test-events";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => {
  cognitoMock.reset();
  resetCognitoClient();
  process.env.COGNITO_CLIENT_ID = "test-client";
});

describe("post-auth-signup handler", () => {
  it("returns 400 when fields are missing", async () => {
    const res = await handler(anonymousEvent({}));
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 with userSub when signup succeeds", async () => {
    cognitoMock.on(SignUpCommand).resolves({
      UserSub: "new-user-sub",
      UserConfirmed: false,
    });

    const res = await handler(
      anonymousEvent({ email: "new@example.com", password: "Password123" })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.userSub).toBe("new-user-sub");
  });

  it("returns 409 when username already exists", async () => {
    cognitoMock.on(SignUpCommand).rejects(
      new UsernameExistsException({ $metadata: {}, message: "exists" })
    );

    const res = await handler(
      anonymousEvent({ email: "new@example.com", password: "Password123" })
    );

    expect(res.statusCode).toBe(409);
  });
});
