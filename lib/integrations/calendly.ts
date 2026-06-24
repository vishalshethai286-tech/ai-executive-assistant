import { prisma } from "@/lib/db/prisma";

export interface CalendlySyncResult {
  synced: number;
  errors?: string[];
}

async function getCalendlyToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "calendly", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).apiToken ?? null;
}

async function calendlyFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Calendly API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function syncCalendlyEvents(userId: string): Promise<CalendlySyncResult> {
  const token = await getCalendlyToken(userId);
  if (!token) return { synced: 0, errors: ["Calendly not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const userRes = await calendlyFetch("https://api.calendly.com/users/me", token);
    const userUri = userRes.resource?.uri;
    if (!userUri) throw new Error("Could not resolve Calendly user");

    const now = new Date().toISOString();
    const eventsRes = await calendlyFetch(
      `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${now}&count=30&status=active`,
      token,
    );

    for (const event of eventsRes.collection ?? []) {
      const externalId = `calendly_${event.uri.split("/").pop()}`;
      const existing = await prisma.calendarEvent.findFirst({
        where: { userId, externalId },
      });
      if (existing) continue;

      let attendees: string[] = [];
      try {
        const inviteesRes = await calendlyFetch(`${event.uri}/invitees?count=10`, token);
        attendees = (inviteesRes.collection ?? []).map((i: any) => i.email || i.name).filter(Boolean);
      } catch { /* skip invitee fetch errors */ }

      await prisma.calendarEvent.create({
        data: {
          userId,
          externalId,
          title: event.name || "Calendly Meeting",
          description: `Calendly event\n${event.uri}`,
          location: event.location?.join_url ?? event.location?.location ?? null,
          startsAt: new Date(event.start_time),
          endsAt: new Date(event.end_time),
          attendees,
        },
      });
      synced++;
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "calendly" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Calendly API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
