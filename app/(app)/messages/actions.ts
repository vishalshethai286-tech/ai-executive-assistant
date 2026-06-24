"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createMessage, type MessageChannel } from "@/services/messageService";
import { sendSlackMessage } from "@/lib/integrations/slack";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { sendWhatsAppMessage } from "@/lib/integrations/whatsapp";
import { sendSMS } from "@/lib/integrations/twilio";
import { draftEmailReply, type ReplyTone } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function getConversationsAction() {
  const userId = await requireUserId();

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      senderId: true,
      senderName: true,
      channel: true,
      body: true,
      direction: true,
      createdAt: true,
    },
  });

  const convMap = new Map<string, {
    senderId: string;
    senderName: string;
    channel: string;
    lastMessage: string;
    lastAt: string;
    unread: number;
  }>();

  for (const msg of messages) {
    const key = `${msg.channel}:${msg.senderId}`;
    if (!convMap.has(key)) {
      convMap.set(key, {
        senderId: msg.senderId,
        senderName: msg.senderName,
        channel: msg.channel,
        lastMessage: msg.body.slice(0, 100),
        lastAt: msg.createdAt.toISOString(),
        unread: 0,
      });
    }
    if (msg.direction === "inbound") {
      const conv = convMap.get(key)!;
      conv.unread++;
    }
  }

  return Array.from(convMap.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

export async function getThreadAction(channel: string, senderId: string) {
  const userId = await requireUserId();

  const messages = await prisma.message.findMany({
    where: { userId, channel, senderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      direction: true,
      senderName: true,
      body: true,
      createdAt: true,
      metadata: true,
    },
  });

  return messages.map((m) => ({
    id: m.id,
    direction: m.direction,
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function sendReplyAction(
  channel: string,
  senderId: string,
  body: string,
) {
  const userId = await requireUserId();

  switch (channel) {
    case "slack":
      await sendSlackMessage(userId, senderId, body);
      break;
    case "telegram":
      await sendTelegramMessage(userId, senderId, body);
      break;
    case "whatsapp":
      await sendWhatsAppMessage(userId, senderId, body);
      break;
    case "sms":
      await sendSMS(userId, senderId, body);
      break;
  }

  await createMessage(userId, {
    channel: channel as MessageChannel,
    direction: "outbound",
    senderName: "You",
    senderId,
    body,
  });

  revalidatePath("/messages");
  return { ok: true };
}

export async function draftReplyAction(
  channel: string,
  senderName: string,
  lastMessages: string,
  tone: ReplyTone = "Professional",
) {
  const userId = await requireUserId();
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await draftEmailReply(
    {
      fromName: senderName,
      fromEmail: senderName,
      subject: `${channel} conversation`,
      body: lastMessages,
      receivedAt: new Date(),
    },
    tone,
    `Draft a ${channel} reply to ${senderName}. Keep it concise and appropriate for ${channel} messaging (not email format).`,
    provider,
  );

  await logAIActivity({
    userId,
    function: "smartCompose",
    provider: result.provider,
    inputSummary: `channel=${channel} to=${senderName}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return { draft: result.output };
}
