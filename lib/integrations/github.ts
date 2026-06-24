import { prisma } from "@/lib/db/prisma";

export interface GitHubSyncResult {
  synced: number;
  errors?: string[];
}

async function getGitHubToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "github", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).personalAccessToken ?? null;
}

async function ghFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function syncGitHubIssues(userId: string): Promise<GitHubSyncResult> {
  const token = await getGitHubToken(userId);
  if (!token) return { synced: 0, errors: ["GitHub not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const issues = await ghFetch(
      "https://api.github.com/issues?filter=assigned&state=open&per_page=30&sort=updated",
      token,
    );

    for (const issue of issues) {
      const externalId = `github_issue_${issue.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const repo = issue.repository?.full_name || "unknown";
      const labels = (issue.labels ?? []).map((l: any) => l.name).join(", ");

      await prisma.task.create({
        data: {
          userId,
          title: `[GitHub] ${issue.title}`,
          description: `${externalId}\n${repo}#${issue.number}\n${labels ? `Labels: ${labels}\n` : ""}${issue.html_url}`,
          priority: issue.labels?.some((l: any) => /urgent|critical|p0/i.test(l.name)) ? "HIGH" : "MEDIUM",
          status: "TODO",
          category: "WORK",
          dueDate: issue.milestone?.due_on ? new Date(issue.milestone.due_on) : null,
        },
      });
      synced++;
    }

    const reviews = await ghFetch(
      "https://api.github.com/search/issues?q=is:pr+is:open+review-requested:@me&per_page=20",
      token,
    );

    for (const pr of reviews.items ?? []) {
      const externalId = `github_pr_review_${pr.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      await prisma.task.create({
        data: {
          userId,
          title: `[GitHub PR Review] ${pr.title}`,
          description: `${externalId}\n${pr.html_url}`,
          priority: "HIGH",
          status: "TODO",
          category: "WORK",
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "github" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "GitHub API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
