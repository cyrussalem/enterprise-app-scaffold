import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { initModels } from "../db/models";
import { getRequestUser } from "../auth/request-user";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let user;
  try {
    user = getRequestUser(event);
  } catch {
    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, message: "unauthenticated" }),
    };
  }

  try {
    const { Device } = initModels();
    const devices = await Device.findAll();

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
    console.error("Health check failed:", error);
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
