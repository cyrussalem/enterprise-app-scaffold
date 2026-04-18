import { mockClient } from "aws-sdk-client-mock";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  UserNotConfirmedException,
} from "@aws-sdk/client-cognito-identity-provider";
import { handler } from "../../src/handlers/post-auth-login";
import { resetCognitoClient } from "../../src/auth/cognito-client";
import { anonymousEvent } from "../setup/test-events";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => {
  cognitoMock.reset();
  resetCognitoClient();
  process.env.COGNITO_CLIENT_ID = "test-client";
});

describe("post-auth-login handler", () => {
  it("returns 400 when email/password are missing", async () => {
    const res = await handler(anonymousEvent({ email: "a@b.com" }));
    expect(res.statusCode).toBe(400);
  });

  it("returns tokens on valid credentials", async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: "id-token",
        AccessToken: "access-token",
        RefreshToken: "refresh-token",
        ExpiresIn: 3600,
        TokenType: "Bearer",
      },
    });

    const res = await handler(
      anonymousEvent({ email: "a@b.com", password: "pw" })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.accessToken).toBe("access-token");
    expect(body.idToken).toBe("id-token");
    expect(body.refreshToken).toBe("refresh-token");
    expect(body.tokenType).toBe("Bearer");
  });

  it("returns 401 on NotAuthorizedException", async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(
      new NotAuthorizedException({ $metadata: {}, message: "bad creds" })
    );

    const res = await handler(
      anonymousEvent({ email: "a@b.com", password: "wrong" })
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).ok).toBe(false);
  });

  it("returns 403 when the user is not confirmed", async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(
      new UserNotConfirmedException({ $metadata: {}, message: "not confirmed" })
    );

    const res = await handler(
      anonymousEvent({ email: "a@b.com", password: "pw" })
    );

    expect(res.statusCode).toBe(403);
  });
});
