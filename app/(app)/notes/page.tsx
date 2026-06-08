import { requireUserId } from "@/lib/auth/session";
import { listNotes, listMeetingNotes } from "@/services/noteService";
import { listContacts } from "@/services/contactService";
import { NotesBoard } from "./notes-board";

export default async function NotesPage() {
  const userId = await requireUserId();
  const [notes, meetingNotes, contacts] = await Promise.all([
    listNotes(userId),
    listMeetingNotes(userId),
    listContacts(userId),
  ]);

  return (
    <NotesBoard
      notes={notes.map((n: (typeof notes)[number]) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        aiSummary: n.aiSummary,
        actionItems: n.actionItems,
        contactName: n.contact?.name ?? null,
        createdAt: n.createdAt.toISOString(),
      }))}
      meetingNotes={meetingNotes.map((m: (typeof meetingNotes)[number]) => ({
        id: m.id,
        title: m.title,
        attendees: m.attendees,
        discussionSummary: m.discussionSummary,
        decisions: m.decisions,
        actionItems: m.actionItems,
        followUps: m.followUps,
        aiSummary: m.aiSummary,
        eventTitle: m.event?.title ?? null,
        contactName: m.contact?.name ?? null,
        createdAt: m.createdAt.toISOString(),
      }))}
      contacts={contacts.map((c: (typeof contacts)[number]) => ({ id: c.id, name: c.name }))}
    />
  );
}
