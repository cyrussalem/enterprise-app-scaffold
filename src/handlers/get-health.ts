import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { initModels } from "../db/models";
import { getRequestUser } from "../auth/request-user";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  const claims = event.requestContext?.authorizer?.claims as Record<string, string> | undefined;

  console.log("health: request received", {
    requestId: event.requestContext.requestId,
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader ? authHeader.slice(0, 20) + "..." : null,
    authorizerPresent: !!event.requestContext?.authorizer,
    claims: claims
      ? { sub: claims.sub, email: claims.email, hasCognitoUsername: !!claims["cognito:username"] }
      : null,
  });

  let user;
  try {
    user = getRequestUser(event);
    console.log("health: user resolved", { sub: user.sub, email: user.email });
  } catch (err) {
    console.error("health: getRequestUser threw — claims missing or incomplete", {
      error: (err as Error).message,
      authorizer: event.requestContext?.authorizer ?? null,
    });
    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, message: "unauthenticated" }),
    };
  }

  try {
    const { Device } = initModels();
    const devices = await Device.findAll();
    console.log("health: db ok", { deviceCount: devices.length });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "success",
        user,
        devices,
      }),
    };
  } catch (error) {
    console.error("health: database error", error);
    return {
      statusCode: 503,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        message: "database connection failed",
      }),
    };
  }
};
