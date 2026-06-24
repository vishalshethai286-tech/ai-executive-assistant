"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Calendar, MessageSquare, Sparkles, Plug, CheckCircle2, HelpCircle, CreditCard, BookOpen, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { connectIntegrationAction, disconnectIntegrationAction, syncIntegrationAction, syncAllAction } from "./actions";

export interface ConnectionItem {
  provider: string;
  label: string;
  category: "Email" | "Calendar" | "Messaging" | "Productivity" | "Finance" | "Knowledge" | "AI";
  description: string;
  authType: "oauth" | "token";
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
  configured: boolean;
  status: string;
  lastSyncedAt: string | null;
  helpSteps: string[];
  helpUrl?: string;
}

const categoryIcons: Record<ConnectionItem["category"], typeof Mail> = {
  Email: Mail,
  Calendar: Calendar,
  Messaging: MessageSquare,
  Productivity: Sparkles,
  Finance: CreditCard,
  Knowledge: BookOpen,
  AI: Sparkles,
};

const categories: ConnectionItem["category"][] = ["Email", "Calendar", "Messaging", "Productivity", "Finance", "Knowledge"];

export function ConnectionsBoard({ items }: { items: ConnectionItem[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, ConnectionItem[]>();
    for (const cat of categories) map.set(cat, []);
    for (const item of items) map.get(item.category)?.push(item);
    return map;
  }, [items]);

  const connectedCount = items.filter((i) => i.status === "connected").length;

  function handleDisconnect(provider: string) {
    startTransition(async () => {
      await disconnectIntegrationAction(provider);
      toast.success("Disconnected");
      router.refresh();
    });
  }

  function handleSync(provider: string, label: string) {
    startTransition(async () => {
      try {
        const result = await syncIntegrationAction(provider);
        if (result.errors?.length) {
          toast.error(`${label}: ${result.errors[0]}`);
        } else {
          toast.success(`${label}: synced ${result.synced} items`);
        }
        router.refresh();
      } catch {
        toast.error(`Couldn't sync ${label}`);
      }
    });
  }

  function handleSyncAll() {
    startTransition(async () => {
      try {
        const results = await syncAllAction();
        const total = results.reduce((sum, r) => sum + r.synced, 0);
        const errors = results.filter((r) => r.errors?.length);
        if (errors.length > 0) {
          toast.warning(`Synced ${total} items. ${errors.length} provider(s) had errors.`);
        } else {
          toast.success(`Synced ${total} items across ${results.length} providers`);
        }
        router.refresh();
      } catch {
        toast.error("Sync failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-sm text-muted-foreground">
            Link email, calendar, messaging, and productivity tools so your assistant has real context.
            Connected integrations sync real data from your accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connectedCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={pending}>
              <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> Sync All
            </Button>
          )}
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> {connectedCount} connected
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="Email">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(grouped.get(cat) ?? []).map((item) => (
                <ConnectionCard key={item.provider} item={item} pending={pending} onDisconnect={handleDisconnect} onSync={handleSync} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ConnectionCard({
  item,
  pending,
  onDisconnect,
  onSync,
}: {
  item: ConnectionItem;
  pending: boolean;
  onDisconnect: (provider: string) => void;
  onSync: (provider: string, label: string) => void;
}) {
  const Icon = categoryIcons[item.category] ?? Plug;
  const isConnected = item.status === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> {item.label}
          </span>
          <Badge variant={isConnected ? "default" : "secondary"}>{item.status}</Badge>
        </CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {isConnected
            ? item.lastSyncedAt
              ? `Connected • last synced ${new Date(item.lastSyncedAt).toLocaleString()}`
              : "Connected"
            : item.authType === "oauth"
              ? item.configured
                ? "Credentials detected — connect via Settings sign-in"
                : "Not configured — using mock data"
              : "Add your credentials to connect"}
        </p>
        <div className="flex items-center gap-2">
          <HelpDialog item={item} />
          {isConnected && (
            <Button type="button" variant="outline" size="sm" onClick={() => onSync(item.provider, item.label)} disabled={pending}>
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </Button>
          )}
          {isConnected ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onDisconnect(item.provider)} disabled={pending}>
              Disconnect
            </Button>
          ) : item.authType === "token" ? (
            <ConnectDialog item={item} />
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={!item.configured}>
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HelpDialog({ item }: { item: ConnectionItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`How to connect ${item.label}`}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to connect {item.label}</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {item.helpSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        {item.helpUrl && (
          <a
            href={item.helpUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-primary underline"
          >
            Open documentation <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConnectDialog({ item }: { item: ConnectionItem }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConnect() {
    startTransition(async () => {
      try {
        await connectIntegrationAction(item.provider, values);
        toast.success(`${item.label} connected`);
        setOpen(false);
        setValues({});
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't connect");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Connect</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {item.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {item.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Credentials are stored securely on your account and only used to sync data on your behalf.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleConnect} disabled={pending}>
            {pending ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
