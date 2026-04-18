import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../auth/cognito-client";
import { json, parseBody } from "../auth/http";

interface LoginBody {
  email?: string;
  password?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { email, password } = parseBody<LoginBody>(event.body);

  if (!email || !password) {
    return json(400, { ok: false, message: "email and password are required" });
  }

  try {
    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      })
    );

    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken) {
      return json(401, { ok: false, message: "authentication failed" });
    }

    return json(200, {
      ok: true,
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn,
      tokenType: auth.TokenType ?? "Bearer",
    });
  } catch (err) {
    console.error("login failed:", err);
    const name = (err as { name?: string })?.name ?? "Error";
    const statusCode =
      name === "NotAuthorizedException" ? 401 :
      name === "InvalidPasswordException" ? 401 :
      name === "UserNotConfirmedException" ? 403 :
      name === "UserNotFoundException" ? 404 :
      500;
    const message =
      statusCode === 401 ? "invalid credentials" :
      (err as { message?: string })?.message ?? "login failed";
    return json(statusCode, { ok: false, message, code: name });
  }
};
