import { prisma } from "@/lib/db/prisma";
import { NoteInput, MeetingNoteInput } from "@/lib/validators";

export function listNotes(userId: string) {
  return prisma.note.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { contact: true } });
}

export function getNote(userId: string, id: string) {
  return prisma.note.findFirst({ where: { id, userId } });
}

export function createNote(userId: string, data: NoteInput) {
  return prisma.note.create({ data: { ...data, userId } });
}

export function updateNote(userId: string, id: string, data: Partial<NoteInput> & { aiSummary?: string; actionItems?: string[] }) {
  return prisma.note.update({ where: { id, userId }, data });
}

export function deleteNote(userId: string, id: string) {
  return prisma.note.delete({ where: { id, userId } });
}

export function listMeetingNotes(userId: string) {
  return prisma.meetingNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { event: true, contact: true } });
}

export function getMeetingNote(userId: string, id: string) {
  return prisma.meetingNote.findFirst({ where: { id, userId } });
}

export function createMeetingNote(userId: string, data: MeetingNoteInput) {
  return prisma.meetingNote.create({ data: { ...data, userId } });
}

export function updateMeetingNote(
  userId: string,
  id: string,
  data: Partial<MeetingNoteInput> & { aiSummary?: string }
) {
  return prisma.meetingNote.update({ where: { id, userId }, data });
}

export function deleteMeetingNote(userId: string, id: string) {
  return prisma.meetingNote.delete({ where: { id, userId } });
}
