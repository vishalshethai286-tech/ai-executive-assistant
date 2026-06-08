import { requireUserId } from "@/lib/auth/session";
import { listFollowUps, getOverdueFollowUps, getFollowUpsDueToday } from "@/services/followUpService";
import { listContacts } from "@/services/contactService";
import { FollowUpBoard } from "./follow-up-board";

export default async function FollowUpsPage() {
  const userId = await requireUserId();
  const [all, overdue, dueToday, contacts] = await Promise.all([
    listFollowUps(userId),
    getOverdueFollowUps(userId),
    getFollowUpsDueToday(userId),
    listContacts(userId),
  ]);

  const serialize = (items: typeof all) =>
    items.map((f) => ({
      id: f.id,
      personName: f.personName,
      company: f.company,
      context: f.context,
      lastContact: f.lastContact?.toISOString() ?? null,
      dueDate: f.dueDate?.toISOString() ?? null,
      nextAction: f.nextAction,
      status: f.status,
      aiMessage: f.aiMessage,
      contactId: f.contactId,
      contactName: f.contact?.name ?? null,
    }));

  return (
    <FollowUpBoard
      all={serialize(all)}
      overdue={serialize(overdue)}
      dueToday={serialize(dueToday)}
      contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
