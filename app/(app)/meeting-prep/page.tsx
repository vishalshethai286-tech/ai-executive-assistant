import { requireUserId } from "@/lib/auth/session";
import { listEvents } from "@/services/calendarService";
import { MeetingPrepBoard } from "./meeting-prep-board";

export default async function MeetingPrepPage() {
  const userId = await requireUserId();

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const events = await listEvents(userId, now, end);

  return (
    <MeetingPrepBoard
      meetings={events.map((e: (typeof events)[number]) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        attendees: e.attendees,
        organizer: e.organizer,
        contactName: e.contact?.name ?? null,
      }))}
    />
  );
}
