import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "WAITING", "DONE"]).default("TODO"),
  category: z
    .enum(["WORK", "PERSONAL", "FOLLOW_UP", "MEETING", "FINANCE", "ADMIN"])
    .default("WORK"),
  dueDate: z.coerce.date().optional().nullable(),
  contactId: z.string().trim().optional().nullable(),
});

export const followUpSchema = z.object({
  personName: z.string().trim().min(1, "Person name is required").max(200),
  company: z.string().trim().max(200).optional().nullable(),
  context: z.string().trim().min(1, "Context is required").max(5000),
  lastContact: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  nextAction: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["PENDING", "WAITING", "COMPLETED", "IGNORED"]).default("PENDING"),
  contactId: z.string().trim().optional().nullable(),
  emailId: z.string().trim().optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().trim().min(1, "Content is required").max(20000),
  contactId: z.string().trim().optional().nullable(),
  taskId: z.string().trim().optional().nullable(),
  followUpId: z.string().trim().optional().nullable(),
});

export const meetingNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  attendees: z.array(z.string().trim()).default([]),
  discussionSummary: z.string().trim().max(20000).optional().nullable(),
  decisions: z.array(z.string().trim()).default([]),
  actionItems: z.array(z.string().trim()).default([]),
  followUps: z.array(z.string().trim()).default([]),
  eventId: z.string().trim().optional().nullable(),
  contactId: z.string().trim().optional().nullable(),
});

export const memoryItemSchema = z.object({
  type: z.enum(["preference", "person", "commitment", "writing_style", "instruction", "context"]),
  label: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  isSensitive: z.boolean().default(false),
});

export const commandSchema = z.object({
  command: z.string().trim().min(1, "Command is required").max(2000),
});

export const emailReplySchema = z.object({
  emailId: z.string().trim().min(1),
  tone: z.enum(["Professional", "Friendly", "Short", "Firm", "Detailed"]).default("Professional"),
  instructions: z.string().trim().max(2000).optional().nullable(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  timezone: z.string().trim().min(1).max(100),
  aiTone: z.enum(["Professional", "Friendly", "Short", "Firm", "Detailed"]),
  aiProvider: z.enum(["mock", "openai", "anthropic"]),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type MeetingNoteInput = z.infer<typeof meetingNoteSchema>;
export type MemoryItemInput = z.infer<typeof memoryItemSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
