"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import * as calendarService from "@/services/calendarService";
import { detectConflicts, suggestMeetingTimes } from "@/lib/integrations/googleCalendar";
import { prepareForMeeting, draftEmailReply } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  attendees: z.array(z.string().trim()).default([]),
  contactId: z.string().trim().optional().nullable(),
});

export type EventInput = z.infer<typeof eventSchema>;

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function createEventAction(input: EventInput) {
  const userId = await requireUserId();
  const parsed = eventSchema.parse(input);

  const existing = await calendarService.listEvents(userId);
  const conflicts = detectConflicts({ startsAt: parsed.startsAt, endsAt: parsed.endsAt, existing });

  const event = await calendarService.createEvent(userId, parsed);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { event, conflicts: conflicts.map((c) => ({ id: c.id, title: c.title })) };
}

export async function updateEventAction(id: string, input: Partial<EventInput>) {
  const userId = await requireUserId();
  const event = await calendarService.updateEvent(userId, id, input);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return event;
}

export async function deleteEventAction(id: string) {
  const userId = await requireUserId();
  await calendarService.deleteEvent(userId, id);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function suggestTimesAction(durationMins = 30) {
  const userId = await requireUserId();
  const existing = await calendarService.getUpcomingEvents(userId, 50);
  return suggestMeetingTimes(existing, durationMins, 3);
}

export async function prepareForMeetingAction(id: string) {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findFirstOrThrow({ where: { id, userId }, include: { meetingNotes: true } });
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await prepareForMeeting(
    {
      title: event.title,
      startsAt: event.startsAt,
      attendees: event.attendees,
      description: event.description,
      relatedNotes: event.meetingNotes.map((n) => n.title),
    },
    provider
  );

  await logAIActivity({
    userId,
    function: "prepareForMeeting",
    provider: result.provider,
    inputSummary: `event=${event.title}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return { output: result.output, confidence: result.confidence };
}

export async function draftRescheduleAction(id: string, reason?: string) {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findFirstOrThrow({ where: { id, userId } });
  const provider = await getProvider(userId);

  const result = await draftEmailReply(
    {
      fromName: event.organizer || "the organizer",
      fromEmail: "organizer@example.com",
      subject: event.title,
      body: `Meeting "${event.title}" scheduled for ${event.startsAt.toLocaleString()}.`,
      receivedAt: event.startsAt,
    },
    "Professional",
    `Politely ask to reschedule this meeting${reason ? ` because ${reason}` : ""}, and propose finding a new time.`,
    provider
  );

  return result.output;
}
