import { prisma } from "@/lib/db/prisma";
import { MemoryItemInput } from "@/lib/validators";

export function listMemoryItems(userId: string) {
  return prisma.memoryItem.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { createdAt: "desc" }] });
}

export function createMemoryItem(userId: string, data: MemoryItemInput) {
  return prisma.memoryItem.create({ data: { ...data, userId } });
}

export function updateMemoryItem(userId: string, id: string, data: Partial<MemoryItemInput>) {
  return prisma.memoryItem.update({ where: { id, userId }, data });
}

export function deleteMemoryItem(userId: string, id: string) {
  return prisma.memoryItem.delete({ where: { id, userId } });
}
