import { requireUserId } from "@/lib/auth/session";
import { listContacts, getContact } from "@/services/contactService";
import { ContactBoard } from "./contact-board";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; q?: string }>;
}) {
  const userId = await requireUserId();
  const { id, q } = await searchParams;
  const contacts = await listContacts(userId, q);
  const selected = id ? await getContact(userId, id) : contacts[0] ? await getContact(userId, contacts[0].id) : null;

  const serializeContact = (c: NonNullable<typeof selected>) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    company: c.company,
    role: c.role,
    phone: c.phone,
    notes: c.notes,
    lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
    aiRelationshipSummary: c.aiRelationshipSummary,
    emails: c.emails.map((e) => ({ id: e.id, subject: e.subject, receivedAt: e.receivedAt.toISOString() })),
    events: c.events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt.toISOString() })),
    tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    followUps: c.followUps.map((f) => ({ id: f.id, subject: f.personName, status: f.status })),
  });

  return (
    <ContactBoard
      contacts={contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        role: c.role,
        lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
      }))}
      selected={selected ? serializeContact(selected) : null}
      query={q ?? ""}
    />
  );
}
