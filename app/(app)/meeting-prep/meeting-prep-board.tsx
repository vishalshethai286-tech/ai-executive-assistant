"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CalendarDays,
  Sparkles,
  Clock,
  Users,
  Mail,
  ListChecks,
  ArrowRight,
  MapPin,
  FileText,
} from "lucide-react";
import { generateMeetingBrief } from "./actions";
import { toast } from "sonner";

export interface MeetingItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  attendees: string[];
  organizer: string | null;
  contactName: string | null;
}

interface PrepContext {
  relatedEmails: { fromName: string; subject: string; receivedAt: string }[];
  relatedTasks: { title: string; priority: string; status: string }[];
  attendeeProfiles: {
    name: string;
    company: string | null;
    role: string | null;
    lastInteraction: string | null;
  }[];
}

interface PrepResult {
  output: string;
  confidence: number;
  context: PrepContext;
}

export function MeetingPrepBoard({ meetings }: { meetings: MeetingItem[] }) {
  const [preps, setPreps] = useState<Record<string, PrepResult>>({});
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handlePrepare(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      try {
        const result = await generateMeetingBrief(id);
        setPreps((prev) => ({ ...prev, [id]: result }));
      } catch {
        toast.error("Couldn't generate meeting prep");
      } finally {
        setLoadingId(null);
      }
    });
  }

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.startsAt) > now);
  const nextMeeting = upcoming[0] ?? null;

  const timeUntilNext = nextMeeting
    ? Math.round((new Date(nextMeeting.startsAt).getTime() - now.getTime()) / (1000 * 60))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meeting Prep</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered briefs with attendee context, related emails, and talking points
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/calendar">
            Open calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Next meeting highlight */}
      {nextMeeting && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 pt-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{nextMeeting.title}</p>
                <p className="text-sm text-muted-foreground">
                  {timeUntilNext != null && timeUntilNext > 0
                    ? timeUntilNext < 60
                      ? `Starts in ${timeUntilNext} minutes`
                      : `Starts in ${Math.round(timeUntilNext / 60)} hours`
                    : "Starting now"}
                  {" · "}
                  {new Date(nextMeeting.startsAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {nextMeeting.location && ` · ${nextMeeting.location}`}
                </p>
              </div>
            </div>
            <Button
              onClick={() => handlePrepare(nextMeeting.id)}
              disabled={pending}
            >
              <Sparkles className="h-4 w-4" />
              {preps[nextMeeting.id] ? "Refresh Prep" : "Prepare Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming meetings"
          description="Your calendar is clear. Meetings from the next 7 days will appear here."
          action={
            <Button size="sm" asChild>
              <Link href="/calendar">Go to calendar</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const prep = preps[meeting.id];
            const isLoading = pending && loadingId === meeting.id;
            const meetingDate = new Date(meeting.startsAt);
            const isPast = meetingDate < now;

            return (
              <Card key={meeting.id} className={isPast ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarDays className="h-4 w-4" /> {meeting.title}
                      </CardTitle>
                      <CardDescription className="mt-1 space-x-2">
                        <span>
                          {meetingDate.toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {" · "}
                          {meetingDate.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {new Date(meeting.endsAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {meeting.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="inline h-3 w-3" /> {meeting.location}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrepare(meeting.id)}
                      disabled={pending}
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      {prep ? "Refresh" : "Generate Prep"}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Attendees & description */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {meeting.attendees.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Users className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {meeting.attendees.join(", ")}
                        </span>
                      </div>
                    )}
                    {meeting.description && (
                      <div className="flex items-start gap-1.5">
                        <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{meeting.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Prep brief */}
                  {prep && (
                    <div className="space-y-4 border-t border-border pt-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">AI Meeting Brief</span>
                          <Badge variant="outline">
                            {Math.round(prep.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
                          {prep.output}
                        </div>
                      </div>

                      {/* Attendee profiles */}
                      {prep.context.attendeeProfiles.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                            <Users className="h-3.5 w-3.5" /> Attendee Profiles
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {prep.context.attendeeProfiles.map((p, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-border px-3 py-2 text-sm"
                              >
                                <p className="font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[p.role, p.company].filter(Boolean).join(" · ") ||
                                    "No profile info"}
                                  {p.lastInteraction &&
                                    ` · Last contact: ${new Date(p.lastInteraction).toLocaleDateString()}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related emails */}
                      {prep.context.relatedEmails.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                            <Mail className="h-3.5 w-3.5" /> Related Emails
                          </p>
                          <ul className="space-y-1.5">
                            {prep.context.relatedEmails.map((e, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                              >
                                <span>
                                  <span className="font-medium">{e.fromName}</span>:{" "}
                                  {e.subject}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(e.receivedAt).toLocaleDateString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Related tasks */}
                      {prep.context.relatedTasks.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                            <ListChecks className="h-3.5 w-3.5" /> Open Tasks
                          </p>
                          <ul className="space-y-1.5">
                            {prep.context.relatedTasks.map((t, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                              >
                                <span>{t.title}</span>
                                <div className="flex gap-1.5">
                                  <Badge variant="secondary">{t.status}</Badge>
                                  <Badge variant="outline">{t.priority}</Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        AI-generated — review before your meeting. Context is pulled from your
                        contacts, emails, and tasks.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
