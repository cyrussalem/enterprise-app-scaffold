import { mockClient } from "aws-sdk-client-mock";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
} from "@aws-sdk/client-cognito-identity-provider";
import { handler } from "../../src/handlers/post-auth-refresh";
import { resetCognitoClient } from "../../src/auth/cognito-client";
import { anonymousEvent } from "../setup/test-events";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => {
  cognitoMock.reset();
  resetCognitoClient();
  process.env.COGNITO_CLIENT_ID = "test-client";
});

describe("post-auth-refresh handler", () => {
  it("returns 400 when refreshToken is missing", async () => {
    const res = await handler(anonymousEvent({}));
    expect(res.statusCode).toBe(400);
  });

  it("returns a fresh access token on success", async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: "new-id",
        AccessToken: "new-access",
        ExpiresIn: 3600,
        TokenType: "Bearer",
      },
    });

    const res = await handler(anonymousEvent({ refreshToken: "r" }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBe("new-access");
    expect(body.idToken).toBe("new-id");
  });

  it("returns 401 when refresh token is rejected", async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(
      new NotAuthorizedException({ $metadata: {}, message: "bad token" })
    );

    const res = await handler(anonymousEvent({ refreshToken: "bad" }));
    expect(res.statusCode).toBe(401);
  });
});
