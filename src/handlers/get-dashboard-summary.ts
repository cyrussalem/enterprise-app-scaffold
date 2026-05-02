import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { getFleetSummary } from "../devices/device.repository";
import { json } from "../auth/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let user;
  try {
    user = getRequestUser(event);
  } catch {
    return json(401, { ok: false, message: "unauthenticated" });
  }

  const summary = await getFleetSummary(user.sub);
  return json(200, { ok: true, summary });
};
