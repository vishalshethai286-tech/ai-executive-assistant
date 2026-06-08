"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, CheckCheck, Mail, ListChecks, Repeat, CalendarDays, Sparkles } from "lucide-react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
  task_due: ListChecks,
  follow_up_due: Repeat,
  meeting_prep: CalendarDays,
  important_email: Mail,
  daily_briefing: Sparkles,
};

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unread = notifications.filter((n) => !n.isRead);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      toast.success("All notifications marked as read");
      router.refresh();
    });
  }

  function renderList(items: NotificationItem[]) {
    if (items.length === 0) {
      return <EmptyState icon={Bell} title="Nothing here" description="You're all caught up." />;
    }
    return (
      <div className="space-y-2">
        {items.map((n) => {
          const Icon = typeIcons[n.type] ?? Bell;
          const content = (
            <Card key={n.id} className={n.isRead ? "opacity-70" : "border-primary/40"}>
              <CardContent className="flex items-start justify-between gap-3 pt-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!n.isRead && <Badge variant="secondary">New</Badge>}
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)} disabled={pending}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          return n.link ? (
            <Link key={n.id} href={n.link} className="block" onClick={() => !n.isRead && handleMarkRead(n.id)}>
              {content}
            </Link>
          ) : (
            content
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Reminders, AI alerts, and updates from across your assistant.</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={pending || unread.length === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-4">{renderList(notifications)}</TabsContent>
        <TabsContent value="unread" className="pt-4">{renderList(unread)}</TabsContent>
      </Tabs>
    </div>
  );
}
