"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as notificationService from "@/services/notificationService";

export async function markNotificationReadAction(id: string) {
  const userId = await requireUserId();
  await notificationService.markAsRead(userId, id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  await notificationService.markAllAsRead(userId);
  revalidatePath("/notifications");
}
