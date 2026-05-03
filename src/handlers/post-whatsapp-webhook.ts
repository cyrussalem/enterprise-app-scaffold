import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { initModels } from "../db/models";
import { listDevices, getFleetSummary } from "../devices/device.repository";
import { generateReply } from "../services/claudeService";
import { sendWhatsApp, validateTwilioSignature } from "../services/twilioService";
import { json } from "../auth/http";

function parseUrlEncoded(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(body).forEach((v, k) => {
    params[k] = v;
  });
  return params;
}

function reconstructUrl(event: APIGatewayProxyEvent): string {
  const proto = event.headers?.["X-Forwarded-Proto"] ?? event.headers?.["x-forwarded-proto"] ?? "https";
  const host = event.headers?.Host ?? event.headers?.host ?? "localhost";
  const path = event.path ?? "/v1/whatsapp/webhook";
  return `${proto}://${host}${path}`;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
    : (event.body ?? "");

  const params = parseUrlEncoded(rawBody);
  const from = params.From ?? "";
  const messageBody = params.Body ?? "";

  // Validate Twilio signature (skip in local dev via env var)
  if (!process.env.TWILIO_SKIP_SIGNATURE_VALIDATION) {
    const signature = event.headers?.["X-Twilio-Signature"] ?? event.headers?.["x-twilio-signature"] ?? "";
    const url = reconstructUrl(event);
    if (!validateTwilioSignature(signature, url, params)) {
      return json(403, { ok: false, message: "invalid signature" });
    }
  }

  // Strip "whatsapp:" prefix to get the plain E.164 number
  const phoneNumber = from.replace(/^whatsapp:/i, "");
  if (!phoneNumber) {
    return json(400, { ok: false, message: "missing From field" });
  }

  // Resolve sender to a user account
  const { UserProfile } = initModels();
  const profile = await UserProfile.findOne({ where: { whatsapp_number: phoneNumber } });

  if (!profile) {
    await sendWhatsApp(
      phoneNumber,
      "Your WhatsApp number is not registered with this platform. " +
      "Please contact your administrator to get access."
    );
    return json(200, { ok: true });
  }

  // Build device context for Claude
  const [summary, devices] = await Promise.all([
    getFleetSummary(profile.user_id),
    listDevices({ userId: profile.user_id, limit: 100 }),
  ]);

  const deviceContext = {
    summary,
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      device_type: d.device_type,
      location_label: d.location_label,
      battery_level: d.battery_level,
      last_seen_at: d.last_seen_at,
      signal_strength: d.signal_strength,
      device_temperature: d.device_temperature,
      error_count: d.error_count,
    })),
  };

  try {
    const reply = await generateReply(messageBody, deviceContext);
    await sendWhatsApp(phoneNumber, reply);
  } catch {
    await sendWhatsApp(phoneNumber, "Sorry, I couldn't process your request right now. Please try again.");
  }

  return json(200, { ok: true });
};
