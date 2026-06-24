"use server";

import { requireUserId } from "@/lib/auth/session";
import { generateDailyBriefing, BriefingInputs } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";
import { getTodaysSchedule } from "@/services/calendarService";
import { getUrgentEmails } from "@/services/emailService";
import { getOverdueTasks, getTodayTasks } from "@/services/taskService";
import { getFollowUpsDueToday, getOverdueFollowUps } from "@/services/followUpService";

async function getProvider(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user?.aiProvider as never) ?? "mock";
}

export async function generateFullBriefing() {
  const userId = await requireUserId();
  const provider = await getProvider(userId);

  const [schedule, urgentEmails, overdueTasks, todayTasks, followUpsDueToday, overdueFollowUps] =
    await Promise.all([
      getTodaysSchedule(userId),
      getUrgentEmails(userId, 10),
      getOverdueTasks(userId),
      getTodayTasks(userId),
      getFollowUpsDueToday(userId),
      getOverdueFollowUps(userId),
    ]);

  const inputs: BriefingInputs = {
    meetings: schedule.map((m: (typeof schedule)[number]) => ({
      title: m.title,
      startsAt: m.startsAt.toISOString(),
    })),
    importantEmails: urgentEmails.map((e: (typeof urgentEmails)[number]) => ({
      fromName: e.fromName,
      subject: e.subject,
    })),
    pendingTasks: [
      ...overdueTasks.map((t: (typeof overdueTasks)[number]) => ({
        title: t.title,
        priority: `${t.priority} (OVERDUE)`,
      })),
      ...todayTasks.map((t: (typeof todayTasks)[number]) => ({
        title: t.title,
        priority: t.priority,
      })),
    ],
    followUpsDueToday: [
      ...followUpsDueToday.map((f: (typeof followUpsDueToday)[number]) => ({
        personName: f.personName,
        nextAction: f.nextAction,
      })),
      ...overdueFollowUps.map((f: (typeof overdueFollowUps)[number]) => ({
        personName: f.personName,
        nextAction: `OVERDUE: ${f.nextAction ?? f.context}`,
      })),
    ],
  };

  const start = Date.now();
  const result = await generateDailyBriefing(inputs, provider);

  await logAIActivity({
    userId,
    function: "generateDailyBriefing",
    provider: result.provider,
    inputSummary: `meetings=${inputs.meetings.length} emails=${inputs.importantEmails.length} tasks=${inputs.pendingTasks.length} followUps=${inputs.followUpsDueToday.length}`,
    outputSummary: result.output,
    confidence: result.confidence,
    durationMs: Date.now() - start,
  });

  return {
    output: result.output,
    confidence: result.confidence,
    stats: {
      meetings: schedule.length,
      urgentEmails: urgentEmails.length,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      followUpsDue: followUpsDueToday.length,
      overdueFollowUps: overdueFollowUps.length,
    },
  };
}
