"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Sparkles, Plus, Wand2, MessageSquareWarning } from "lucide-react";
import { EventDialog, EventFormValues } from "./event-dialog";
import { createEventAction, deleteEventAction, prepareForMeetingAction, draftRescheduleAction, suggestTimesAction } from "./actions";
import { toast } from "sonner";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  attendees: string[];
  organizer: string | null;
  contactId: string | null;
  contactName: string | null;
}

export function CalendarBoard({
  events,
  today,
  contacts,
}: {
  events: EventItem[];
  today: EventItem[];
  contacts: { id: string; name: string }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [prep, setPrep] = useState<{ id: string; output: string } | null>(null);
  const [reschedule, setReschedule] = useState<{ id: string; draft: string } | null>(null);
  const [suggestions, setSuggestions] = useState<{ start: string; end: string }[] | null>(null);
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      const key = new Date(e.startsAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  function handleCreate(values: EventFormValues) {
    startTransition(async () => {
      try {
        const { conflicts } = await createEventAction(values);
        if (conflicts.length) {
          toast.warning("Possible conflict detected", { description: conflicts.map((c) => c.title).join(", ") });
        } else {
          toast.success("Event created");
        }
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't create the event");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEventAction(id);
      toast.success("Event removed");
      router.refresh();
    });
  }

  function handlePrepare(id: string) {
    startTransition(async () => {
      try {
        const res = await prepareForMeetingAction(id);
        setPrep({ id, output: res.output });
      } catch {
        toast.error("Couldn't prepare meeting notes");
      }
    });
  }

  function handleReschedule(id: string) {
    startTransition(async () => {
      try {
        const draft = await draftRescheduleAction(id);
        setReschedule({ id, draft });
      } catch {
        toast.error("Couldn't draft a reschedule request");
      }
    });
  }

  function handleSuggestTimes() {
    startTransition(async () => {
      const result = await suggestTimesAction(30);
      setSuggestions(result.map((s) => ({ start: s.start.toString(), end: s.end.toString() })));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendar Assistant</h1>
          <p className="text-sm text-muted-foreground">Your schedule, conflict checks, and AI meeting prep in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSuggestTimes} disabled={pending}>
            <Wand2 className="h-4 w-4" /> Suggest meeting times
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {suggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Suggested times</CardTitle>
            <CardDescription>Open 30-minute slots based on your upcoming calendar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open slots found in business hours.</p>
            ) : (
              suggestions.map((s, i) => (
                <Badge key={i} variant="outline">
                  {new Date(s.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {today.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No meetings today" />
          ) : (
            <ul className="space-y-2">
              {today.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {new Date(e.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {e.location && ` · ${e.location}`}
                    </p>
                  </div>
                  <Badge variant="secondary">{e.attendees.length} attendee{e.attendees.length === 1 ? "" : "s"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming (next 14 days)</h2>
        {grouped.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing scheduled" action={<Button size="sm" onClick={() => setDialogOpen(true)}>Create an event</Button>} />
        ) : (
          grouped.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {new Date(day).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <div className="space-y-2">
                {items.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{e.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {new Date(e.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            {e.location && ` · ${e.location}`}
                          </p>
                          {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
                          {e.attendees.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">Attendees: {e.attendees.join(", ")}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} disabled={pending}>
                          Remove
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                        <Button variant="outline" size="sm" onClick={() => handlePrepare(e.id)} disabled={pending}>
                          <Sparkles className="h-3.5 w-3.5" /> AI meeting prep
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReschedule(e.id)} disabled={pending}>
                          <MessageSquareWarning className="h-3.5 w-3.5" /> Draft reschedule request
                        </Button>
                      </div>
                      {prep?.id === e.id && (
                        <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{prep.output}</div>
                      )}
                      {reschedule?.id === e.id && (
                        <div className="space-y-2">
                          <textarea
                            className="w-full rounded-md border border-input bg-card p-3 text-sm leading-relaxed"
                            rows={5}
                            value={reschedule.draft}
                            onChange={(ev) => setReschedule({ id: e.id, draft: ev.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Editable draft — nothing is sent automatically.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} pending={pending} contacts={contacts} />
    </div>
  );
}
