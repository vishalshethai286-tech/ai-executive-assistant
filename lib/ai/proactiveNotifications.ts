import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/services/notificationService";
import { startOfToday, endOfToday } from "@/services/taskService";

export async function generateProactiveNotifications(userId: string) {
  let created = 0;

  // 1. Unprepped meetings in the next 2 hours
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const upcomingMeetings = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startsAt: { gte: new Date(), lt: twoHoursFromNow },
    },
    include: { meetingNotes: true },
  });

  for (const meeting of upcomingMeetings) {
    const hasNotes = meeting.meetingNotes.length > 0;
    const minutesUntil = Math.round(
      (meeting.startsAt.getTime() - Date.now()) / (1000 * 60),
    );

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "meeting_prep",
        message: { contains: meeting.id },
        createdAt: { gte: startOfToday() },
      },
    });

    if (!alreadyNotified && !hasNotes) {
      await createNotification(userId, {
        type: "meeting_prep",
        title: `"${meeting.title}" starts in ${minutesUntil} minutes`,
        message: `${meeting.id}\nYou haven't prepped for this meeting yet. ${meeting.attendees.length} attendee(s): ${meeting.attendees.slice(0, 3).join(", ")}${meeting.attendees.length > 3 ? "..." : ""}`,
        link: "/meeting-prep",
      });
      created++;
    }
  }

  // 2. Stale follow-ups (no action for 3+ days past due)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const staleFollowUps = await prisma.followUp.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "WAITING"] },
      dueDate: { lt: threeDaysAgo },
    },
  });

  for (const followUp of staleFollowUps) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "follow_up_due",
        message: { contains: followUp.id },
        createdAt: { gte: threeDaysAgo },
      },
    });

    if (!alreadyNotified) {
      const daysPastDue = Math.round(
        (Date.now() - (followUp.dueDate?.getTime() ?? Date.now())) / (1000 * 60 * 60 * 24),
      );

      await createNotification(userId, {
        type: "follow_up_due",
        title: `Follow-up with ${followUp.personName} is ${daysPastDue} days overdue`,
        message: `${followUp.id}\nContext: ${followUp.context}\n${followUp.nextAction ? `Next action: ${followUp.nextAction}` : "No next action defined — consider reaching out or closing it."}`,
        link: "/follow-ups",
      });
      created++;
    }
  }

  // 3. Overdue tasks reminder
  const overdueTasks = await prisma.task.findMany({
    where: {
      userId,
      dueDate: { lt: startOfToday() },
      status: { not: "DONE" },
    },
  });

  if (overdueTasks.length > 0) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "task_due",
        title: { startsWith: "You have" },
        createdAt: { gte: startOfToday() },
      },
    });

    if (!alreadyNotified) {
      const critical = overdueTasks.filter((t) => t.priority === "CRITICAL" || t.priority === "HIGH");
      await createNotification(userId, {
        type: "task_due",
        title: `You have ${overdueTasks.length} overdue task(s)`,
        message: critical.length > 0
          ? `High-priority: ${critical.map((t) => t.title).join(", ")}`
          : `Tasks: ${overdueTasks.slice(0, 5).map((t) => t.title).join(", ")}`,
        link: "/tasks",
      });
      created++;
    }
  }

  // 4. Unread important emails reminder
  const unreadImportant = await prisma.emailMessage.count({
    where: { userId, isUnread: true, isImportant: true },
  });

  if (unreadImportant >= 3) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId,
        type: "important_email",
        title: { startsWith: "You have" },
        createdAt: { gte: startOfToday() },
      },
    });

    if (!alreadyNotified) {
      await createNotification(userId, {
        type: "important_email",
        title: `You have ${unreadImportant} unread important emails`,
        message: "Open your inbox to review and triage them.",
        link: "/emails?filter=important",
      });
      created++;
    }
  }

  // 5. Daily briefing reminder (if not generated today)
  const now = new Date();
  if (now.getHours() >= 7 && now.getHours() < 10) {
    const todaysBriefing = await prisma.aILog.findFirst({
      where: {
        userId,
        function: "generateDailyBriefing",
        createdAt: { gte: startOfToday() },
      },
    });

    if (!todaysBriefing) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId,
          type: "daily_briefing",
          createdAt: { gte: startOfToday() },
        },
      });

      if (!alreadyNotified) {
        const todayMeetings = await prisma.calendarEvent.count({
          where: {
            userId,
            startsAt: { gte: startOfToday(), lt: endOfToday() },
          },
        });

        await createNotification(userId, {
          type: "daily_briefing",
          title: "Your morning briefing is ready",
          message: `You have ${todayMeetings} meeting(s) today. Generate your AI briefing to get a focused rundown.`,
          link: "/briefing",
        });
        created++;
      }
    }
  }

  return { created };
}
