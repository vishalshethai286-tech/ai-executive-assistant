"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { syncAllConnected } from "@/lib/integrations/syncAll";
import { triageNewEmails, scoreNewTasks } from "@/lib/ai/autoTriage";
import { generateProactiveNotifications } from "@/lib/ai/proactiveNotifications";

export async function syncAndTriageAction() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const provider = (user?.aiProvider as "mock" | "openai" | "anthropic") ?? "mock";

  const syncResults = await syncAllConnected(userId);
  const totalSynced = syncResults.reduce((sum, r) => sum + r.synced, 0);
  const syncErrors = syncResults.filter((r) => r.errors?.length);

  const triage = await triageNewEmails(userId, provider);
  const scoring = await scoreNewTasks(userId, provider);
  const notifications = await generateProactiveNotifications(userId);

  revalidatePath("/dashboard");
  revalidatePath("/emails");
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  revalidatePath("/notifications");
  revalidatePath("/briefing");

  return {
    synced: totalSynced,
    providers: syncResults.length,
    syncErrors: syncErrors.length,
    triaged: triage.triaged,
    scored: scoring.scored,
    notifications: notifications.created,
  };
}
