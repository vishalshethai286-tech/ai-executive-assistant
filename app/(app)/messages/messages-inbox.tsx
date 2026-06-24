"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  MessageSquare,
  Send,
  Sparkles,
  Hash,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  getConversationsAction,
  getThreadAction,
  sendReplyAction,
  draftReplyAction,
} from "./actions";

interface Conversation {
  senderId: string;
  senderName: string;
  channel: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface ThreadMessage {
  id: string;
  direction: string;
  senderName: string;
  body: string;
  createdAt: string;
}

const channelColors: Record<string, string> = {
  whatsapp: "bg-green-500",
  telegram: "bg-blue-500",
  slack: "bg-purple-500",
  sms: "bg-orange-500",
};

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  slack: "Slack",
  sms: "SMS",
};

export function MessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [tone, setTone] = useState<string>("Professional");
  const [composeOpen, setComposeOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    getConversationsAction().then(setConversations).catch(() => {});
  }, []);

  function selectConversation(conv: Conversation) {
    setSelectedConv(conv);
    setReply("");
    startTransition(async () => {
      const msgs = await getThreadAction(conv.channel, conv.senderId);
      setThread(msgs);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
    });
  }

  function handleSend() {
    if (!selectedConv || !reply.trim()) return;
    const msg = reply;
    setReply("");
    startTransition(async () => {
      try {
        await sendReplyAction(selectedConv.channel, selectedConv.senderId, msg);
        const msgs = await getThreadAction(selectedConv.channel, selectedConv.senderId);
        setThread(msgs);
        toast.success("Sent");
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
        setReply(msg);
      }
    });
  }

  function handleAIDraft(overrideTone?: string, overrideContext?: string) {
    if (!selectedConv || thread.length === 0) return;
    startTransition(async () => {
      try {
        const lastMsgs = overrideContext ?? thread
          .slice(-5)
          .map((m) => `${m.senderName}: ${m.body}`)
          .join("\n");
        const result = await draftReplyAction(
          selectedConv.channel,
          selectedConv.senderName,
          lastMsgs,
          (overrideTone ?? tone) as any,
        );
        setReply(result.draft);
        setComposeOpen(true);
      } catch {
        toast.error("Couldn't generate a draft");
      }
    });
  }

  const filtered = filter === "all"
    ? conversations
    : conversations.filter((c) => c.channel === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          All your WhatsApp, Telegram, Slack, and SMS conversations in one place.
        </p>
      </div>

      {/* Channel filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "whatsapp", "telegram", "slack", "sms"].map((ch) => (
          <button
            key={ch}
            onClick={() => setFilter(ch)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === ch
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {ch === "all" ? "All" : channelLabels[ch] ?? ch}
            {ch !== "all" && (
              <span className="ml-1 text-muted-foreground">
                ({conversations.filter((c) => c.channel === ch).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Connect WhatsApp, Telegram, or Slack in Connections, then set up webhooks to receive messages here."
          action={
            <Button size="sm" asChild>
              <a href="/connections">Go to Connections</a>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Conversation list */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
              {filtered.map((conv) => (
                <button
                  key={`${conv.channel}:${conv.senderId}`}
                  onClick={() => selectConversation(conv)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedConv?.senderId === conv.senderId && selectedConv?.channel === conv.channel
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${channelColors[conv.channel] ?? "bg-gray-400"}`} />
                      <p className="truncate text-sm font-medium">{conv.senderName}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(conv.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {channelLabels[conv.channel] ?? conv.channel}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Thread view */}
          <Card className="lg:col-span-3">
            {selectedConv ? (
              <CardContent className="flex h-[70vh] flex-col p-0">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <span className={`h-3 w-3 rounded-full ${channelColors[selectedConv.channel] ?? "bg-gray-400"}`} />
                  <div>
                    <p className="text-sm font-semibold">{selectedConv.senderName}</p>
                    <p className="text-xs text-muted-foreground">
                      {channelLabels[selectedConv.channel]} · {selectedConv.senderId}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                  {thread.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smart Compose Reply Bar */}
                <div className="border-t border-border">
                  {/* Quick replies + expand toggle */}
                  <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2">
                    <button
                      onClick={() => setComposeOpen(!composeOpen)}
                      className="shrink-0 rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                    >
                      {composeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>
                    {quickReplies.map((qr) => (
                      <button
                        key={qr.label}
                        disabled={pending}
                        onClick={() => handleAIDraft(qr.tone, `${thread.slice(-3).map((m) => `${m.senderName}: ${m.body}`).join("\n")}\n\nInstruction: ${qr.instruction}`)}
                        className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>

                  {/* Expanded compose area */}
                  {composeOpen && (
                    <div className="space-y-2 border-t border-border px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Tone</span>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tones.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAIDraft()} disabled={pending}>
                          <Sparkles className="h-3 w-3" /> AI Draft
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message input */}
                  <div className="flex gap-2 px-4 py-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a message…"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <Button size="sm" onClick={handleSend} disabled={pending || !reply.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex h-[70vh] items-center justify-center">
                <EmptyState icon={Hash} title="Select a conversation" />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

const tones = ["Professional", "Friendly", "Short", "Firm", "Detailed"] as const;

const quickReplies = [
  { label: "👍 Acknowledge", instruction: "Acknowledge their message briefly and say you'll follow up", tone: "Professional" },
  { label: "✅ Confirm", instruction: "Confirm and agree with what they said", tone: "Friendly" },
  { label: "📅 Schedule", instruction: "Suggest scheduling a time to discuss", tone: "Friendly" },
  { label: "⏳ Buy time", instruction: "Say you need a bit more time and will get back to them", tone: "Professional" },
  { label: "❓ Ask more", instruction: "Ask for more details or clarification", tone: "Professional" },
  { label: "🙏 Thank", instruction: "Thank them warmly", tone: "Friendly" },
  { label: "🔄 Follow up", instruction: "Follow up on the previous topic and ask for an update", tone: "Professional" },
  { label: "👋 Close", instruction: "Wrap up the conversation politely", tone: "Short" },
];
