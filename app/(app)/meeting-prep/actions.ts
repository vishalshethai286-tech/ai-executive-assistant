"use server";

import { requireUserId } from "@/lib/auth/session";
import { prepareForMeeting } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function generateMeetingBrief(eventId: string) {
  const userId = await requireUserId();
  const provider = await getProvider(userId);

  const event = await prisma.calendarEvent.findFirstOrThrow({
    where: { id: eventId, userId },
    include: { meetingNotes: true, contact: true },
  });

  const relatedEmails = await prisma.emailMessage.findMany({
    where: {
      userId,
      OR: event.attendees.map((a) => ({
        fromEmail: { contains: a.split("@")[0], mode: "insensitive" as const },
      })),
    },
    orderBy: { receivedAt: "desc" },
    take: 5,
  });

  const relatedTasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: event.title.split(" ")[0], mode: "insensitive" } },
        ...(event.contactId ? [{ contactId: event.contactId }] : []),
      ],
      status: { not: "DONE" },
    },
    take: 5,
  });

  const attendeeContacts = await prisma.contact.findMany({
    where: {
      userId,
      OR: event.attendees.map((a) => ({
        email: { contains: a, mode: "insensitive" as const },
      })),
    },
  });

  const start = Date.now();
  const result = await prepareForMeeting(
    {
      title: event.title,
      startsAt: event.startsAt,
      attendees: event.attendees,
      description: event.description,
      relatedNotes: event.meetingNotes.map((n: (typeof event.meetingNotes)[number]) => n.title),
      relatedTasks: relatedTasks.map((t: (typeof relatedTasks)[number]) => `[${t.priority}] ${t.title}`),
    },
    provider,
  );

  await logAIActivity({
    userId,
    function: "prepareForMeeting",
    provider: result.provider,
    inputSummary: `event=${event.title} attendees=${event.attendees.length}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return {
    output: result.output,
    confidence: result.confidence,
    context: {
      relatedEmails: relatedEmails.map((e: (typeof relatedEmails)[number]) => ({
        fromName: e.fromName,
        subject: e.subject,
        receivedAt: e.receivedAt.toISOString(),
      })),
      relatedTasks: relatedTasks.map((t: (typeof relatedTasks)[number]) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
      })),
      attendeeProfiles: attendeeContacts.map((c: (typeof attendeeContacts)[number]) => ({
        name: c.name,
        company: c.company,
        role: c.role,
        lastInteraction: c.lastInteraction?.toISOString() ?? null,
      })),
    },
  };
}
