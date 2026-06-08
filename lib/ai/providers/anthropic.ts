import { AIProvider, AIResult } from "../types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const anthropicProvider: AIProvider = {
  name: "anthropic",
  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  async complete(prompt: string, system?: string): Promise<AIResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const output: string = data.content?.[0]?.text ?? "";

    return {
      output,
      confidence: 0.85,
      provider: "anthropic",
      model: MODEL,
    };
  },
};
