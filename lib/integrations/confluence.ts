import { prisma } from "@/lib/db/prisma";

export interface ConfluenceSyncResult {
  synced: number;
  errors?: string[];
}

async function getConfluenceCredentials(userId: string) {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "confluence", status: "connected" },
  });
  if (!account?.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.siteUrl || !meta.email || !meta.apiToken) return null;
  return meta;
}

export async function syncConfluencePages(userId: string): Promise<ConfluenceSyncResult> {
  const creds = await getConfluenceCredentials(userId);
  if (!creds) return { synced: 0, errors: ["Confluence not connected"] };

  const errors: string[] = [];
  let synced = 0;
  const base = creds.siteUrl.replace(/\/$/, "");
  const authHeader = "Basic " + Buffer.from(`${creds.email}:${creds.apiToken}`).toString("base64");

  try {
    const res = await fetch(
      `${base}/wiki/api/v2/pages?sort=-modified-date&limit=15&body-format=storage`,
      { headers: { Authorization: authHeader, Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Confluence API ${res.status}: ${await res.text()}`);
    const data = await res.json();

    for (const page of data.results ?? []) {
      const externalId = `confluence_${page.id}`;
      const existing = await prisma.note.findFirst({
        where: { userId, content: { contains: externalId } },
      });
      if (existing) continue;

      const bodyHtml = page.body?.storage?.value ?? "";
      const plainText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      await prisma.note.create({
        data: {
          userId,
          title: `[Confluence] ${page.title}`,
          content: `Source: Confluence\n${externalId}\n${base}/wiki/spaces/${page.spaceId}/pages/${page.id}\n\n${plainText.slice(0, 5000)}`,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "confluence" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Confluence API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
