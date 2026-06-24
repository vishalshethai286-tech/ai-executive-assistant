"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageSquare,
  Send,
  Sparkles,
  Hash,
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

  function handleAIDraft() {
    if (!selectedConv || thread.length === 0) return;
    startTransition(async () => {
      try {
        const lastMsgs = thread
          .slice(-5)
          .map((m) => `${m.senderName}: ${m.body}`)
          .join("\n");
        const result = await draftReplyAction(
          selectedConv.channel,
          selectedConv.senderName,
          lastMsgs,
        );
        setReply(result.draft);
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

                {/* Reply bar */}
                <div className="border-t border-border px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={pending}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
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
