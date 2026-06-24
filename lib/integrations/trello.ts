import { prisma } from "@/lib/db/prisma";

export interface TrelloSyncResult {
  synced: number;
  errors?: string[];
}

async function getTrelloCredentials(userId: string) {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "trello", status: "connected" },
  });
  if (!account?.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.apiKey || !meta.token) return null;
  return meta;
}

export async function syncTrelloCards(userId: string): Promise<TrelloSyncResult> {
  const creds = await getTrelloCredentials(userId);
  if (!creds) return { synced: 0, errors: ["Trello not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const memberRes = await fetch(
      `https://api.trello.com/1/members/me?key=${creds.apiKey}&token=${creds.token}`,
    );
    if (!memberRes.ok) throw new Error(`Trello API ${memberRes.status}`);
    const member = await memberRes.json();

    const cardsRes = await fetch(
      `https://api.trello.com/1/members/${member.id}/cards?key=${creds.apiKey}&token=${creds.token}&fields=name,desc,due,labels,url,idBoard,idList&limit=30`,
    );
    if (!cardsRes.ok) throw new Error(`Trello API ${cardsRes.status}`);
    const cards = await cardsRes.json();

    for (const card of cards) {
      const externalId = `trello_${card.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const labels = (card.labels ?? []).map((l: any) => l.name).filter(Boolean).join(", ");
      const isUrgent = (card.labels ?? []).some((l: any) => /urgent|critical/i.test(l.name));

      await prisma.task.create({
        data: {
          userId,
          title: `[Trello] ${card.name}`,
          description: `${externalId}\n${card.url}\n${labels ? `Labels: ${labels}` : ""}`,
          priority: isUrgent ? "HIGH" : "MEDIUM",
          status: "TODO",
          category: "WORK",
          dueDate: card.due ? new Date(card.due) : null,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "trello" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Trello API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
