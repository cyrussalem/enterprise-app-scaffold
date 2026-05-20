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

const log = (msg: string, data?: unknown) => {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[whatsapp] ${ts} ${msg}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[whatsapp] ${ts} ${msg}`);
  }
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  log("Webhook received", { method: event.httpMethod, path: event.path, isBase64Encoded: event.isBase64Encoded });

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
    : (event.body ?? "");

  const params = parseUrlEncoded(rawBody);
  const from = params.From ?? "";
  const messageBody = params.Body ?? "";

  log("Parsed Twilio payload", { From: from, Body: messageBody });

  // Validate Twilio signature (skip in local dev via env var)
  if (!process.env.TWILIO_SKIP_SIGNATURE_VALIDATION) {
    const signature = event.headers?.["X-Twilio-Signature"] ?? event.headers?.["x-twilio-signature"] ?? "";
    const url = reconstructUrl(event);
    log("Validating Twilio signature", { url, signaturePresent: !!signature });
    if (!validateTwilioSignature(signature, url, params)) {
      log("Signature validation FAILED — returning 403");
      return json(403, { ok: false, message: "invalid signature" });
    }
    log("Signature validation passed");
  } else {
    log("Signature validation SKIPPED (TWILIO_SKIP_SIGNATURE_VALIDATION is set)");
  }

  // Strip "whatsapp:" prefix to get the plain E.164 number
  const phoneNumber = from.replace(/^whatsapp:/i, "");
  if (!phoneNumber) {
    log("Missing From field — returning 400");
    return json(400, { ok: false, message: "missing From field" });
  }

  log(`Looking up user profile for ${phoneNumber}`);
  const { UserProfile } = initModels();
  const profile = await UserProfile.findOne({ where: { whatsapp_number: phoneNumber } });

  if (!profile) {
    log(`No user profile found for ${phoneNumber} — sending unregistered reply`);
    await sendWhatsApp(
      phoneNumber,
      "Your WhatsApp number is not registered with this platform. " +
      "Please contact your administrator to get access."
    );
    return json(200, { ok: true });
  }

  log(`Profile found`, { userId: profile.user_id });

  log("Fetching fleet summary and device list from DB...");
  const [summary, devices] = await Promise.all([
    getFleetSummary(profile.user_id),
    listDevices({ userId: profile.user_id, limit: 100 }),
  ]);
  log(`Fleet data loaded`, { deviceCount: devices.length, healthScore: (summary as unknown as Record<string, unknown>).healthScore });

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
    log(`Calling Claude with question: "${messageBody}"`);
    const reply = await generateReply(messageBody, deviceContext);
    log(`Claude replied: "${reply}"`);
    await sendWhatsApp(phoneNumber, reply);
    log(`WhatsApp reply sent to ${phoneNumber}`);
  } catch (err) {
    log("Error generating or sending reply", { error: String(err) });
    await sendWhatsApp(phoneNumber, "Sorry, I couldn't process your request right now. Please try again.");
  }

  return json(200, { ok: true });
};
