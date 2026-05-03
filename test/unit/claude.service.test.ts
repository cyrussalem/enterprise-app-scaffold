import Anthropic from "@anthropic-ai/sdk";
import { generateReply, ClaudeServiceError } from "../../src/services/claudeService";

function makeMockClient(text: string): Anthropic {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: "text", text }],
      }),
    },
  } as unknown as Anthropic;
}

describe("generateReply", () => {
  it("calls claude-sonnet-4-6 with max_tokens 300 and returns the text", async () => {
    const client = makeMockClient("3 devices are online.");
    const result = await generateReply("How many devices are online?", { total: 5, online: 3 }, client);

    expect(result).toBe("3 devices are online.");
    expect((client.messages.create as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
      })
    );
  });

  it("includes device context JSON in the system prompt", async () => {
    const client = makeMockClient("All good.");
    const context = { total: 10, online: 8, offline: 2 };

    await generateReply("Status?", context, client);

    const callArgs = (client.messages.create as jest.Mock).mock.calls[0][0];
    const systemText: string = callArgs.system[0].text;
    expect(systemText).toContain(JSON.stringify(context, null, 2));
  });

  it("applies cache_control ephemeral to the system block", async () => {
    const client = makeMockClient("ok");
    await generateReply("test", {}, client);

    const callArgs = (client.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("passes the question as the user message", async () => {
    const client = makeMockClient("answer");
    await generateReply("Which devices are offline?", {}, client);

    const callArgs = (client.messages.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.messages[0]).toEqual({ role: "user", content: "Which devices are offline?" });
  });

  it("throws ClaudeServiceError when the API call fails", async () => {
    const client = {
      messages: { create: jest.fn().mockRejectedValue(new Error("network error")) },
    } as unknown as Anthropic;

    await expect(generateReply("test?", {}, client)).rejects.toBeInstanceOf(ClaudeServiceError);
  });

  it("passes the returned text back unchanged", async () => {
    const expected = "You have 2 offline devices: sensor-01 and tracker-07.";
    const client = makeMockClient(expected);
    const result = await generateReply("any question", {}, client);
    expect(result).toBe(expected);
  });
});
