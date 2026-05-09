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
  console.log("signup: request received", {
    requestId: event.requestContext.requestId,
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoEndpoint: process.env.COGNITO_ENDPOINT || "(AWS default)",
  });

  const { email, password } = parseBody<SignupBody>(event.body);

  if (!email || !password) {
    console.log("signup: missing required fields", { hasEmail: !!email, hasPassword: !!password });
    return json(400, { ok: false, message: "email and password are required" });
  }

  console.log("signup: attempting Cognito SignUp", { email });

  try {
    const result = await getCognitoClient().send(
      new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      })
    );

    console.log("signup: success", {
      email,
      userSub: result.UserSub,
      userConfirmed: result.UserConfirmed,
    });

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
    console.error("signup: Cognito error", { name, message, statusCode, email });
    return json(statusCode, { ok: false, message, code: name });
  }
};
