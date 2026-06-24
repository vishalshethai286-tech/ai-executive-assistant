"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Mail,
  Search,
  Sparkles,
  Star,
  CheckSquare,
  Repeat,
  Send,
} from "lucide-react";
import {
  summarizeEmailAction,
  draftReplyAction,
  markPriorityAction,
  markReadAction,
  convertToTaskAction,
  convertToFollowUpAction,
} from "./actions";
import { toast } from "sonner";

export interface EmailItem {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  isUnread: boolean;
  isImportant: boolean;
  isPriority: boolean;
  label: string | null;
  aiSummary: string | null;
  contactName: string | null;
}

const filters = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "important", label: "Important" },
  { value: "waiting_reply", label: "Waiting reply" },
  { value: "follow_up_needed", label: "Follow-up needed" },
];

const tones = ["Professional", "Friendly", "Short", "Firm", "Detailed"] as const;

const quickReplies = [
  { label: "Acknowledge", instruction: "Acknowledge receipt and say I'll review shortly", tone: "Professional" as const },
  { label: "Accept", instruction: "Accept the request and confirm next steps", tone: "Friendly" as const },
  { label: "Decline politely", instruction: "Politely decline, suggest an alternative", tone: "Professional" as const },
  { label: "Request more info", instruction: "Ask for more details before I can proceed", tone: "Professional" as const },
  { label: "Schedule a call", instruction: "Suggest scheduling a call to discuss further", tone: "Friendly" as const },
  { label: "Delegate", instruction: "Say I'll forward this to the right person on my team", tone: "Professional" as const },
];

export function EmailInbox({ emails, activeFilter, query }: { emails: EmailItem[]; activeFilter: string; query: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(emails[0]?.id ?? null);
  const [search, setSearch] = useState(query);
  const [tone, setTone] = useState<(typeof tones)[number]>("Professional");
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selected = emails.find((e) => e.id === selectedId) ?? null;

  function applyFilter(filter: string) {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("q", search);
    router.push(`/emails?${params.toString()}`);
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("filter", activeFilter);
    if (search) params.set("q", search);
    router.push(`/emails?${params.toString()}`);
  }

  function selectEmail(email: EmailItem) {
    setSelectedId(email.id);
    setDraft(null);
    setInstructions("");
    if (email.isUnread) {
      startTransition(async () => {
        await markReadAction(email.id, false);
        router.refresh();
      });
    }
  }

  function handleSummarize() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await summarizeEmailAction(selected.id);
        router.refresh();
      } catch {
        toast.error("Couldn't summarize this email");
      }
    });
  }

  function handleDraftReply(overrideTone?: string, overrideInstructions?: string) {
    if (!selected) return;
    const useTone = (overrideTone ?? tone) as (typeof tones)[number];
    const useInstructions = overrideInstructions ?? instructions;
    startTransition(async () => {
      try {
        const res = await draftReplyAction(selected.id, useTone, useInstructions || undefined);
        setDraft(res.draft);
      } catch {
        toast.error("Couldn't draft a reply");
      }
    });
  }

  function handleMarkPriority() {
    if (!selected) return;
    startTransition(async () => {
      await markPriorityAction(selected.id, !selected.isPriority);
      router.refresh();
    });
  }

  function handleConvertToTask() {
    if (!selected) return;
    startTransition(async () => {
      await convertToTaskAction(selected.id);
      toast.success("Created a task from this email");
      router.refresh();
    });
  }

  function handleConvertToFollowUp() {
    if (!selected) return;
    startTransition(async () => {
      await convertToFollowUpAction(selected.id);
      toast.success("Created a follow-up from this email");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Assistant</h1>
        <p className="text-sm text-muted-foreground">Stay on top of your inbox with AI summaries and draft replies.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => applyFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
        <form onSubmit={applySearch} className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search emails…" className="pl-9" />
        </form>
      </div>

      {emails.length === 0 ? (
        <EmptyState icon={Mail} title="No emails match this view" description="Try a different filter or search term." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedId === email.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${email.isUnread ? "font-semibold" : "font-medium"}`}>{email.fromName}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(email.receivedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="truncate text-sm">{email.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{email.snippet}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {email.isUnread && <Badge variant="info">Unread</Badge>}
                    {email.isImportant && <Badge variant="warning">Important</Badge>}
                    {email.isPriority && <Badge variant="default">Priority</Badge>}
                    {email.label && <Badge variant="secondary">{email.label.replace(/_/g, " ")}</Badge>}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            {selected ? (
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.subject}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selected.fromName} &lt;{selected.fromEmail}&gt; · {new Date(selected.receivedAt).toLocaleString()}
                      {selected.contactName && ` · ${selected.contactName}`}
                    </p>
                  </div>
                  <Button variant={selected.isPriority ? "default" : "outline"} size="sm" onClick={handleMarkPriority} disabled={pending}>
                    <Star className="h-3.5 w-3.5" /> {selected.isPriority ? "Priority" : "Mark priority"}
                  </Button>
                </div>

                <div className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm leading-relaxed">{selected.body}</div>

                {selected.aiSummary && (
                  <div className="space-y-1 rounded-lg bg-muted/60 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> AI summary
                    </p>
                    <p className="text-sm leading-relaxed">{selected.aiSummary}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleSummarize} disabled={pending}>
                    <Sparkles className="h-3.5 w-3.5" /> AI summary
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleConvertToTask} disabled={pending}>
                    <CheckSquare className="h-3.5 w-3.5" /> Convert to task
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleConvertToFollowUp} disabled={pending}>
                    <Repeat className="h-3.5 w-3.5" /> Convert to follow-up
                  </Button>
                </div>

                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Send className="h-4 w-4" /> Draft a reply
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReplies.map((qr) => (
                      <Button
                        key={qr.label}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        disabled={pending}
                        onClick={() => handleDraftReply(qr.tone, qr.instruction)}
                      >
                        {qr.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tone</span>
                    <Select value={tone} onValueChange={(v) => setTone(v as never)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {tones.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Optional instructions, e.g. 'say I'll review tomorrow'"
                  />
                  <Button size="sm" onClick={() => handleDraftReply()} disabled={pending}>
                    <Sparkles className="h-3.5 w-3.5" /> Draft reply
                  </Button>
                  {draft && (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-md border border-input bg-card p-3 text-sm leading-relaxed"
                        rows={6}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This draft is fully editable. The assistant never sends emails automatically — review, edit, then send from your email client.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            ) : (
              <CardContent className="pt-5">
                <EmptyState icon={Mail} title="Select an email to view details" />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
