import Anthropic from "@anthropic-ai/sdk";

export class ClaudeServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ClaudeServiceError";
  }
}

const SYSTEM_PROMPT_PREFIX =
  "You are an IoT fleet assistant. Answer the user's question about their devices " +
  "based only on the context below. Be concise (2–3 sentences max). " +
  "Proactively mention any critical alerts even if not asked.\n\n" +
  "Fleet context:\n";

export async function generateReply(
  question: string,
  deviceContext: object,
  client?: Anthropic
): Promise<string> {
  const anthropic = client ?? new Anthropic();
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_PREFIX + JSON.stringify(deviceContext, null, 2),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: question }],
    });
    const block = response.content[0];
    if (block.type !== "text") {
      throw new ClaudeServiceError("Unexpected response content type from Anthropic");
    }
    return block.text;
  } catch (err) {
    if (err instanceof ClaudeServiceError) throw err;
    throw new ClaudeServiceError("Anthropic API call failed", err);
  }
}
