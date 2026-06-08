"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { contactSchema, ContactInput } from "@/lib/validators";
import * as contactService from "@/services/contactService";
import { summarizeContactRelationship } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";
import { FollowUpStatus, TaskStatus } from "@prisma/client";

export async function createContactAction(input: ContactInput) {
  const userId = await requireUserId();
  const parsed = contactSchema.parse(input);
  const contact = await contactService.createContact(userId, parsed);
  revalidatePath("/contacts");
  return contact;
}

export async function updateContactAction(id: string, input: Partial<ContactInput>) {
  const userId = await requireUserId();
  const contact = await contactService.updateContact(userId, id, input);
  revalidatePath("/contacts");
  return contact;
}

export async function deleteContactAction(id: string) {
  const userId = await requireUserId();
  await contactService.deleteContact(userId, id);
  revalidatePath("/contacts");
}

export async function summarizeRelationshipAction(id: string) {
  const userId = await requireUserId();
  const contact = await prisma.contact.findFirstOrThrow({
    where: { id, userId },
    include: { emails: { orderBy: { receivedAt: "desc" }, take: 5 }, tasks: true, followUps: true },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const start = Date.now();

  const result = await summarizeContactRelationship(
    {
      name: contact.name,
      company: contact.company,
      notes: contact.notes,
      lastInteraction: contact.lastInteraction,
      openTasks: contact.tasks.filter((t) => t.status !== TaskStatus.DONE).length,
      openFollowUps: contact.followUps.filter((f) => f.status === FollowUpStatus.PENDING || f.status === FollowUpStatus.WAITING).length,
      recentEmailSubjects: contact.emails.map((e) => e.subject),
    },
    (user?.aiProvider as never) ?? "mock"
  );

  await Promise.all([
    contactService.saveRelationshipSummary(userId, id, result.output),
    logAIActivity({
      userId,
      function: "summarizeContactRelationship",
      provider: result.provider,
      inputSummary: `contact=${contact.name}`,
      outputSummary: result.output,
      confidence: result.confidence,
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/contacts");
  return result.output;
}
