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
import { Mail, Calendar, MessageSquare, Sparkles, Plug, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { connectIntegrationAction, disconnectIntegrationAction } from "./actions";

export interface ConnectionItem {
  provider: string;
  label: string;
  category: "Email" | "Calendar" | "Messaging" | "Productivity" | "AI";
  description: string;
  authType: "oauth" | "token";
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
  configured: boolean;
  status: string;
  lastSyncedAt: string | null;
}

const categoryIcons: Record<ConnectionItem["category"], typeof Mail> = {
  Email: Mail,
  Calendar: Calendar,
  Messaging: MessageSquare,
  Productivity: Sparkles,
  AI: Sparkles,
};

const categories: ConnectionItem["category"][] = ["Email", "Calendar", "Messaging", "Productivity"];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-sm text-muted-foreground">
            Link email, calendar, messaging, and productivity tools so your assistant has real context.
            Anything not connected here uses realistic sample data instead.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> {connectedCount} connected
        </Badge>
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
                <ConnectionCard key={item.provider} item={item} pending={pending} onDisconnect={handleDisconnect} />
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
}: {
  item: ConnectionItem;
  pending: boolean;
  onDisconnect: (provider: string) => void;
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
      </CardContent>
    </Card>
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
