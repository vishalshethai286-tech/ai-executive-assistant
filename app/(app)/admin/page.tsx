import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { listAILogs } from "@/services/aiLogService";
import { AdminBoard } from "./admin-board";

export default async function AdminPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role !== "admin") redirect("/dashboard");

  const [users, aiLogs, commandLogs, integrations, userCount, dbHealthy] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 25 }),
    listAILogs(userId, 30),
    prisma.commandLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.integrationAccount.findMany({ where: { userId } }),
    prisma.user.count(),
    prisma.user
      .findFirst()
      .then(() => true)
      .catch(() => false),
  ]);

  const failedAILogs = aiLogs.filter((l: (typeof aiLogs)[number]) => !l.success);

  return (
    <AdminBoard
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        aiProvider: u.aiProvider,
        createdAt: u.createdAt.toISOString(),
      }))}
      userCount={userCount}
      aiLogs={aiLogs.map((l) => ({
        id: l.id,
        function: l.function,
        provider: l.provider,
        outputSummary: l.outputSummary,
        confidence: l.confidence,
        durationMs: l.durationMs,
        success: l.success,
        error: l.error,
        createdAt: l.createdAt.toISOString(),
      }))}
      commandLogs={commandLogs.map((c) => ({
        id: c.id,
        rawCommand: c.rawCommand,
        parsedIntent: c.parsedIntent,
        resultSummary: c.resultSummary,
        success: c.success,
        createdAt: c.createdAt.toISOString(),
      }))}
      integrations={integrations.map((i) => ({
        provider: i.provider,
        status: i.status,
        lastSyncedAt: i.lastSyncedAt ? i.lastSyncedAt.toISOString() : null,
      }))}
      dbHealthy={dbHealthy}
      recentErrors={failedAILogs.map((l) => ({
        id: l.id,
        source: l.function,
        message: l.error ?? "Unknown error",
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
