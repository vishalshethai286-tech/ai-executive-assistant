import { prisma } from "@/lib/db/prisma";
import { AIProviderName } from "@/lib/ai/types";

/** Logs AI activity with redacted/short summaries — never the full sensitive content. */
export function logAIActivity(params: {
  userId: string;
  function: string;
  provider: AIProviderName;
  inputSummary: string;
  outputSummary: string;
  confidence?: number;
  durationMs?: number;
  success?: boolean;
  error?: string;
}) {
  return prisma.aILog.create({
    data: {
      userId: params.userId,
      function: params.function,
      provider: params.provider,
      inputSummary: truncate(params.inputSummary),
      outputSummary: truncate(params.outputSummary),
      confidence: params.confidence,
      durationMs: params.durationMs,
      success: params.success ?? true,
      error: params.error,
    },
  });
}

export function listAILogs(userId: string, take = 50) {
  return prisma.aILog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

function truncate(text: string, max = 280) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
