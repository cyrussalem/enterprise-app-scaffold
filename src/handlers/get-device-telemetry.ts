import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { queryTelemetry } from "../devices/device.repository";
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

  const qs = event.queryStringParameters ?? {};
  const now = new Date();
  const to = qs.to ? new Date(qs.to) : now;
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const from = qs.from ? new Date(qs.from) : defaultFrom;

  try {
    const readings = await queryTelemetry({
      deviceId: id,
      userId: user.sub,
      metric: qs.metric ?? undefined,
      from,
      to,
      limit: qs.limit ? parseInt(qs.limit, 10) : 500,
      offset: qs.offset ? parseInt(qs.offset, 10) : 0,
    });
    return json(200, { ok: true, readings });
  } catch {
    return json(404, { ok: false, message: "device not found or access denied" });
  }
};
