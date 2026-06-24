import { prisma } from "@/lib/db/prisma";

export interface AsanaSyncResult {
  synced: number;
  errors?: string[];
}

async function getAsanaToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "asana", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).personalAccessToken ?? null;
}

export async function syncAsanaTasks(userId: string): Promise<AsanaSyncResult> {
  const token = await getAsanaToken(userId);
  if (!token) return { synced: 0, errors: ["Asana not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const meRes = await fetch("https://app.asana.com/api/1.0/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) throw new Error(`Asana API ${meRes.status}`);
    const me = await meRes.json();
    const workspaceGid = me.data?.workspaces?.[0]?.gid;
    if (!workspaceGid) throw new Error("No Asana workspace found");

    const tasksRes = await fetch(
      `https://app.asana.com/api/1.0/tasks?workspace=${workspaceGid}&assignee=me&completed_since=now&opt_fields=name,due_on,notes,permalink_url,tags.name&limit=30`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!tasksRes.ok) throw new Error(`Asana API ${tasksRes.status}`);
    const tasks = await tasksRes.json();

    for (const task of tasks.data ?? []) {
      const externalId = `asana_${task.gid}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const tags = (task.tags ?? []).map((t: any) => t.name).join(", ");

      await prisma.task.create({
        data: {
          userId,
          title: `[Asana] ${task.name}`,
          description: `${externalId}\n${task.permalink_url ?? ""}\n${tags ? `Tags: ${tags}` : ""}${task.notes ? `\n${task.notes.slice(0, 500)}` : ""}`,
          priority: "MEDIUM",
          status: "TODO",
          category: "WORK",
          dueDate: task.due_on ? new Date(task.due_on) : null,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "asana" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Asana API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
