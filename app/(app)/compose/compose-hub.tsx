"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { type Channel, getAvailableChannels, generateDraft, sendMessage } from "./actions";

const tones = ["Professional", "Friendly", "Short", "Firm", "Detailed"] as const;

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  telegram: Send,
  whatsapp: MessageSquare,
  sms: MessageSquare,
};

const recipientLabels: Record<Channel, string> = {
  email: "Email Address",
  slack: "Channel ID or User ID",
  telegram: "Chat ID",
  whatsapp: "Phone Number (with country code)",
  sms: "Phone Number (with country code)",
};

const recipientPlaceholders: Record<Channel, string> = {
  email: "john@example.com",
  slack: "C01234567 or U01234567",
  telegram: "123456789",
  whatsapp: "+15551234567",
  sms: "+15551234567",
};

interface ChannelInfo {
  channel: Channel;
  label: string;
  connected: boolean;
}

export function ComposeHub() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channel, setChannel] = useState<Channel>("email");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]>("Professional");
  const [draft, setDraft] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getAvailableChannels().then(setChannels).catch(() => {});
  }, []);

  const currentChannel = channels.find((c) => c.channel === channel);
  const isConnected = currentChannel?.connected ?? false;
  const ChannelIcon = channelIcons[channel];

  function handleGenerateDraft() {
    if (!context.trim()) {
      toast.error("Describe what you want to say");
      return;
    }
    startTransition(async () => {
      try {
        const result = await generateDraft(channel, recipient || "the recipient", context, tone);
        setDraft(result.draft);
        setSent(false);
      } catch {
        toast.error("Couldn't generate a draft");
      }
    });
  }

  function handleSend() {
    if (!draft || !recipient.trim()) {
      toast.error("Enter a recipient and generate a draft first");
      return;
    }
    startTransition(async () => {
      try {
        await sendMessage(channel, recipient, subject || context.slice(0, 80), draft);
        setSent(true);
        toast.success(`Message sent via ${currentChannel?.label ?? channel}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Compose</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered messaging across all your connected channels — email, Slack, Telegram, WhatsApp, and SMS.
        </p>
      </div>

      {/* Channel selector */}
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => {
          const Icon = channelIcons[ch.channel];
          return (
            <button
              key={ch.channel}
              onClick={() => {
                setChannel(ch.channel);
                setDraft(null);
                setSent(false);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                channel === ch.channel
                  ? "border-primary bg-primary/10 text-primary"
                  : ch.connected
                    ? "border-border bg-secondary text-secondary-foreground hover:bg-accent"
                    : "border-border bg-secondary text-muted-foreground opacity-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {ch.label}
              {ch.connected ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChannelIcon className="h-4 w-4" /> Compose via {currentChannel?.label ?? channel}
          </CardTitle>
          <CardDescription>
            {isConnected
              ? "Describe what you want to say and the AI will draft it in your chosen tone."
              : `Not connected — go to Connections to set up ${currentChannel?.label ?? channel}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{recipientLabels[channel]}</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={recipientPlaceholders[channel]}
              />
            </div>
            {channel === "email" && (
              <div className="space-y-1.5">
                <Label>Subject (optional)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Re: Project update"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>What do you want to say?</Label>
            <textarea
              className="w-full rounded-md border border-input bg-card p-3 text-sm leading-relaxed"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Follow up on the proposal we discussed last week, ask about timeline"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as never)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateDraft} disabled={pending}>
              <Sparkles className="h-3.5 w-3.5" /> Generate Draft
            </Button>
          </div>

          {draft && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Draft
                </p>
                {sent && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Sent
                  </Badge>
                )}
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-card p-3 text-sm leading-relaxed"
                rows={6}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSent(false);
                }}
              />
              <div className="flex items-center justify-between">
                {isConnected && !sent ? (
                  <Button onClick={handleSend} disabled={pending || !recipient.trim()}>
                    <Send className="h-3.5 w-3.5" /> Send via {currentChannel?.label}
                  </Button>
                ) : !isConnected ? (
                  <p className="text-xs text-muted-foreground">
                    Connect {currentChannel?.label} in{" "}
                    <a className="text-primary underline" href="/connections">
                      Connections
                    </a>{" "}
                    to send.
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">Edit the draft before sending.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick compose suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common messages you can compose instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setContext(action.context);
                  setTone(action.tone);
                }}
                className="rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <p className="font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const quickActions = [
  {
    label: "Follow-up on proposal",
    description: "Check in on a proposal or quote you sent",
    context: "Following up on the proposal I sent last week. Want to check if you've had a chance to review it and discuss next steps.",
    tone: "Professional" as const,
  },
  {
    label: "Schedule a meeting",
    description: "Propose a time to meet",
    context: "I'd like to schedule a meeting to discuss our project. Please let me know your availability this week.",
    tone: "Friendly" as const,
  },
  {
    label: "Thank you note",
    description: "Express gratitude after a meeting or help",
    context: "Thank you for taking the time to meet with me today. I appreciate the insights and look forward to next steps.",
    tone: "Friendly" as const,
  },
  {
    label: "Status update",
    description: "Send a progress update on a project",
    context: "Sharing a quick update on the project. We've completed the main milestones and are on track for the deadline.",
    tone: "Professional" as const,
  },
  {
    label: "Reschedule request",
    description: "Ask to move a meeting",
    context: "Something came up and I need to reschedule our meeting. Could we find another time that works for both of us?",
    tone: "Professional" as const,
  },
  {
    label: "Introduction",
    description: "Introduce yourself or connect two people",
    context: "I wanted to reach out and introduce myself. I think there could be a great opportunity for us to collaborate.",
    tone: "Friendly" as const,
  },
];
