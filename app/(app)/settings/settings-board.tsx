"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plug, Sparkles, ShieldCheck, CreditCard, Bell, Lock } from "lucide-react";
import { updateProfileAction } from "./actions";
import { ProfileInput } from "@/lib/validators";
import { toast } from "sonner";

const tones = ["Professional", "Friendly", "Short", "Firm", "Detailed"] as const;

export interface ProfileData {
  name: string;
  email: string;
  timezone: string;
  aiTone: ProfileInput["aiTone"];
  aiProvider: ProfileInput["aiProvider"];
}

export interface ProviderData {
  value: ProfileInput["aiProvider"];
  label: string;
  configured: boolean;
}

export function SettingsBoard({
  profile,
  providers,
}: {
  profile: ProfileData;
  providers: ProviderData[];
}) {
  const [values, setValues] = useState(profile);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateProfileAction({
          name: values.name,
          timezone: values.timezone,
          aiTone: values.aiTone,
          aiProvider: values.aiProvider,
        });
        toast.success("Settings saved");
        router.refresh();
      } catch {
        toast.error("Couldn't save your settings");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, connected accounts, AI preferences, and privacy.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your basic information and working hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={values.email} disabled />
              </div>
            </div>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={values.timezone} onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))} placeholder="e.g. America/New_York" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> Connected accounts</CardTitle>
            <CardDescription>Sync your inbox, calendar, messaging, and productivity tools for richer AI context.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage Gmail, Calendar, Slack, WhatsApp, and other integrations from the{" "}
              <a className="text-primary underline" href="/connections">Connections</a> page. Without a connection,
              the assistant uses realistic sample data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI preferences</CardTitle>
            <CardDescription>Choose your default tone and provider. Mock mode always works without an API key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Default reply tone</Label>
                <Select value={values.aiTone} onValueChange={(val) => setValues((v) => ({ ...v, aiTone: val as ProfileInput["aiTone"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>AI provider</Label>
                <Select value={values.aiProvider} onValueChange={(val) => setValues((v) => ({ ...v, aiProvider: val as ProfileInput["aiProvider"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.value} value={p.value} disabled={!p.configured}>
                        {p.label}{!p.configured && " (no API key set)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If a provider isn&apos;t configured with an API key, the assistant automatically falls back to deterministic mock responses.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>Save settings</Button>
        </div>
      </form>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
            <CardDescription>In-app alerts for due tasks, follow-ups, and daily briefings are on by default.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Email and push notification channels can be connected once an email/SMS provider is configured.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Privacy</CardTitle>
            <CardDescription>Control what the assistant remembers and shares with AI providers.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manage what your assistant remembers in <a className="text-primary underline" href="/memory">AI Memory</a>. Items marked sensitive are never sent to AI providers.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</CardTitle>
            <CardDescription>Your account is protected by credential or Google sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Passwords are hashed with bcrypt and never stored in plaintext.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Billing</CardTitle>
            <CardDescription>This is a self-hosted personal assistant — no billing is required.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <Badge variant="outline">Free / self-hosted</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
