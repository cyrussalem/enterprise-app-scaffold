import { mockClient } from "aws-sdk-client-mock";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  CodeMismatchException,
} from "@aws-sdk/client-cognito-identity-provider";
import { handler } from "../../src/handlers/post-auth-confirm";
import { resetCognitoClient } from "../../src/auth/cognito-client";
import { anonymousEvent } from "../setup/test-events";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

beforeEach(() => {
  cognitoMock.reset();
  resetCognitoClient();
  process.env.COGNITO_CLIENT_ID = "test-client";
});

describe("post-auth-confirm handler", () => {
  it("returns 400 when fields are missing", async () => {
    const res = await handler(anonymousEvent({ email: "a@b.com" }));
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 on successful confirmation", async () => {
    cognitoMock.on(ConfirmSignUpCommand).resolves({});
    const res = await handler(
      anonymousEvent({ email: "a@b.com", code: "123456" })
    );
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 on CodeMismatchException", async () => {
    cognitoMock.on(ConfirmSignUpCommand).rejects(
      new CodeMismatchException({ $metadata: {}, message: "bad code" })
    );
    const res = await handler(
      anonymousEvent({ email: "a@b.com", code: "000000" })
    );
    expect(res.statusCode).toBe(400);
  });
});
