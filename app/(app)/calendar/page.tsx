import { requireUserId } from "@/lib/auth/session";
import { listEvents, getTodaysSchedule } from "@/services/calendarService";
import { listContacts } from "@/services/contactService";
import { CalendarBoard } from "./calendar-board";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  const [events, today, contacts] = await Promise.all([
    listEvents(userId, start, end),
    getTodaysSchedule(userId),
    listContacts(userId),
  ]);

  const serialize = (items: typeof events) =>
    items.map((e: (typeof items)[number]) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      attendees: e.attendees,
      organizer: e.organizer,
      contactId: e.contactId,
      contactName: e.contact?.name ?? null,
    }));

  return (
    <CalendarBoard
      events={serialize(events)}
      today={serialize(today)}
      contacts={contacts.map((c: (typeof contacts)[number]) => ({ id: c.id, name: c.name }))}
    />
  );
}
