"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  RefreshCw,
  CalendarClock,
  Mail,
  ListChecks,
  Repeat,
  AlertTriangle,
  ArrowRight,
  Sun,
  Sunrise,
  Moon,
  Clock,
} from "lucide-react";
import { generateFullBriefing } from "./actions";
import { toast } from "sonner";

interface BriefingStats {
  meetings: number;
  urgentEmails: number;
  overdueTasks: number;
  todayTasks: number;
  followUpsDue: number;
  overdueFollowUps: number;
}

interface BriefingData {
  meetings: { title: string; startsAt: string }[];
  urgentEmails: { fromName: string; subject: string }[];
  overdueTasks: { title: string; priority: string }[];
  todayTasks: { title: string; priority: string; dueDate: string | null }[];
  followUpsDue: { personName: string; nextAction: string | null }[];
  overdueFollowUps: { personName: string; context: string }[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", Icon: Sunrise };
  if (hour < 17) return { text: "Good afternoon", Icon: Sun };
  return { text: "Good evening", Icon: Moon };
}

export function BriefingBoard({ data }: { data: BriefingData }) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [stats, setStats] = useState<BriefingStats | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generateFullBriefing();
        setBriefing(result.output);
        setConfidence(result.confidence);
        setStats(result.stats);
      } catch {
        toast.error("Couldn't generate the briefing");
      }
    });
  }

  const totalAlerts =
    data.overdueTasks.length + data.overdueFollowUps.length + data.urgentEmails.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <GreetingIcon className="h-6 w-6 text-primary" /> {greeting.text}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={pending}>
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          {briefing ? "Regenerate Briefing" : "Generate AI Briefing"}
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          icon={CalendarClock}
          label="Meetings today"
          value={data.meetings.length}
          href="/calendar"
        />
        <QuickStat
          icon={Mail}
          label="Urgent emails"
          value={data.urgentEmails.length}
          href="/emails?filter=important"
          tone={data.urgentEmails.length > 0 ? "warning" : "default"}
        />
        <QuickStat
          icon={ListChecks}
          label="Tasks due today"
          value={data.todayTasks.length}
          href="/tasks"
        />
        <QuickStat
          icon={AlertTriangle}
          label="Needs attention"
          value={totalAlerts}
          href="/tasks"
          tone={totalAlerts > 0 ? "destructive" : "default"}
        />
      </div>

      {/* AI Briefing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Daily Briefing
          </CardTitle>
          <CardDescription>
            Your chief-of-staff style summary — meetings, priorities, risks, and focus areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {briefing ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {confidence != null && (
                  <Badge variant="outline">AI confidence: {Math.round(confidence * 100)}%</Badge>
                )}
                {stats && (
                  <>
                    <Badge variant="secondary">{stats.meetings} meetings</Badge>
                    <Badge variant="secondary">{stats.urgentEmails} urgent emails</Badge>
                    <Badge variant="secondary">
                      {stats.todayTasks + stats.overdueTasks} tasks
                    </Badge>
                    <Badge variant="secondary">
                      {stats.followUpsDue + stats.overdueFollowUps} follow-ups
                    </Badge>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-5 text-sm leading-relaxed">
                {briefing}
              </div>
              <p className="text-xs text-muted-foreground">
                AI-generated — review before acting. Regenerate anytime for the latest data.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="font-medium">Ready to brief you</p>
                <p className="text-sm text-muted-foreground">
                  Click "Generate AI Briefing" for a focused rundown of your day
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's schedule */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Today&apos;s Schedule
              </CardTitle>
              <CardDescription>{data.meetings.length} meetings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">
                View calendar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings scheduled today.</p>
            ) : (
              <ul className="space-y-2">
                {data.meetings.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className="text-muted-foreground">
                      {new Date(m.startsAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Urgent Emails
              </CardTitle>
              <CardDescription>{data.urgentEmails.length} need attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/emails?filter=important">
                View inbox <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.urgentEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inbox is calm.</p>
            ) : (
              <ul className="space-y-2">
                {data.urgentEmails.map((e, i) => (
                  <li key={i} className="rounded-lg border border-border px-3 py-2">
                    <p className="truncate text-sm font-medium">{e.subject}</p>
                    <p className="text-xs text-muted-foreground">{e.fromName}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks & Follow-ups */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Today&apos;s Tasks
              </CardTitle>
              <CardDescription>
                {data.todayTasks.length} due today
                {data.overdueTasks.length > 0 && `, ${data.overdueTasks.length} overdue`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.overdueTasks.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-destructive">
                  Overdue
                </p>
                <ul className="space-y-1.5">
                  {data.overdueTasks.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                    >
                      <span>{t.title}</span>
                      <Badge variant="destructive">{t.priority}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.todayTasks.length === 0 && data.overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            ) : (
              <ul className="space-y-1.5">
                {data.todayTasks.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{t.title}</span>
                    <Badge variant="secondary">{t.priority}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4" /> Follow-ups
              </CardTitle>
              <CardDescription>
                {data.followUpsDue.length} due today
                {data.overdueFollowUps.length > 0 &&
                  `, ${data.overdueFollowUps.length} overdue`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/follow-ups">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.overdueFollowUps.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-destructive">
                  Overdue
                </p>
                <ul className="space-y-1.5">
                  {data.overdueFollowUps.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{f.personName}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.context}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.followUpsDue.length === 0 && data.overdueFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups pending.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.followUpsDue.map((f, i) => (
                  <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{f.personName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.nextAction ?? "Follow up"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  href,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warning" | "destructive";
}) {
  const toneClasses = {
    default: "text-primary bg-primary/10",
    warning: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15",
    destructive: "text-destructive bg-destructive/10",
  }[tone];

  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 pt-5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
