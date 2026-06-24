import { prisma } from "@/lib/db/prisma";

export type MessageChannel = "whatsapp" | "telegram" | "slack" | "sms";
export type MessageDirection = "inbound" | "outbound";

export interface CreateMessageInput {
  channel: MessageChannel;
  externalId?: string;
  direction: MessageDirection;
  senderName: string;
  senderId: string;
  body: string;
  metadata?: Record<string, unknown>;
  contactId?: string;
}

export async function createMessage(userId: string, data: CreateMessageInput) {
  if (data.externalId) {
    const existing = await prisma.message.findFirst({
      where: { userId, externalId: data.externalId },
    });
    if (existing) return existing;
  }

  const contact = data.contactId
    ? undefined
    : await prisma.contact.findFirst({
        where: {
          userId,
          OR: [
            { phone: { contains: data.senderId } },
            { email: { contains: data.senderId, mode: "insensitive" } },
            { name: { contains: data.senderName, mode: "insensitive" } },
          ],
        },
      });

  return prisma.message.create({
    data: {
      userId,
      channel: data.channel,
      externalId: data.externalId,
      direction: data.direction,
      senderName: data.senderName,
      senderId: data.senderId,
      body: data.body,
      metadata: (data.metadata as any) ?? undefined,
      contactId: data.contactId ?? contact?.id ?? null,
    },
  });
}

export function listMessages(userId: string, channel?: MessageChannel, senderId?: string) {
  return prisma.message.findMany({
    where: {
      userId,
      ...(channel ? { channel } : {}),
      ...(senderId ? { senderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { contact: true },
  });
}

export function listConversations(userId: string, channel?: MessageChannel) {
  return prisma.$queryRaw<
    { senderId: string; senderName: string; channel: string; lastMessage: string; lastAt: Date; count: bigint }[]
  >`
    SELECT DISTINCT ON ("senderId")
      "senderId",
      "senderName",
      "channel",
      "body" as "lastMessage",
      "createdAt" as "lastAt",
      (SELECT COUNT(*) FROM "Message" m2 WHERE m2."userId" = "Message"."userId" AND m2."senderId" = "Message"."senderId" AND m2."channel" = "Message"."channel") as count
    FROM "Message"
    WHERE "userId" = ${userId}
      AND "direction" = 'inbound'
      ${channel ? prisma.$queryRaw`AND "channel" = ${channel}` : prisma.$queryRaw``}
    ORDER BY "senderId", "createdAt" DESC
  `;
}

export function getConversation(userId: string, channel: MessageChannel, senderId: string) {
  return prisma.message.findMany({
    where: { userId, channel, senderId },
    orderBy: { createdAt: "asc" },
    include: { contact: true },
  });
}
