import { prisma } from "@/lib/db/prisma";

export interface LinearSyncResult {
  synced: number;
  errors?: string[];
}

async function getLinearToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "linear", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).apiKey ?? null;
}

export async function syncLinearIssues(userId: string): Promise<LinearSyncResult> {
  const token = await getLinearToken(userId);
  if (!token) return { synced: 0, errors: ["Linear not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          viewer {
            assignedIssues(filter: { state: { type: { nin: ["completed", "canceled"] } } }, first: 50) {
              nodes {
                id identifier title priority priorityLabel url
                state { name }
                dueDate
                labels { nodes { name } }
                team { name }
              }
            }
          }
        }`,
      }),
    });

    if (!res.ok) throw new Error(`Linear API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const issues = data?.data?.viewer?.assignedIssues?.nodes ?? [];

    for (const issue of issues) {
      const externalId = `linear_${issue.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const priorityMap: Record<number, string> = { 0: "LOW", 1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW" };

      await prisma.task.create({
        data: {
          userId,
          title: `[Linear ${issue.identifier}] ${issue.title}`,
          description: `${externalId}\nTeam: ${issue.team?.name ?? "—"}\nState: ${issue.state?.name ?? "—"}\n${issue.url}`,
          priority: (priorityMap[issue.priority] ?? "MEDIUM") as any,
          status: "TODO",
          category: "WORK",
          dueDate: issue.dueDate ? new Date(issue.dueDate) : null,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "linear" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Linear API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
