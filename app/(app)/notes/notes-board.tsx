"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NotebookText, Users2, Plus, Sparkles, ListChecks, Trash2 } from "lucide-react";
import { NoteDialog } from "./note-dialog";
import { MeetingNoteDialog } from "./meeting-note-dialog";
import {
  createNoteAction,
  deleteNoteAction,
  extractActionItemsAction,
  createMeetingNoteAction,
  deleteMeetingNoteAction,
  summarizeMeetingNoteAction,
} from "./actions";
import { NoteInput, MeetingNoteInput } from "@/lib/validators";
import { toast } from "sonner";

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  aiSummary: string | null;
  actionItems: string[];
  contactName: string | null;
  createdAt: string;
}

export interface MeetingNoteItem {
  id: string;
  title: string;
  attendees: string[];
  discussionSummary: string | null;
  decisions: string[];
  actionItems: string[];
  followUps: string[];
  aiSummary: string | null;
  eventTitle: string | null;
  contactName: string | null;
  createdAt: string;
}

export function NotesBoard({
  notes,
  meetingNotes,
  contacts,
}: {
  notes: NoteItem[];
  meetingNotes: MeetingNoteItem[];
  contacts: { id: string; name: string }[];
}) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [actionItems, setActionItems] = useState<{ id: string; items: string[] } | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreateNote(values: NoteInput) {
    startTransition(async () => {
      try {
        await createNoteAction(values);
        toast.success("Note saved");
        setNoteDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save the note");
      }
    });
  }

  function handleDeleteNote(id: string) {
    startTransition(async () => {
      await deleteNoteAction(id);
      toast.success("Note removed");
      router.refresh();
    });
  }

  function handleExtractActionItems(id: string) {
    startTransition(async () => {
      try {
        const items = await extractActionItemsAction(id);
        setActionItems({ id, items });
      } catch {
        toast.error("Couldn't extract action items");
      }
    });
  }

  function handleCreateMeetingNote(values: MeetingNoteInput) {
    startTransition(async () => {
      try {
        await createMeetingNoteAction(values);
        toast.success("Meeting note saved");
        setMeetingDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save the meeting note");
      }
    });
  }

  function handleDeleteMeetingNote(id: string) {
    startTransition(async () => {
      await deleteMeetingNoteAction(id);
      toast.success("Meeting note removed");
      router.refresh();
    });
  }

  function handleSummarizeMeeting(id: string) {
    startTransition(async () => {
      try {
        const output = await summarizeMeetingNoteAction(id);
        setSummaries((s) => ({ ...s, [id]: output }));
      } catch {
        toast.error("Couldn't summarize this meeting");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notes &amp; Meeting Notes</h1>
          <p className="text-sm text-muted-foreground">Capture context, extract action items, and summarize meetings with AI.</p>
        </div>
      </div>

      <Tabs defaultValue="notes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="meetings">Meeting notes</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMeetingDialogOpen(true)}>
              <Users2 className="h-4 w-4" /> New meeting note
            </Button>
            <Button size="sm" onClick={() => setNoteDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New note
            </Button>
          </div>
        </div>

        <TabsContent value="notes" className="space-y-3 pt-4">
          {notes.length === 0 ? (
            <EmptyState icon={NotebookText} title="No notes yet" action={<Button size="sm" onClick={() => setNoteDialogOpen(true)}>Create a note</Button>} />
          ) : (
            notes.map((n) => (
              <Card key={n.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()}
                        {n.contactName && ` · ${n.contactName}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(n.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</p>
                  {n.actionItems.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {n.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" onClick={() => handleExtractActionItems(n.id)} disabled={pending}>
                      <Sparkles className="h-3.5 w-3.5" /> Extract action items
                    </Button>
                  </div>
                  {actionItems?.id === n.id && actionItems.items.length > 0 && (
                    <div className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                      <p className="mb-1 font-medium">AI-extracted action items</p>
                      <ul className="space-y-1">
                        {actionItems.items.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-3 pt-4">
          {meetingNotes.length === 0 ? (
            <EmptyState icon={Users2} title="No meeting notes yet" action={<Button size="sm" onClick={() => setMeetingDialogOpen(true)}>Create a meeting note</Button>} />
          ) : (
            meetingNotes.map((m) => (
              <Card key={m.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                        {m.contactName && ` · ${m.contactName}`}
                        {m.eventTitle && ` · ${m.eventTitle}`}
                      </p>
                      {m.attendees.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">Attendees: {m.attendees.join(", ")}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMeetingNote(m.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {m.discussionSummary && <p className="text-sm text-muted-foreground">{m.discussionSummary}</p>}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Decisions</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {m.decisions.length === 0 ? <li className="text-muted-foreground">None recorded</li> : m.decisions.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Action items</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {m.actionItems.length === 0 ? <li className="text-muted-foreground">None recorded</li> : m.actionItems.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Follow-ups</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {m.followUps.length === 0 ? <li className="text-muted-foreground">None recorded</li> : m.followUps.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" onClick={() => handleSummarizeMeeting(m.id)} disabled={pending}>
                      <Sparkles className="h-3.5 w-3.5" /> AI summary
                    </Button>
                  </div>
                  {(summaries[m.id] ?? m.aiSummary) && (
                    <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{summaries[m.id] ?? m.aiSummary}</div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <NoteDialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen} onSubmit={handleCreateNote} pending={pending} contacts={contacts} />
      <MeetingNoteDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} onSubmit={handleCreateMeetingNote} pending={pending} contacts={contacts} />
    </div>
  );
}
