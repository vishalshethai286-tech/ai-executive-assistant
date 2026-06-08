"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Sparkles, Terminal, Plug, Database, AlertTriangle, ShieldCheck } from "lucide-react";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  aiProvider: string;
  createdAt: string;
}

export interface AdminAILog {
  id: string;
  function: string;
  provider: string;
  outputSummary: string;
  confidence: number | null;
  durationMs: number | null;
  success: boolean;
  error: string | null;
  createdAt: string;
}

export interface AdminCommandLog {
  id: string;
  rawCommand: string;
  parsedIntent: string | null;
  resultSummary: string | null;
  success: boolean;
  createdAt: string;
}

export interface AdminIntegration {
  provider: string;
  status: string;
  lastSyncedAt: string | null;
}

export interface AdminError {
  id: string;
  source: string;
  message: string;
  createdAt: string;
}

export function AdminBoard({
  users,
  userCount,
  aiLogs,
  commandLogs,
  integrations,
  dbHealthy,
  recentErrors,
}: {
  users: AdminUser[];
  userCount: number;
  aiLogs: AdminAILog[];
  commandLogs: AdminCommandLog[];
  integrations: AdminIntegration[];
  dbHealthy: boolean;
  recentErrors: AdminError[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin &amp; Debug</h1>
        <p className="text-sm text-muted-foreground">System status, AI activity, and diagnostics for this workspace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary"><Database className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-medium">Database</p>
              <Badge variant={dbHealthy ? "default" : "destructive"}>{dbHealthy ? "Connected" : "Unreachable"}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-medium">Users</p>
              <p className="text-2xl font-semibold">{userCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-sm font-medium">Recent AI errors</p>
              <p className="text-2xl font-semibold">{recentErrors.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-3.5 w-3.5" /> AI logs</TabsTrigger>
          <TabsTrigger value="jobs"><Terminal className="h-3.5 w-3.5" /> Job logs</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="errors"><AlertTriangle className="h-3.5 w-3.5" /> Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace users</CardTitle>
              <CardDescription>Everyone with access to this assistant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{u.name ?? "Unnamed user"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{u.aiProvider}</Badge>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1">
                      {u.role === "admin" && <ShieldCheck className="h-3 w-3" />} {u.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI activity log</CardTitle>
              <CardDescription>Every AI function call, provider used, and a redacted output summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {aiLogs.length === 0 ? (
                <EmptyState icon={Sparkles} title="No AI activity yet" />
              ) : (
                aiLogs.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{l.function}</Badge>
                        <Badge variant="secondary">{l.provider}</Badge>
                        {!l.success && <Badge variant="destructive">failed</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString()}
                        {l.durationMs != null && ` · ${l.durationMs}ms`}
                        {l.confidence != null && ` · ${Math.round(l.confidence * 100)}% confidence`}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{l.outputSummary}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Command &amp; job logs</CardTitle>
              <CardDescription>Recent commands run through the AI Command Center.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {commandLogs.length === 0 ? (
                <EmptyState icon={Terminal} title="No commands run yet" />
              ) : (
                commandLogs.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{c.rawCommand}</p>
                      <Badge variant={c.success ? "secondary" : "destructive"}>{c.success ? "ok" : "failed"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.parsedIntent && `Intent: ${c.parsedIntent} · `}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                    {c.resultSummary && <p className="mt-1 text-muted-foreground">{c.resultSummary}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration status</CardTitle>
              <CardDescription>Connected external accounts and last sync time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {integrations.length === 0 ? (
                <EmptyState icon={Plug} title="No integrations connected" description="The assistant is running on mock data." />
              ) : (
                integrations.map((i) => (
                  <div key={i.provider} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{i.provider}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={i.status === "connected" ? "default" : "secondary"}>{i.status}</Badge>
                      {i.lastSyncedAt && <span className="text-xs text-muted-foreground">Last sync {new Date(i.lastSyncedAt).toLocaleString()}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent errors</CardTitle>
              <CardDescription>Failures captured from AI function calls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentErrors.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No recent errors" description="Everything is running smoothly." />
              ) : (
                recentErrors.map((e) => (
                  <div key={e.id} className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="destructive">{e.source}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{e.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
