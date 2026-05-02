import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { getDevice } from "../devices/device.repository";
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

  const id = event.pathParameters?.id;
  if (!id) return json(400, { ok: false, message: "device id is required" });

  const device = await getDevice(id, user.sub);
  if (!device) return json(404, { ok: false, message: "device not found" });

  return json(200, { ok: true, device });
};
