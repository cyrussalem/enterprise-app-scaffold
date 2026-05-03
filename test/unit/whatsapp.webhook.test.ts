import type { APIGatewayProxyEvent } from "aws-lambda";

jest.mock("../../src/services/twilioService", () => ({
  validateTwilioSignature: jest.fn().mockReturnValue(true),
  sendWhatsApp: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/services/claudeService", () => ({
  generateReply: jest.fn().mockResolvedValue("All 5 devices are online."),
}));

jest.mock("../../src/db/models", () => ({
  initModels: jest.fn(),
}));

jest.mock("../../src/devices/device.repository", () => ({
  listDevices: jest.fn().mockResolvedValue([]),
  getFleetSummary: jest.fn().mockResolvedValue({
    total: 5, online: 5, offline: 0, warning: 0, byType: {}, healthScore: 100,
  }),
}));

import { handler } from "../../src/handlers/post-whatsapp-webhook";
import * as twilioService from "../../src/services/twilioService";
import * as claudeService from "../../src/services/claudeService";
import * as models from "../../src/db/models";
import * as repo from "../../src/devices/device.repository";

const mockValidate = twilioService.validateTwilioSignature as jest.Mock;
const mockSend = twilioService.sendWhatsApp as jest.Mock;
const mockReply = claudeService.generateReply as jest.Mock;
const mockInitModels = models.initModels as jest.Mock;

const PROFILE = { user_id: "user-abc", whatsapp_number: "+15551234567" };
const mockFindOne = jest.fn();

function makeEvent(phone: string, body: string, extraHeaders: Record<string, string> = {}): APIGatewayProxyEvent {
  const params = new URLSearchParams({ From: `whatsapp:${phone}`, Body: body, To: "whatsapp:+15550000000" });
  return {
    httpMethod: "POST",
    path: "/v1/whatsapp/webhook",
    resource: "/v1/whatsapp/webhook",
    headers: { ...extraHeaders },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as never,
    body: params.toString(),
    isBase64Encoded: false,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TWILIO_SKIP_SIGNATURE_VALIDATION = "true";
  mockInitModels.mockReturnValue({ UserProfile: { findOne: mockFindOne } });
  mockFindOne.mockResolvedValue(PROFILE);
});

afterEach(() => {
  delete process.env.TWILIO_SKIP_SIGNATURE_VALIDATION;
});

describe("POST /v1/whatsapp/webhook", () => {
  describe("signature validation", () => {
    it("returns 403 when the Twilio signature is invalid", async () => {
      delete process.env.TWILIO_SKIP_SIGNATURE_VALIDATION;
      mockValidate.mockReturnValue(false);

      const res = await handler(makeEvent("+15551234567", "hello"));
      expect(res.statusCode).toBe(403);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("passes the request through when the signature is valid", async () => {
      delete process.env.TWILIO_SKIP_SIGNATURE_VALIDATION;
      mockValidate.mockReturnValue(true);

      const res = await handler(makeEvent("+15551234567", "hello"));
      expect(res.statusCode).toBe(200);
    });
  });

  describe("unrecognised number", () => {
    it("sends a not-recognised reply and returns 200", async () => {
      mockFindOne.mockResolvedValue(null);

      const res = await handler(makeEvent("+19999999999", "hello"));

      expect(res.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalledWith(
        "+19999999999",
        expect.stringMatching(/not registered/i)
      );
      expect(mockReply).not.toHaveBeenCalled();
    });
  });

  describe("recognised user", () => {
    it("calls generateReply with the user question and device context", async () => {
      const res = await handler(makeEvent("+15551234567", "How many devices are online?"));

      expect(res.statusCode).toBe(200);
      expect(mockReply).toHaveBeenCalledWith(
        "How many devices are online?",
        expect.objectContaining({
          summary: expect.objectContaining({ total: 5 }),
          devices: expect.any(Array),
        })
      );
    });

    it("sends the Claude reply via WhatsApp", async () => {
      mockReply.mockResolvedValue("All 5 devices are online.");

      await handler(makeEvent("+15551234567", "Status?"));

      expect(mockSend).toHaveBeenCalledWith("+15551234567", "All 5 devices are online.");
    });

    it("fetches devices for the profile's user_id", async () => {
      await handler(makeEvent("+15551234567", "Status?"));

      expect(repo.listDevices).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-abc" })
      );
      expect(repo.getFleetSummary).toHaveBeenCalledWith("user-abc");
    });

    it("sends an error reply and returns 200 when Claude throws", async () => {
      mockReply.mockRejectedValue(new Error("API down"));

      const res = await handler(makeEvent("+15551234567", "Status?"));

      expect(res.statusCode).toBe(200);
      expect(mockSend).toHaveBeenCalledWith(
        "+15551234567",
        expect.stringMatching(/try again/i)
      );
    });
  });
});
