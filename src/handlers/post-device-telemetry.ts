import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRequestUser } from "../auth/request-user";
import { ingestTelemetry, type TelemetryReadingInput } from "../devices/device.repository";
import { json, parseBody } from "../auth/http";

interface TelemetryBody {
  readings?: Array<{
    recorded_at: string;
    metric: string;
    value: number;
    unit?: string;
  }>;
}

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

  const body = parseBody<TelemetryBody>(event.body);
  if (!Array.isArray(body.readings) || body.readings.length === 0) {
    return json(400, { ok: false, message: "readings array is required and must be non-empty" });
  }

  const readings: TelemetryReadingInput[] = body.readings.map((r) => ({
    recorded_at: new Date(r.recorded_at),
    metric: r.metric,
    value: r.value,
    unit: r.unit,
  }));

  try {
    await ingestTelemetry({ deviceId: id, userId: user.sub, readings });
  } catch {
    return json(404, { ok: false, message: "device not found or access denied" });
  }

  return json(200, { ok: true });
};
