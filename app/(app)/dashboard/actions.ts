"use server";

import { requireUserId } from "@/lib/auth/session";
import { generateDailyBriefing, BriefingInputs } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";

export async function generateBriefing(inputs: BriefingInputs) {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const start = Date.now();

  const result = await generateDailyBriefing(inputs, (user?.aiProvider as never) ?? "mock");

  await logAIActivity({
    userId,
    function: "generateDailyBriefing",
    provider: result.provider,
    inputSummary: `meetings=${inputs.meetings.length} emails=${inputs.importantEmails.length} tasks=${inputs.pendingTasks.length} followUps=${inputs.followUpsDueToday.length}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return { output: result.output, confidence: result.confidence };
}
