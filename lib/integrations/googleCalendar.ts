/**
 * Google Calendar integration service. Falls back to mock data (seeded
 * CalendarEvent rows) when no credentials are configured. Real integration can
 * be added by implementing fetchEventsFromGoogle using googleapis with the
 * user's stored OAuth tokens (see IntegrationAccount).
 */

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface CalendarSyncResult {
  synced: number;
  source: "google_calendar" | "mock";
}

export async function syncGoogleCalendar(_userId: string): Promise<CalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    return { synced: 0, source: "mock" };
  }
  // TODO: implement real sync using googleapis + stored OAuth tokens.
  return { synced: 0, source: "google_calendar" };
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
