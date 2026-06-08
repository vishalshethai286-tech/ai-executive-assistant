import { AIProvider, AIResult } from "../types";

/**
 * Deterministic mock provider so the app is fully usable without API keys.
 * Echoes a templated response based on the prompt so the UI has realistic content.
 */
export const mockProvider: AIProvider = {
  name: "mock",
  isConfigured() {
    return true;
  },
  async complete(prompt: string): Promise<AIResult> {
    return {
      output: `[Mock AI response]\n\n${summarizePromptForMock(prompt)}`,
      confidence: 0.7,
      provider: "mock",
      model: "mock-v1",
    };
  },
};

function summarizePromptForMock(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length < 240) return trimmed;
  return trimmed.slice(0, 240) + "…";
}
