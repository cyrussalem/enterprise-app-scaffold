import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../auth/cognito-client";
import { json, parseBody } from "../auth/http";

interface RefreshBody {
  refreshToken?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { refreshToken } = parseBody<RefreshBody>(event.body);

  if (!refreshToken) {
    return json(400, { ok: false, message: "refreshToken is required" });
  }

  try {
    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      })
    );

    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken) {
      return json(401, { ok: false, message: "refresh failed" });
    }

    return json(200, {
      ok: true,
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      expiresIn: auth.ExpiresIn,
      tokenType: auth.TokenType ?? "Bearer",
    });
  } catch (err) {
    console.error("refresh failed:", err);
    const name = (err as { name?: string })?.name ?? "Error";
    const statusCode = name === "NotAuthorizedException" ? 401 : 500;
    const message =
      statusCode === 401 ? "invalid refresh token" :
      (err as { message?: string })?.message ?? "refresh failed";
    return json(statusCode, { ok: false, message, code: name });
  }
};
