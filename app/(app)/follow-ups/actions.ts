"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { followUpSchema, FollowUpInput } from "@/lib/validators";
import * as followUpService from "@/services/followUpService";
import { generateFollowUpMessage } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";

export async function createFollowUpAction(input: FollowUpInput) {
  const userId = await requireUserId();
  const parsed = followUpSchema.parse(input);
  const followUp = await followUpService.createFollowUp(userId, parsed);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return followUp;
}

export async function updateFollowUpAction(id: string, input: Partial<FollowUpInput>) {
  const userId = await requireUserId();
  const followUp = await followUpService.updateFollowUp(userId, id, input);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return followUp;
}

export async function deleteFollowUpAction(id: string) {
  const userId = await requireUserId();
  await followUpService.deleteFollowUp(userId, id);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
}

export async function generateFollowUpMessageAction(id: string) {
  const userId = await requireUserId();
  const followUp = await prisma.followUp.findFirstOrThrow({ where: { id, userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const start = Date.now();

  const result = await generateFollowUpMessage(followUp, (user?.aiProvider as never) ?? "mock");

  await Promise.all([
    followUpService.updateFollowUp(userId, id, { aiMessage: result.output } as never),
    logAIActivity({
      userId,
      function: "generateFollowUpMessage",
      provider: result.provider,
      inputSummary: `person=${followUp.personName}`,
      outputSummary: result.output,
      confidence: result.confidence,
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/follow-ups");
  return result.output;
}
