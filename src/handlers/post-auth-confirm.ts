import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../auth/cognito-client";
import { json, parseBody } from "../auth/http";

interface ConfirmBody {
  email?: string;
  code?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { email, code } = parseBody<ConfirmBody>(event.body);

  if (!email || !code) {
    return json(400, { ok: false, message: "email and code are required" });
  }

  try {
    await getCognitoClient().send(
      new ConfirmSignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      })
    );
    return json(200, { ok: true, message: "confirmed" });
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "Error";
    const message = (err as { message?: string })?.message ?? "confirm failed";
    const statusCode =
      name === "CodeMismatchException" ? 400 :
      name === "ExpiredCodeException" ? 400 :
      name === "UserNotFoundException" ? 404 :
      500;
    return json(statusCode, { ok: false, message, code: name });
  }
};
