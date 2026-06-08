import { AIProvider, AIResult } from "../types";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const openaiProvider: AIProvider = {
  name: "openai",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async complete(prompt: string, system?: string): Promise<AIResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const output: string = data.choices?.[0]?.message?.content ?? "";

    return {
      output,
      confidence: 0.85,
      provider: "openai",
      model: MODEL,
    };
  },
};
