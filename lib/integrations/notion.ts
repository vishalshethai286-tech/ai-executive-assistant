import { prisma } from "@/lib/db/prisma";

export interface NotionSyncResult {
  synced: number;
  errors?: string[];
}

async function getNotionToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "notion", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).integrationToken ?? null;
}

async function notionFetch(url: string, token: string, body?: object) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractPlainText(richText: any[]): string {
  return (richText ?? []).map((t: any) => t.plain_text ?? "").join("");
}

export async function syncNotionPages(userId: string): Promise<NotionSyncResult> {
  const token = await getNotionToken(userId);
  if (!token) return { synced: 0, errors: ["Notion not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const searchRes = await notionFetch("https://api.notion.com/v1/search", token, {
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 20,
    });

    for (const page of searchRes.results ?? []) {
      if (page.object !== "page") continue;

      const externalId = `notion_${page.id}`;
      const existing = await prisma.note.findFirst({
        where: { userId, content: { contains: externalId } },
      });
      if (existing) continue;

      const titleProp = Object.values(page.properties ?? {}).find(
        (p: any) => p.type === "title",
      ) as any;
      const title = titleProp ? extractPlainText(titleProp.title) : "Untitled";

      let content = `Source: Notion\n${externalId}\n${page.url}\n\n`;

      try {
        const blocksRes = await notionFetch(
          `https://api.notion.com/v1/blocks/${page.id}/children?page_size=50`,
          token,
        );
        for (const block of blocksRes.results ?? []) {
          const textArr =
            block[block.type]?.rich_text ?? block[block.type]?.text ?? [];
          const text = extractPlainText(textArr);
          if (text) {
            if (block.type === "heading_1") content += `# ${text}\n`;
            else if (block.type === "heading_2") content += `## ${text}\n`;
            else if (block.type === "heading_3") content += `### ${text}\n`;
            else if (block.type === "bulleted_list_item") content += `• ${text}\n`;
            else if (block.type === "numbered_list_item") content += `- ${text}\n`;
            else if (block.type === "to_do") content += `☐ ${text}\n`;
            else content += `${text}\n`;
          }
        }
      } catch {
        content += "(Could not fetch page content — check integration permissions)\n";
      }

      await prisma.note.create({
        data: {
          userId,
          title: `[Notion] ${title}`,
          content,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "notion" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Notion API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
