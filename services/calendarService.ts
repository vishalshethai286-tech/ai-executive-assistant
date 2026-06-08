import { prisma } from "@/lib/db/prisma";
import { startOfToday, endOfToday } from "./taskService";

export function listEvents(userId: string, from?: Date, to?: Date) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lt: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { contact: true },
  });
}

export function getTodaysSchedule(userId: string) {
  return listEvents(userId, startOfToday(), endOfToday());
}

export function getUpcomingEvents(userId: string, take = 5) {
  return prisma.calendarEvent.findMany({
    where: { userId, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
  });
}

export function getEvent(userId: string, id: string) {
  return prisma.calendarEvent.findFirst({ where: { id, userId }, include: { contact: true, meetingNotes: true } });
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  attendees?: string[];
  contactId?: string | null;
}

export function createEvent(userId: string, data: CreateEventInput) {
  return prisma.calendarEvent.create({ data: { ...data, userId } });
}

export function updateEvent(userId: string, id: string, data: Partial<CreateEventInput>) {
  return prisma.calendarEvent.update({ where: { id, userId }, data });
}

export function deleteEvent(userId: string, id: string) {
  return prisma.calendarEvent.delete({ where: { id, userId } });
}
