import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type EmailFilter = "all" | "unread" | "important" | "waiting_reply" | "follow_up_needed";

export function listEmails(userId: string, filter: EmailFilter = "all", search?: string) {
  const where: Prisma.EmailMessageWhereInput = { userId };

  if (filter === "unread") where.isUnread = true;
  if (filter === "important") where.isImportant = true;
  if (filter === "waiting_reply") where.label = "waiting_reply";
  if (filter === "follow_up_needed") where.label = "follow_up_needed";

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { fromName: { contains: search, mode: "insensitive" } },
      { snippet: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.emailMessage.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    include: { contact: true },
  });
}

export function getEmail(userId: string, id: string) {
  return prisma.emailMessage.findFirst({ where: { id, userId }, include: { contact: true } });
}

export function getUrgentEmails(userId: string, take = 5) {
  return prisma.emailMessage.findMany({
    where: { userId, OR: [{ isImportant: true }, { isPriority: true }] },
    orderBy: { receivedAt: "desc" },
    take,
  });
}

export function markAsPriority(userId: string, id: string, isPriority: boolean) {
  return prisma.emailMessage.update({ where: { id, userId }, data: { isPriority } });
}

export function markAsRead(userId: string, id: string, isUnread: boolean) {
  return prisma.emailMessage.update({ where: { id, userId }, data: { isUnread } });
}

export function setEmailLabel(userId: string, id: string, label: string | null) {
  return prisma.emailMessage.update({ where: { id, userId }, data: { label } });
}

export function saveAISummary(userId: string, id: string, aiSummary: string) {
  return prisma.emailMessage.update({ where: { id, userId }, data: { aiSummary } });
}
