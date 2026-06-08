export type AIProviderName = "mock" | "openai" | "anthropic";

export interface AIResult<T = string> {
  output: T;
  confidence: number; // 0-1
  provider: AIProviderName;
  model: string;
}

export interface AIProvider {
  name: AIProviderName;
  isConfigured(): boolean;
  complete(prompt: string, system?: string): Promise<AIResult>;
}

export interface ParsedIntent {
  intent:
    | "summarize_day"
    | "draft_reply"
    | "create_task"
    | "create_follow_up"
    | "show_urgent"
    | "prepare_meeting"
    | "show_overdue_follow_ups"
    | "unknown";
  parameters: Record<string, string>;
  confidence: number;
  rawCommand: string;
}
