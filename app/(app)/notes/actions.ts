"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { noteSchema, meetingNoteSchema, NoteInput, MeetingNoteInput } from "@/lib/validators";
import * as noteService from "@/services/noteService";
import { extractActionItemsList, summarizeMeetingNotes } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function createNoteAction(input: NoteInput) {
  const userId = await requireUserId();
  const parsed = noteSchema.parse(input);
  const note = await noteService.createNote(userId, parsed);
  revalidatePath("/notes");
  return note;
}

export async function updateNoteAction(id: string, input: Partial<NoteInput>) {
  const userId = await requireUserId();
  const note = await noteService.updateNote(userId, id, input);
  revalidatePath("/notes");
  return note;
}

export async function deleteNoteAction(id: string) {
  const userId = await requireUserId();
  await noteService.deleteNote(userId, id);
  revalidatePath("/notes");
}

export async function extractActionItemsAction(id: string) {
  const userId = await requireUserId();
  const note = await prisma.note.findFirstOrThrow({ where: { id, userId } });
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await extractActionItemsList(note.content, provider);

  await Promise.all([
    noteService.updateNote(userId, id, { actionItems: result }),
    logAIActivity({
      userId,
      function: "extractActionItems",
      provider,
      inputSummary: `note=${note.title}`,
      outputSummary: result.join("; "),
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/notes");
  return result;
}

export async function createMeetingNoteAction(input: MeetingNoteInput) {
  const userId = await requireUserId();
  const parsed = meetingNoteSchema.parse(input);
  const note = await noteService.createMeetingNote(userId, parsed);
  revalidatePath("/notes");
  return note;
}

export async function updateMeetingNoteAction(id: string, input: Partial<MeetingNoteInput>) {
  const userId = await requireUserId();
  const note = await noteService.updateMeetingNote(userId, id, input);
  revalidatePath("/notes");
  return note;
}

export async function deleteMeetingNoteAction(id: string) {
  const userId = await requireUserId();
  await noteService.deleteMeetingNote(userId, id);
  revalidatePath("/notes");
}

export async function summarizeMeetingNoteAction(id: string) {
  const userId = await requireUserId();
  const note = await prisma.meetingNote.findFirstOrThrow({ where: { id, userId } });
  const provider = await getProvider(userId);
  const start = Date.now();

  const result = await summarizeMeetingNotes(
    {
      title: note.title,
      attendees: note.attendees,
      discussionSummary: note.discussionSummary,
      decisions: note.decisions,
      actionItems: note.actionItems,
    },
    provider
  );

  await Promise.all([
    noteService.updateMeetingNote(userId, id, { aiSummary: result.output }),
    logAIActivity({
      userId,
      function: "summarizeMeetingNotes",
      provider: result.provider,
      inputSummary: `meeting=${note.title}`,
      outputSummary: result.output,
      confidence: result.confidence,
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/notes");
  return result.output;
}
