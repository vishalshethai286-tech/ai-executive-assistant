"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { draftEmailReply, ReplyTone, generateFollowUpMessage } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { sendEmail } from "@/lib/email/sendEmail";
import { sendSlackMessage } from "@/lib/integrations/slack";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";
import { sendSMS } from "@/lib/integrations/twilio";

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export type Channel = "email" | "slack" | "telegram" | "whatsapp" | "sms";

export async function getAvailableChannels(): Promise<{ channel: Channel; label: string; connected: boolean }[]> {
  const userId = await requireUserId();
  const accounts = await prisma.integrationAccount.findMany({
    where: { userId, status: "connected" },
  });

  const connected = new Set(accounts.map((a) => a.provider));

  return [
    { channel: "email", label: "Email (SMTP)", connected: connected.has("smtp_email") },
    { channel: "slack", label: "Slack", connected: connected.has("slack") },
    { channel: "telegram", label: "Telegram", connected: connected.has("telegram") },
    { channel: "whatsapp", label: "WhatsApp", connected: connected.has("whatsapp") },
    { channel: "sms", label: "SMS (Twilio)", connected: connected.has("twilio_sms") },
  ];
}

export async function generateDraft(
  channel: Channel,
  recipient: string,
  context: string,
  tone: ReplyTone = "Professional",
) {
  const userId = await requireUserId();
  const provider = await getProvider(userId);
  const start = Date.now();

  let result;

  if (channel === "email") {
    result = await draftEmailReply(
      {
        fromName: recipient,
        fromEmail: recipient,
        subject: context,
        body: context,
        receivedAt: new Date(),
      },
      tone,
      `Compose a new email to ${recipient} about: ${context}`,
      provider,
    );
  } else {
    result = await generateFollowUpMessage(
      {
        personName: recipient,
        context,
        nextAction: context,
      },
      provider,
    );
  }

  await logAIActivity({
    userId,
    function: "smartCompose",
    provider: result.provider,
    inputSummary: `channel=${channel} to=${recipient}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return { draft: result.output, confidence: result.confidence };
}

export async function sendMessage(
  channel: Channel,
  recipient: string,
  subject: string,
  body: string,
) {
  const userId = await requireUserId();

  switch (channel) {
    case "email":
      await sendEmail(userId, { to: recipient, subject, body });
      break;
    case "slack":
      await sendSlackMessage(userId, recipient, body);
      break;
    case "telegram":
      await sendTelegramMessage(userId, recipient, body);
      break;
    case "whatsapp":
      await sendWhatsAppMessage(userId, recipient, body);
      break;
    case "sms":
      await sendSMS(userId, recipient, body);
      break;
  }

  await prisma.commandLog.create({
    data: {
      userId,
      rawCommand: `Send ${channel} to ${recipient}`,
      parsedIntent: "send_message",
      parameters: { channel, recipient, subject },
      resultSummary: `Sent via ${channel}`,
      success: true,
    },
  });

  revalidatePath("/compose");
  revalidatePath("/notifications");
  return { ok: true };
}
