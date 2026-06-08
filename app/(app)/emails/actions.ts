"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as emailService from "@/services/emailService";
import { createFollowUpFromEmail, createFollowUp } from "@/services/followUpService";
import { createTask } from "@/services/taskService";
import { summarizeEmail, draftEmailReply, ReplyTone } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";
import { TaskCategory, Priority } from "@prisma/client";

async function getEmailOrThrow(userId: string, id: string) {
  return prisma.emailMessage.findFirstOrThrow({ where: { id, userId } });
}

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function summarizeEmailAction(id: string) {
  const userId = await requireUserId();
  const email = await getEmailOrThrow(userId, id);
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await summarizeEmail(email, provider);

  await Promise.all([
    emailService.saveAISummary(userId, id, result.output),
    logAIActivity({
      userId,
      function: "summarizeEmail",
      provider: result.provider,
      inputSummary: `subject=${email.subject}`,
      outputSummary: result.output,
      confidence: result.confidence,
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/emails");
  return result.output;
}

export async function draftReplyAction(id: string, tone: ReplyTone, instructions?: string) {
  const userId = await requireUserId();
  const email = await getEmailOrThrow(userId, id);
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await draftEmailReply(email, tone, instructions, provider);

  await logAIActivity({
    userId,
    function: "draftEmailReply",
    provider: result.provider,
    inputSummary: `subject=${email.subject} tone=${tone}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return { draft: result.output, confidence: result.confidence };
}

export async function markPriorityAction(id: string, isPriority: boolean) {
  const userId = await requireUserId();
  await emailService.markAsPriority(userId, id, isPriority);
  revalidatePath("/emails");
}

export async function markReadAction(id: string, isUnread: boolean) {
  const userId = await requireUserId();
  await emailService.markAsRead(userId, id, isUnread);
  revalidatePath("/emails");
}

export async function setLabelAction(id: string, label: string | null) {
  const userId = await requireUserId();
  await emailService.setEmailLabel(userId, id, label);
  revalidatePath("/emails");
}

export async function convertToTaskAction(id: string) {
  const userId = await requireUserId();
  const email = await getEmailOrThrow(userId, id);
  const task = await createTask(userId, {
    title: `Follow up: ${email.subject}`,
    description: `From ${email.fromName} <${email.fromEmail}>\n\n${email.snippet}`,
    priority: Priority.MEDIUM,
    status: "TODO",
    category: TaskCategory.FOLLOW_UP,
  } as never);
  await setLabelAction(id, "follow_up_needed");
  revalidatePath("/tasks");
  return task;
}

export async function convertToFollowUpAction(id: string) {
  const userId = await requireUserId();
  const email = await getEmailOrThrow(userId, id);
  const followUp = email.contactId
    ? await createFollowUp(userId, {
        personName: email.fromName,
        context: `Re: ${email.subject}`,
        status: "PENDING",
        contactId: email.contactId,
        emailId: email.id,
      } as never)
    : await createFollowUpFromEmail(userId, email);
  await setLabelAction(id, "follow_up_needed");
  revalidatePath("/follow-ups");
  return followUp;
}
