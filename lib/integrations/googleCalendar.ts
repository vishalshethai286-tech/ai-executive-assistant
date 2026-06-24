import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface CalendarSyncResult {
  synced: number;
  source: "google_calendar" | "mock";
  errors?: string[];
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
}

async function getGoogleTokens(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return null;
  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  };
}

export async function syncGoogleCalendar(userId: string, daysAhead = 14): Promise<CalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    return { synced: 0, source: "mock" };
  }

  const tokens = await getGoogleTokens(userId);
  if (!tokens) {
    return { synced: 0, source: "mock", errors: ["No Google account linked. Sign in with Google first."] };
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const errors: string[] = [];
  let synced = 0;

  try {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);

    const listRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = listRes.data.items ?? [];

    for (const event of events) {
      try {
        if (!event.id) continue;

        const startsAt = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
            ? new Date(event.start.date)
            : null;
        const endsAt = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
            ? new Date(event.end.date)
            : null;

        if (!startsAt || !endsAt) continue;

        const attendees = (event.attendees ?? [])
          .map((a) => a.email ?? a.displayName ?? "")
          .filter(Boolean);

        const existing = await prisma.calendarEvent.findFirst({
          where: { userId, externalId: event.id },
        });

        if (existing) {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: {
              title: event.summary || "(no title)",
              description: event.description ?? null,
              location: event.location ?? null,
              startsAt,
              endsAt,
              attendees,
              organizer: event.organizer?.email ?? null,
            },
          });
        } else {
          await prisma.calendarEvent.create({
            data: {
              userId,
              externalId: event.id,
              title: event.summary || "(no title)",
              description: event.description ?? null,
              location: event.location ?? null,
              startsAt,
              endsAt,
              attendees,
              organizer: event.organizer?.email ?? null,
            },
          });
        }
        synced++;
      } catch (err) {
        errors.push(`Failed to sync event ${event.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    await prisma.integrationAccount.upsert({
      where: { userId_provider: { userId, provider: "google_calendar" } },
      update: { status: "connected", lastSyncedAt: new Date() },
      create: { userId, provider: "google_calendar", status: "connected", lastSyncedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Calendar API error";
    errors.push(message);
    await prisma.integrationAccount.upsert({
      where: { userId_provider: { userId, provider: "google_calendar" } },
      update: { status: "error" },
      create: { userId, provider: "google_calendar", status: "error" },
    });
  }

  return { synced, source: "google_calendar", errors: errors.length > 0 ? errors : undefined };
}

export interface ConflictCheckInput {
  startsAt: Date;
  endsAt: Date;
  existing: { id: string; title: string; startsAt: Date; endsAt: Date }[];
}

export function detectConflicts({ startsAt, endsAt, existing }: ConflictCheckInput) {
  return existing.filter((e) => startsAt < e.endsAt && endsAt > e.startsAt);
}

export function suggestMeetingTimes(existing: { startsAt: Date; endsAt: Date }[], durationMins = 30, count = 3) {
  const suggestions: { start: Date; end: Date }[] = [];
  const day = new Date();
  day.setHours(9, 0, 0, 0);

  for (let slot = 0; slot < 16 && suggestions.length < count; slot++) {
    const start = new Date(day.getTime() + slot * 30 * 60 * 1000);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);
    const overlaps = existing.some((e) => start < e.endsAt && end > e.startsAt);
    if (!overlaps && start.getHours() < 18) {
      suggestions.push({ start, end });
    }
  }
  return suggestions;
}
