import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { listDevices } from "../devices/device.repository";
import { json } from "../auth/http";
import type { DeviceStatus, DeviceType } from "../db/models/device.model";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let user;
  try {
    user = getRequestUser(event);
  } catch {
    return json(401, { ok: false, message: "unauthenticated" });
  }

  const qs = event.queryStringParameters ?? {};
  const devices = await listDevices({
    userId: user.sub,
    status: qs.status as DeviceStatus | undefined,
    deviceType: qs.device_type as DeviceType | undefined,
    limit: qs.limit ? parseInt(qs.limit, 10) : undefined,
    offset: qs.offset ? parseInt(qs.offset, 10) : undefined,
  });

  return json(200, { ok: true, devices });
};
