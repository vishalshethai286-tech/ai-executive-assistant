import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { syncAllConnected } from "@/lib/integrations/syncAll";
import { triageNewEmails, scoreNewTasks } from "@/lib/ai/autoTriage";
import { generateProactiveNotifications } from "@/lib/ai/proactiveNotifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, aiProvider: true },
  });

  const results = [];

  for (const user of users) {
    try {
      const syncResults = await syncAllConnected(user.id);
      const totalSynced = syncResults.reduce((sum, r) => sum + r.synced, 0);

      const provider = (user.aiProvider as "mock" | "openai" | "anthropic") ?? "mock";

      const triage = await triageNewEmails(user.id, provider);
      const scoring = await scoreNewTasks(user.id, provider);
      const notifications = await generateProactiveNotifications(user.id);

      results.push({
        userId: user.id,
        synced: totalSynced,
        providers: syncResults.length,
        triaged: triage.triaged,
        scored: scoring.scored,
        notifications: notifications.created,
      });
    } catch (err) {
      results.push({
        userId: user.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    users: results.length,
    results,
  });
}
