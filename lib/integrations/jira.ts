import { prisma } from "@/lib/db/prisma";

export interface JiraSyncResult {
  synced: number;
  errors?: string[];
}

async function getJiraCredentials(userId: string) {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "jira", status: "connected" },
  });
  if (!account?.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.siteUrl || !meta.email || !meta.apiToken) return null;
  return meta;
}

export async function syncJiraIssues(userId: string): Promise<JiraSyncResult> {
  const creds = await getJiraCredentials(userId);
  if (!creds) return { synced: 0, errors: ["Jira not connected"] };

  const errors: string[] = [];
  let synced = 0;
  const base = creds.siteUrl.replace(/\/$/, "");
  const authHeader = "Basic " + Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");

  try {
    const res = await fetch(
      `${base}/rest/api/3/search?jql=assignee=currentUser() AND statusCategory != Done ORDER BY updated DESC&maxResults=30&fields=summary,priority,status,duedate,labels,issuetype,key`,
      {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`);
    const data = await res.json();

    for (const issue of data.issues ?? []) {
      const externalId = `jira_${issue.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const jiraPriority = issue.fields?.priority?.name?.toLowerCase() ?? "";
      let priority = "MEDIUM";
      if (jiraPriority.includes("highest") || jiraPriority.includes("blocker")) priority = "CRITICAL";
      else if (jiraPriority.includes("high")) priority = "HIGH";
      else if (jiraPriority.includes("low")) priority = "LOW";

      await prisma.task.create({
        data: {
          userId,
          title: `[Jira ${issue.key}] ${issue.fields?.summary ?? "Untitled"}`,
          description: `${externalId}\nType: ${issue.fields?.issuetype?.name ?? "—"}\nStatus: ${issue.fields?.status?.name ?? "—"}\n${base}/browse/${issue.key}`,
          priority: priority as any,
          status: "TODO",
          category: "WORK",
          dueDate: issue.fields?.duedate ? new Date(issue.fields.duedate) : null,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "jira" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Jira API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
