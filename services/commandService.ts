import { prisma } from "@/lib/db/prisma";
import { ParsedIntent } from "@/lib/ai/types";
import {
  parseCommandIntent,
  generateDailyBriefing,
  draftEmailReply,
  prepareForMeeting,
} from "@/lib/ai/aiService";
import { getOverdueFollowUps, getFollowUpsDueToday } from "./followUpService";
import { getOverdueTasks, getTodayTasks, createTask } from "./taskService";
import { getTodaysSchedule, getUpcomingEvents } from "./calendarService";
import { getUrgentEmails } from "./emailService";
import { TaskCategory } from "@prisma/client";

export interface CommandResponse {
  intent: ParsedIntent["intent"];
  message: string;
  data?: unknown;
}

export async function executeCommand(userId: string, rawCommand: string, aiProvider?: "mock" | "openai" | "anthropic"): Promise<CommandResponse> {
  const parsed = await parseCommandIntent(rawCommand, aiProvider);
  const response = await routeIntent(userId, parsed, aiProvider);

  await prisma.commandLog.create({
    data: {
      userId,
      rawCommand,
      parsedIntent: parsed.intent,
      parameters: parsed.parameters,
      resultSummary: response.message.slice(0, 500),
      success: true,
    },
  });

  return response;
}

async function routeIntent(
  userId: string,
  parsed: ParsedIntent,
  aiProvider?: "mock" | "openai" | "anthropic"
): Promise<CommandResponse> {
  switch (parsed.intent) {
    case "summarize_day": {
      const [meetings, urgentEmails, pendingTasks, followUpsDueToday] = await Promise.all([
        getTodaysSchedule(userId),
        getUrgentEmails(userId, 5),
        getTodayTasks(userId),
        getFollowUpsDueToday(userId),
      ]);
      const result = await generateDailyBriefing(
        {
          meetings,
          importantEmails: urgentEmails,
          pendingTasks,
          followUpsDueToday,
        },
        aiProvider
      );
      return { intent: parsed.intent, message: result.output, data: { confidence: result.confidence } };
    }

    case "show_urgent": {
      const [emails, overdueTasks, overdueFollowUps] = await Promise.all([
        getUrgentEmails(userId, 5),
        getOverdueTasks(userId),
        getOverdueFollowUps(userId),
      ]);
      const lines: string[] = [];
      if (emails.length) lines.push(`**Urgent emails (${emails.length}):** ` + emails.map((e) => e.subject).join(", "));
      if (overdueTasks.length)
        lines.push(`**Overdue tasks (${overdueTasks.length}):** ` + overdueTasks.map((t) => t.title).join(", "));
      if (overdueFollowUps.length)
        lines.push(
          `**Overdue follow-ups (${overdueFollowUps.length}):** ` +
            overdueFollowUps.map((f) => f.personName).join(", ")
        );
      return {
        intent: parsed.intent,
        message: lines.length ? lines.join("\n") : "Nothing urgent right now — you're on top of things.",
        data: { emails, overdueTasks, overdueFollowUps },
      };
    }

    case "show_overdue_follow_ups": {
      const followUps = await getOverdueFollowUps(userId);
      return {
        intent: parsed.intent,
        message: followUps.length
          ? `You have ${followUps.length} overdue follow-up(s): ${followUps.map((f) => f.personName).join(", ")}`
          : "No overdue follow-ups — nice work staying on top of it.",
        data: followUps,
      };
    }

    case "create_task": {
      const title = parsed.parameters.title?.trim();
      if (!title) return { intent: parsed.intent, message: "I couldn't tell what task to create — try 'create a task to ...'." };
      const task = await createTask(userId, {
        title,
        category: TaskCategory.FOLLOW_UP,
        priority: "MEDIUM",
        status: "TODO",
      } as never);
      return { intent: parsed.intent, message: `Created task: "${task.title}"`, data: task };
    }

    case "create_follow_up": {
      const person = parsed.parameters.person;
      if (!person) {
        return { intent: parsed.intent, message: "Tell me who the follow-up is with, e.g. 'create a follow-up with Sarah next Monday'." };
      }
      return {
        intent: parsed.intent,
        message: `Got it — open the Follow-Ups page to confirm details for a follow-up with ${capitalize(person)}${
          parsed.parameters.when ? ` (${parsed.parameters.when})` : ""
        }.`,
        data: parsed.parameters,
      };
    }

    case "draft_reply": {
      const person = parsed.parameters.person;
      const message = parsed.parameters.message;
      if (!person) {
        return { intent: parsed.intent, message: "Tell me who to reply to, e.g. 'draft a reply to John saying ...'." };
      }
      const draft = await draftEmailReply(
        {
          fromName: capitalize(person),
          fromEmail: `${person.toLowerCase()}@example.com`,
          subject: "Following up",
          body: message || "(no content provided)",
          receivedAt: new Date(),
        },
        "Professional",
        message,
        aiProvider
      );
      return { intent: parsed.intent, message: draft.output, data: { confidence: draft.confidence } };
    }

    case "prepare_meeting": {
      const events = await getUpcomingEvents(userId, 5);
      const target = parsed.parameters.time
        ? events.find((e) => formatHour(e.startsAt).includes(parsed.parameters.time.toLowerCase().replace(/\s/g, "")))
        : events[0];
      if (!target) {
        return { intent: parsed.intent, message: "I couldn't find a matching meeting on your calendar." };
      }
      const prep = await prepareForMeeting(
        {
          title: target.title,
          startsAt: target.startsAt,
          attendees: target.attendees,
          description: target.description,
        },
        aiProvider
      );
      return { intent: parsed.intent, message: prep.output, data: { event: target, confidence: prep.confidence } };
    }

    default:
      return {
        intent: "unknown",
        message:
          "I'm not sure how to help with that yet. Try things like \"Summarize my day\", \"Show all overdue follow-ups\", or \"Prepare me for my 3 PM meeting\".",
      };
  }
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatHour(date: Date) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, "");
}
