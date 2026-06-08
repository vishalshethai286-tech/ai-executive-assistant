import { mockProvider } from "./providers/mock";
import { openaiProvider } from "./providers/openai";
import { anthropicProvider } from "./providers/anthropic";
import { AIProvider, AIProviderName, AIResult, ParsedIntent } from "./types";

const providers: Record<AIProviderName, AIProvider> = {
  mock: mockProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

/** Resolve a provider, always falling back to the mock provider when unavailable. */
export function getProvider(preferred?: AIProviderName): AIProvider {
  if (preferred && preferred !== "mock") {
    const provider = providers[preferred];
    if (provider?.isConfigured()) return provider;
  }
  return mockProvider;
}

async function run(prompt: string, system: string, preferred?: AIProviderName): Promise<AIResult> {
  const provider = getProvider(preferred);
  try {
    return await provider.complete(prompt, system);
  } catch {
    // Always degrade gracefully to the mock provider so the UI keeps working.
    return mockProvider.complete(prompt, system);
  }
}

export interface EmailLike {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: Date | string;
}

export async function summarizeEmail(email: EmailLike, provider?: AIProviderName) {
  const system =
    "You are an executive assistant. Summarize the email in 2-3 sentences, focused on what the recipient needs to know or do.";
  const prompt = `From: ${email.fromName} <${email.fromEmail}>\nSubject: ${email.subject}\n\n${email.body}`;
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = `${email.fromName} wrote about "${email.subject}". Key point: ${firstSentence(
      email.body
    )} Likely needs a reply if action is requested.`;
  }
  return result;
}

export type ReplyTone = "Professional" | "Friendly" | "Short" | "Firm" | "Detailed";

export async function draftEmailReply(
  email: EmailLike,
  tone: ReplyTone = "Professional",
  instructions?: string,
  provider?: AIProviderName
) {
  const system = `You are an executive assistant drafting an email reply in a ${tone.toLowerCase()} tone. Keep it ready to send but always editable by the user before sending.`;
  const prompt = `Original email from ${email.fromName} <${email.fromEmail}>:\nSubject: ${email.subject}\n${email.body}\n\n${
    instructions ? `Additional instructions: ${instructions}\n` : ""
  }Draft a reply.`;
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = mockReply(email, tone, instructions);
  }
  return result;
}

function mockReply(email: EmailLike, tone: ReplyTone, instructions?: string) {
  const opener: Record<ReplyTone, string> = {
    Professional: `Hi ${firstName(email.fromName)},\n\nThanks for your note regarding "${email.subject}".`,
    Friendly: `Hey ${firstName(email.fromName)}!\n\nGreat to hear from you about "${email.subject}".`,
    Short: `${firstName(email.fromName)} — re: "${email.subject}":`,
    Firm: `${firstName(email.fromName)},\n\nRegarding "${email.subject}":`,
    Detailed: `Hi ${firstName(email.fromName)},\n\nThank you for reaching out about "${email.subject}". I want to make sure I address everything thoroughly.`,
  };
  const body = instructions
    ? `\n\n${instructions}`
    : `\n\nI'll review this and follow up with next steps shortly.`;
  const closing: Record<ReplyTone, string> = {
    Professional: "\n\nBest regards,",
    Friendly: "\n\nTalk soon,",
    Short: "\n\nThanks,",
    Firm: "\n\nRegards,",
    Detailed: "\n\nLooking forward to your thoughts,",
  };
  return `${opener[tone]}${body}${closing[tone]}`;
}

export interface BriefingInputs {
  meetings: { title: string; startsAt: Date | string }[];
  importantEmails: { fromName: string; subject: string }[];
  pendingTasks: { title: string; priority: string }[];
  followUpsDueToday: { personName: string; nextAction?: string | null }[];
}

export async function generateDailyBriefing(inputs: BriefingInputs, provider?: AIProviderName) {
  const system =
    "You are a chief-of-staff producing a concise morning briefing for a busy executive. Use short sections: Meetings, Important Emails, Tasks, Follow-ups, People to respond to, Key risks, Suggested focus areas.";
  const prompt = JSON.stringify(inputs, null, 2);
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = mockBriefing(inputs);
  }
  return result;
}

function mockBriefing(inputs: BriefingInputs) {
  const lines: string[] = [];
  lines.push("**Today's Meetings**");
  lines.push(
    inputs.meetings.length
      ? inputs.meetings.map((m) => `- ${m.title} at ${formatTime(m.startsAt)}`).join("\n")
      : "- No meetings scheduled."
  );
  lines.push("\n**Important Emails**");
  lines.push(
    inputs.importantEmails.length
      ? inputs.importantEmails.map((e) => `- ${e.fromName}: ${e.subject}`).join("\n")
      : "- Nothing urgent in your inbox."
  );
  lines.push("\n**Pending Tasks**");
  lines.push(
    inputs.pendingTasks.length
      ? inputs.pendingTasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n")
      : "- You're all caught up on tasks."
  );
  lines.push("\n**Follow-ups Due Today**");
  lines.push(
    inputs.followUpsDueToday.length
      ? inputs.followUpsDueToday
          .map((f) => `- ${f.personName}${f.nextAction ? `: ${f.nextAction}` : ""}`)
          .join("\n")
      : "- No follow-ups due today."
  );
  lines.push("\n**Key Risks**");
  lines.push(
    inputs.meetings.length > 4
      ? "- Heavy meeting day — limited focus time."
      : "- No major risks detected."
  );
  lines.push("\n**Suggested Focus Areas**");
  lines.push(
    "- Clear high-priority tasks before your first meeting.\n- Respond to important emails early.\n- Confirm prep for today's key meeting."
  );
  return lines.join("\n");
}

export interface TaskLike {
  title: string;
  description?: string | null;
  dueDate?: Date | string | null;
  category: string;
}

export async function scoreTaskPriority(task: TaskLike, provider?: AIProviderName) {
  const system =
    "You are an executive assistant. Score this task's priority from 0-100 based on urgency and importance, and explain briefly. Respond as 'Score: <n> — <reason>'.";
  const prompt = `Task: ${task.title}\nDescription: ${task.description ?? "(none)"}\nDue: ${
    task.dueDate ?? "(none)"
  }\nCategory: ${task.category}`;
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    const score = mockScore(task);
    result.output = `Score: ${score} — ${scoreReason(task, score)}`;
  }
  return result;
}

function mockScore(task: TaskLike): number {
  let score = 40;
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const days = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days < 0) score += 35;
    else if (days < 1) score += 30;
    else if (days < 3) score += 18;
    else if (days < 7) score += 8;
  }
  if (task.category === "FOLLOW_UP" || task.category === "MEETING") score += 10;
  return Math.min(99, score);
}

function scoreReason(task: TaskLike, score: number) {
  if (score >= 80) return "due very soon and high impact, prioritize today.";
  if (score >= 60) return "approaching deadline, schedule time soon.";
  if (score >= 40) return "moderate urgency, plan for this week.";
  return "low urgency, revisit when higher-priority items clear.";
}

export async function extractActionItems(content: string, provider?: AIProviderName) {
  const system =
    "Extract clear action items from these notes as a short bullet list. Each item should be a concrete, assignable task.";
  const result = await run(content, system, provider);
  if (result.provider === "mock") {
    result.output = mockActionItems(content).join("\n");
  }
  return result;
}

export async function extractActionItemsList(content: string, provider?: AIProviderName): Promise<string[]> {
  const result = await extractActionItems(content, provider);
  return result.output
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function mockActionItems(content: string): string[] {
  const sentences = content
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => /\b(will|need to|should|must|follow up|send|schedule|review|prepare|update)\b/i.test(s));
  if (sentences.length === 0) return ["- Review notes and define next steps"];
  return sentences.slice(0, 5).map((s) => `- ${capitalize(s)}`);
}

export interface MeetingNoteLike {
  title: string;
  attendees: string[];
  discussionSummary?: string | null;
  decisions: string[];
  actionItems: string[];
}

export async function summarizeMeetingNotes(note: MeetingNoteLike, provider?: AIProviderName) {
  const system =
    "Summarize these meeting notes in 3-4 sentences covering what was discussed, decided, and what happens next.";
  const prompt = JSON.stringify(note, null, 2);
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = `"${note.title}" with ${note.attendees.join(", ") || "no listed attendees"}. ${
      note.discussionSummary ? note.discussionSummary + " " : ""
    }${note.decisions.length ? `Decided: ${note.decisions.join("; ")}. ` : ""}${
      note.actionItems.length ? `Next steps: ${note.actionItems.join("; ")}.` : "No action items captured yet."
    }`;
  }
  return result;
}

export async function generateFollowUpMessage(
  followUp: { personName: string; company?: string | null; context: string; nextAction?: string | null },
  provider?: AIProviderName
) {
  const system =
    "Draft a brief, warm follow-up message to send to this person. It should reference the context naturally and propose the next action. Keep it editable, not pushy.";
  const prompt = `Person: ${followUp.personName}${followUp.company ? ` (${followUp.company})` : ""}\nContext: ${
    followUp.context
  }\nNext action: ${followUp.nextAction ?? "(not specified)"}`;
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = `Hi ${firstName(followUp.personName)},\n\nFollowing up on ${lowerFirst(
      followUp.context
    )} — wanted to check in on next steps${
      followUp.nextAction ? `: ${followUp.nextAction}` : "."
    }\n\nLet me know what works on your end.\n\nBest,`;
  }
  return result;
}

export async function classifyEmailImportance(email: EmailLike, provider?: AIProviderName) {
  const system =
    "Classify how important this email is for the recipient. Respond as 'Important: yes/no — <short reason>'.";
  const prompt = `From: ${email.fromName} <${email.fromEmail}>\nSubject: ${email.subject}\n\n${email.body}`;
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    const important = mockIsImportant(email);
    result.output = `Important: ${important ? "yes" : "no"} — ${
      important
        ? "contains time-sensitive language or a direct request."
        : "appears informational or low urgency."
    }`;
  }
  return result;
}

function mockIsImportant(email: EmailLike): boolean {
  return /\b(urgent|asap|deadline|important|action required|review|approve|today|tomorrow)\b/i.test(
    `${email.subject} ${email.body}`
  );
}

export async function parseCommandIntent(command: string, provider?: AIProviderName): Promise<ParsedIntent> {
  const system =
    "Classify the user's command into one intent: summarize_day, draft_reply, create_task, create_follow_up, show_urgent, prepare_meeting, show_overdue_follow_ups, or unknown. Extract any useful parameters (person, date, message, title). Respond as JSON: {\"intent\": string, \"parameters\": object, \"confidence\": number}.";
  const result = await run(command, system, provider);
  if (result.provider !== "mock") {
    try {
      const parsed = JSON.parse(extractJson(result.output));
      return {
        intent: parsed.intent ?? "unknown",
        parameters: parsed.parameters ?? {},
        confidence: parsed.confidence ?? result.confidence,
        rawCommand: command,
      };
    } catch {
      // fall through to mock-style heuristic parsing below
    }
  }
  return mockParseIntent(command);
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

function mockParseIntent(command: string): ParsedIntent {
  const c = command.toLowerCase().trim();

  if (/summari[sz]e (my )?(day|today)/.test(c)) {
    return { intent: "summarize_day", parameters: {}, confidence: 0.9, rawCommand: command };
  }
  if (/^draft a (reply|response)/.test(c) || /^reply to/.test(c)) {
    const personMatch = c.match(/(?:reply to|draft a reply to)\s+([a-z]+)/);
    const sayingMatch = command.match(/saying\s+(.*)$/i);
    return {
      intent: "draft_reply",
      parameters: {
        person: personMatch?.[1] ?? "",
        message: sayingMatch?.[1]?.trim() ?? "",
      },
      confidence: 0.85,
      rawCommand: command,
    };
  }
  if (/^create a task/.test(c) || /^add a task/.test(c) || /remind me to/.test(c)) {
    const titleMatch = command.match(/(?:create a task to|add a task to|remind me to)\s+(.*)$/i);
    return {
      intent: "create_task",
      parameters: { title: titleMatch?.[1]?.trim() ?? command },
      confidence: 0.85,
      rawCommand: command,
    };
  }
  if (/follow.?up/.test(c) && /(create|add|schedule)/.test(c)) {
    const personMatch = c.match(/with\s+([a-z]+)/);
    const whenMatch = command.match(/(next \w+|tomorrow|today|on \w+ ?\d*)/i);
    return {
      intent: "create_follow_up",
      parameters: { person: personMatch?.[1] ?? "", when: whenMatch?.[1] ?? "" },
      confidence: 0.8,
      rawCommand: command,
    };
  }
  if (/urgent|important items|what.*today/.test(c)) {
    return { intent: "show_urgent", parameters: {}, confidence: 0.75, rawCommand: command };
  }
  if (/prepare( me)? for/.test(c)) {
    const timeMatch = command.match(/(\d{1,2}\s?(am|pm)|\d{1,2}:\d{2})/i);
    return {
      intent: "prepare_meeting",
      parameters: { time: timeMatch?.[1] ?? "" },
      confidence: 0.8,
      rawCommand: command,
    };
  }
  if (/overdue follow.?ups?/.test(c)) {
    return { intent: "show_overdue_follow_ups", parameters: {}, confidence: 0.85, rawCommand: command };
  }
  return { intent: "unknown", parameters: {}, confidence: 0.3, rawCommand: command };
}

export interface MeetingPrepInputs {
  title: string;
  startsAt: Date | string;
  attendees: string[];
  description?: string | null;
  relatedNotes?: string[];
  relatedTasks?: string[];
}

export async function prepareForMeeting(meeting: MeetingPrepInputs, provider?: AIProviderName) {
  const system =
    "You are an executive assistant preparing the user for an upcoming meeting. Provide: who's attending, what to know, talking points, and open items to raise.";
  const prompt = JSON.stringify(meeting, null, 2);
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = mockMeetingPrep(meeting);
  }
  return result;
}

function mockMeetingPrep(meeting: MeetingPrepInputs) {
  const lines = [
    `**${meeting.title}** at ${formatTime(meeting.startsAt)}`,
    `Attendees: ${meeting.attendees.join(", ") || "Not listed"}`,
    meeting.description ? `Context: ${meeting.description}` : "Context: No description provided.",
    "",
    "**Talking points:**",
    "- Recap progress since the last sync",
    "- Confirm decisions/owners for open items",
    "- Agree on next steps and timeline",
  ];
  if (meeting.relatedTasks?.length) {
    lines.push("", "**Related open tasks:**", ...meeting.relatedTasks.map((t) => `- ${t}`));
  }
  if (meeting.relatedNotes?.length) {
    lines.push("", "**Related notes:**", ...meeting.relatedNotes.map((n) => `- ${n}`));
  }
  return lines.join("\n");
}

export interface ContactRelationshipInputs {
  name: string;
  company?: string | null;
  notes?: string | null;
  lastInteraction?: Date | string | null;
  openTasks: number;
  openFollowUps: number;
  recentEmailSubjects: string[];
}

export async function summarizeContactRelationship(
  contact: ContactRelationshipInputs,
  provider?: AIProviderName
) {
  const system =
    "Summarize the relationship with this contact in 2-3 sentences: how engaged they are, what's outstanding, and a suggested next step.";
  const prompt = JSON.stringify(contact, null, 2);
  const result = await run(prompt, system, provider);
  if (result.provider === "mock") {
    result.output = mockRelationshipSummary(contact);
  }
  return result;
}

function mockRelationshipSummary(c: ContactRelationshipInputs) {
  const parts: string[] = [];
  parts.push(
    `${c.name}${c.company ? ` (${c.company})` : ""} — ${
      c.lastInteraction
        ? `last contact ${formatDate(c.lastInteraction)}`
        : "no recorded interactions yet"
    }.`
  );
  if (c.openTasks || c.openFollowUps) {
    parts.push(`${c.openTasks} open task(s) and ${c.openFollowUps} open follow-up(s).`);
  } else {
    parts.push("No open items right now.");
  }
  if (c.recentEmailSubjects.length) {
    parts.push(`Recent topics: ${c.recentEmailSubjects.slice(0, 3).join("; ")}.`);
  }
  parts.push("Suggested next step: schedule a check-in to keep the relationship warm.");
  return parts.join(" ");
}

// --- small string helpers -----------------------------------------------

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function capitalize(text: string): string {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
}
