import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../auth/cognito-client";
import { json, parseBody } from "../auth/http";

interface SignupBody {
  email?: string;
  password?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { email, password } = parseBody<SignupBody>(event.body);

  if (!email || !password) {
    return json(400, { ok: false, message: "email and password are required" });
  }

  try {
    const result = await getCognitoClient().send(
      new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      })
    );

    return json(200, {
      ok: true,
      message: "signup initiated",
      userSub: result.UserSub,
      userConfirmed: result.UserConfirmed ?? false,
    });
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "Error";
    const message = (err as { message?: string })?.message ?? "signup failed";
    const statusCode =
      name === "UsernameExistsException" ? 409 :
      name === "InvalidPasswordException" ? 400 :
      name === "InvalidParameterException" ? 400 :
      500;
    return json(statusCode, { ok: false, message, code: name });
  }
};
