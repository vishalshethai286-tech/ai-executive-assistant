import Link from "next/link";
import { requireUserId } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock, Mail, ListChecks, Repeat, AlertTriangle, ArrowRight } from "lucide-react";
import { getTodaysSchedule, getUpcomingEvents } from "@/services/calendarService";
import { getUrgentEmails } from "@/services/emailService";
import { getOverdueTasks, getTodayTasks } from "@/services/taskService";
import { getFollowUpsDueToday, getOverdueFollowUps } from "@/services/followUpService";
import { BriefingCard } from "./briefing-card";
import { SyncButton } from "./sync-button";
import { priorityBadgeVariant } from "@/components/tasks/badges";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [schedule, upcoming, urgentEmails, overdueTasks, todayTasks, followUpsDueToday, overdueFollowUps] =
    await Promise.all([
      getTodaysSchedule(userId),
      getUpcomingEvents(userId, 4),
      getUrgentEmails(userId, 5),
      getOverdueTasks(userId),
      getTodayTasks(userId),
      getFollowUpsDueToday(userId),
      getOverdueFollowUps(userId),
    ]);

  const topPriorities = [...todayTasks]
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Good to see you 👋</h1>
          <p className="text-sm text-muted-foreground">Here's your command center for today.</p>
        </div>
        <SyncButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Meetings today" value={schedule.length} href="/calendar" />
        <StatCard icon={Mail} label="Urgent emails" value={urgentEmails.length} href="/emails" tone={urgentEmails.length ? "warning" : "default"} />
        <StatCard icon={ListChecks} label="Overdue tasks" value={overdueTasks.length} href="/tasks" tone={overdueTasks.length ? "destructive" : "default"} />
        <StatCard icon={Repeat} label="Follow-ups due today" value={followUpsDueToday.length} href="/follow-ups" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BriefingCard
            meetings={schedule.map((m: (typeof schedule)[number]) => ({ title: m.title, startsAt: m.startsAt.toISOString() }))}
            importantEmails={urgentEmails.map((e: (typeof urgentEmails)[number]) => ({ fromName: e.fromName, subject: e.subject }))}
            pendingTasks={todayTasks.map((t: (typeof todayTasks)[number]) => ({ title: t.title, priority: t.priority }))}
            followUpsDueToday={followUpsDueToday.map((f: (typeof followUpsDueToday)[number]) => ({ personName: f.personName, nextAction: f.nextAction }))}
          />

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Today's top priorities</CardTitle>
                <CardDescription>Ranked by AI urgency &amp; importance</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {topPriorities.length === 0 ? (
                <EmptyState icon={ListChecks} title="No tasks due today" description="Enjoy the breathing room, or get ahead on tomorrow." />
              ) : (
                <ul className="space-y-2">
                  {topPriorities.map((t: (typeof topPriorities)[number]) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.category.replace("_", " ")}</p>
                      </div>
                      <Badge variant={priorityBadgeVariant(t.priority)}>{t.priority}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Calendar timeline</CardTitle>
                <CardDescription>What's ahead this week</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendar">
                  Open calendar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing on the calendar yet" />
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((e: (typeof upcoming)[number]) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="font-medium">{e.title}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Urgent emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inbox is calm right now.</p>
              ) : (
                <ul className="space-y-2">
                  {urgentEmails.map((e: (typeof urgentEmails)[number]) => (
                    <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                      <p className="truncate text-sm font-medium">{e.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.fromName}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="link" size="sm" className="mt-1 px-0" asChild>
                <Link href="/emails">Go to inbox <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Needs attention
              </CardTitle>
              <CardDescription>Overdue items across modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AttentionRow label="Overdue tasks" count={overdueTasks.length} href="/tasks" />
              <AttentionRow label="Overdue follow-ups" count={overdueFollowUps.length} href="/follow-ups" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4" /> Pending follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {followUpsDueToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due today.</p>
              ) : (
                <ul className="space-y-2">
                  {followUpsDueToday.map((f: (typeof followUpsDueToday)[number]) => (
                    <li key={f.id} className="rounded-lg border border-border px-3 py-2">
                      <p className="text-sm font-medium">{f.personName}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.nextAction || f.context}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="link" size="sm" className="mt-1 px-0" asChild>
                <Link href="/follow-ups">Open follow-up tracker <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function priorityRank(p: string) {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[p] ?? 0;
}

function StatCard({
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
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses}`}>
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

function AttentionRow({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
      <span>{label}</span>
      <Badge variant={count > 0 ? "destructive" : "secondary"}>{count}</Badge>
    </Link>
  );
}
