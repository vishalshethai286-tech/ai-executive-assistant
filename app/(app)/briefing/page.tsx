import { requireUserId } from "@/lib/auth/session";
import { getTodaysSchedule } from "@/services/calendarService";
import { getUrgentEmails } from "@/services/emailService";
import { getOverdueTasks, getTodayTasks } from "@/services/taskService";
import { getFollowUpsDueToday, getOverdueFollowUps } from "@/services/followUpService";
import { BriefingBoard } from "./briefing-board";

export default async function BriefingPage() {
  const userId = await requireUserId();

  const [schedule, urgentEmails, overdueTasks, todayTasks, followUpsDue, overdueFollowUps] =
    await Promise.all([
      getTodaysSchedule(userId),
      getUrgentEmails(userId, 10),
      getOverdueTasks(userId),
      getTodayTasks(userId),
      getFollowUpsDueToday(userId),
      getOverdueFollowUps(userId),
    ]);

  return (
    <BriefingBoard
      data={{
        meetings: schedule.map((m: (typeof schedule)[number]) => ({
          title: m.title,
          startsAt: m.startsAt.toISOString(),
        })),
        urgentEmails: urgentEmails.map((e: (typeof urgentEmails)[number]) => ({
          fromName: e.fromName,
          subject: e.subject,
        })),
        overdueTasks: overdueTasks.map((t: (typeof overdueTasks)[number]) => ({
          title: t.title,
          priority: t.priority,
        })),
        todayTasks: todayTasks.map((t: (typeof todayTasks)[number]) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        })),
        followUpsDue: followUpsDue.map((f: (typeof followUpsDue)[number]) => ({
          personName: f.personName,
          nextAction: f.nextAction,
        })),
        overdueFollowUps: overdueFollowUps.map((f: (typeof overdueFollowUps)[number]) => ({
          personName: f.personName,
          context: f.context,
        })),
      }}
    />
  );
}
