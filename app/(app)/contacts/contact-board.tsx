"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Search, Sparkles, Plus, Mail, CalendarDays, CheckSquare, Repeat } from "lucide-react";
import { ContactDialog } from "./contact-dialog";
import { createContactAction, updateContactAction, deleteContactAction, summarizeRelationshipAction } from "./actions";
import { ContactInput } from "@/lib/validators";
import { toast } from "sonner";

export interface ContactListItem {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  lastInteraction: string | null;
}

export interface ContactDetail extends ContactListItem {
  phone: string | null;
  notes: string | null;
  aiRelationshipSummary: string | null;
  emails: { id: string; subject: string; receivedAt: string }[];
  events: { id: string; title: string; startsAt: string }[];
  tasks: { id: string; title: string; status: string }[];
  followUps: { id: string; subject: string; status: string }[];
}

export function ContactBoard({
  contacts,
  selected,
  query,
}: {
  contacts: ContactListItem[];
  selected: ContactDetail | null;
  query: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactDetail | null>(null);
  const [search, setSearch] = useState(query);
  const [summary, setSummary] = useState<string | null>(selected?.aiRelationshipSummary ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    router.push(`/contacts?${params.toString()}`);
  }

  function selectContact(id: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("id", id);
    setSummary(null);
    router.push(`/contacts?${params.toString()}`);
  }

  function handleCreate(values: ContactInput) {
    startTransition(async () => {
      try {
        const created = await createContactAction(values);
        toast.success("Contact added");
        setDialogOpen(false);
        setEditing(null);
        router.push(`/contacts?id=${created.id}`);
      } catch {
        toast.error("Couldn't save the contact");
      }
    });
  }

  function handleUpdate(values: ContactInput) {
    if (!editing) return;
    startTransition(async () => {
      try {
        await updateContactAction(editing.id, values);
        toast.success("Contact updated");
        setDialogOpen(false);
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("Couldn't update the contact");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContactAction(id);
      toast.success("Contact removed");
      router.push("/contacts");
    });
  }

  function handleSummarize(id: string) {
    startTransition(async () => {
      try {
        const output = await summarizeRelationshipAction(id);
        setSummary(output);
      } catch {
        toast.error("Couldn't generate a relationship summary");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts &amp; CRM</h1>
          <p className="text-sm text-muted-foreground">Relationships, history, and AI-generated context for the people who matter.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> New contact
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col gap-3 pt-5">
            <form onSubmit={applySearch} className="flex gap-2">
              <Input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
            </form>
            {contacts.length === 0 ? (
              <EmptyState icon={Users} title="No contacts yet" description="Add the people you work with most." />
            ) : (
              <ul className="flex-1 space-y-1 overflow-y-auto">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => selectContact(c.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        selected?.id === c.id ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{[c.role, c.company].filter(Boolean).join(" · ") || c.email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {!selected ? (
          <Card>
            <CardContent className="pt-5">
              <EmptyState icon={Users} title="Select a contact" description="Choose someone from the list to view their details." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{[selected.role, selected.company].filter(Boolean).join(" at ")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.email && <span>{selected.email}</span>}
                      {selected.phone && <span> · {selected.phone}</span>}
                    </p>
                    {selected.lastInteraction && (
                      <p className="mt-1 text-xs text-muted-foreground">Last interaction {new Date(selected.lastInteraction).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(selected); setDialogOpen(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(selected.id)} disabled={pending}>Remove</Button>
                  </div>
                </div>
                {selected.notes && (
                  <div className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">{selected.notes}</div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" onClick={() => handleSummarize(selected.id)} disabled={pending}>
                    <Sparkles className="h-3.5 w-3.5" /> AI relationship summary
                  </Button>
                </div>
                {summary && (
                  <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{summary}</div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <p className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4" /> Recent emails</p>
                  {selected.emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No related emails.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selected.emails.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{e.subject}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.receivedAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <p className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4" /> Meetings</p>
                  {selected.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No related meetings.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selected.events.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{e.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.startsAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <p className="flex items-center gap-2 text-sm font-medium"><CheckSquare className="h-4 w-4" /> Open tasks</p>
                  {selected.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No related tasks.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selected.tasks.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{t.title}</span>
                          <Badge variant="secondary">{t.status.replaceAll("_", " ").toLowerCase()}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <p className="flex items-center gap-2 text-sm font-medium"><Repeat className="h-4 w-4" /> Follow-ups</p>
                  {selected.followUps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No related follow-ups.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selected.followUps.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{f.subject}</span>
                          <Badge variant="secondary">{f.status.replaceAll("_", " ").toLowerCase()}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
        onSubmit={editing ? handleUpdate : handleCreate}
        pending={pending}
        initial={editing}
      />
    </div>
  );
}
