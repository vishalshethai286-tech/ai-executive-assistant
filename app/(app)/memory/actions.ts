"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { memoryItemSchema, MemoryItemInput } from "@/lib/validators";
import * as memoryService from "@/services/memoryService";

export async function createMemoryItemAction(input: MemoryItemInput) {
  const userId = await requireUserId();
  const parsed = memoryItemSchema.parse(input);
  const item = await memoryService.createMemoryItem(userId, parsed);
  revalidatePath("/memory");
  return item;
}

export async function updateMemoryItemAction(id: string, input: Partial<MemoryItemInput>) {
  const userId = await requireUserId();
  const item = await memoryService.updateMemoryItem(userId, id, input);
  revalidatePath("/memory");
  return item;
}

export async function deleteMemoryItemAction(id: string) {
  const userId = await requireUserId();
  await memoryService.deleteMemoryItem(userId, id);
  revalidatePath("/memory");
}

export async function toggleSensitiveAction(id: string, isSensitive: boolean) {
  const userId = await requireUserId();
  await memoryService.updateMemoryItem(userId, id, { isSensitive });
  revalidatePath("/memory");
}
