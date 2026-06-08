import { prisma } from "@/lib/db/prisma";
import { FollowUpInput } from "@/lib/validators";
import { Prisma, FollowUpStatus } from "@prisma/client";
import { startOfToday, endOfToday } from "./taskService";

export function listFollowUps(userId: string, where: Prisma.FollowUpWhereInput = {}) {
  return prisma.followUp.findMany({
    where: { userId, ...where },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { contact: true },
  });
}

export function getFollowUpsDueToday(userId: string) {
  return listFollowUps(userId, {
    dueDate: { gte: startOfToday(), lt: endOfToday() },
    status: { in: [FollowUpStatus.PENDING, FollowUpStatus.WAITING] },
  });
}

export function getOverdueFollowUps(userId: string) {
  return listFollowUps(userId, {
    dueDate: { lt: startOfToday() },
    status: { in: [FollowUpStatus.PENDING, FollowUpStatus.WAITING] },
  });
}

export function createFollowUp(userId: string, data: FollowUpInput) {
  return prisma.followUp.create({ data: { ...data, userId } });
}

export function updateFollowUp(userId: string, id: string, data: Partial<FollowUpInput> & { aiMessage?: string }) {
  return prisma.followUp.update({ where: { id, userId }, data });
}

export function deleteFollowUp(userId: string, id: string) {
  return prisma.followUp.delete({ where: { id, userId } });
}

export function createFollowUpFromEmail(
  userId: string,
  email: { id: string; fromName: string; fromEmail: string; subject: string; contactId?: string | null }
) {
  return prisma.followUp.create({
    data: {
      userId,
      personName: email.fromName,
      context: `Re: ${email.subject}`,
      status: FollowUpStatus.PENDING,
      emailId: email.id,
      contactId: email.contactId ?? undefined,
    },
  });
}
