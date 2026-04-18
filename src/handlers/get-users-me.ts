import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { json } from "../auth/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = getRequestUser(event);
    return json(200, { ok: true, user });
  } catch {
    return json(401, { ok: false, message: "unauthenticated" });
  }
};
