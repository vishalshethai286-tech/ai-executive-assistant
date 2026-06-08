import { prisma } from "@/lib/db/prisma";
import { ContactInput } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export function listContacts(userId: string, search?: string) {
  const where: Prisma.ContactWhereInput = { userId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  return prisma.contact.findMany({ where, orderBy: { name: "asc" } });
}

export function getContact(userId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, userId },
    include: {
      emails: { orderBy: { receivedAt: "desc" }, take: 10 },
      events: { orderBy: { startsAt: "desc" }, take: 10 },
      tasks: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function createContact(userId: string, data: ContactInput) {
  return prisma.contact.create({ data: { ...data, email: data.email || null, userId } });
}

export function updateContact(userId: string, id: string, data: Partial<ContactInput>) {
  return prisma.contact.update({ where: { id, userId }, data });
}

export function deleteContact(userId: string, id: string) {
  return prisma.contact.delete({ where: { id, userId } });
}

export function saveRelationshipSummary(userId: string, id: string, summary: string) {
  return prisma.contact.update({ where: { id, userId }, data: { aiRelationshipSummary: summary } });
}
