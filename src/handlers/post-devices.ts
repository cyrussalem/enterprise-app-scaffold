import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { createDevice, type CreateDeviceInput } from "../devices/device.repository";
import { json, parseBody } from "../auth/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let user;
  try {
    user = getRequestUser(event);
  } catch {
    return json(401, { ok: false, message: "unauthenticated" });
  }

  const body = parseBody<Partial<CreateDeviceInput>>(event.body);
  if (!body.name) {
    return json(400, { ok: false, message: "name is required" });
  }

  const device = await createDevice({ ...body, name: body.name, user_id: user.sub });
  return json(201, { ok: true, device });
};
