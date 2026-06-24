import { prisma } from "@/lib/db/prisma";
import { classifyEmailImportance, summarizeEmail, scoreTaskPriority } from "./aiService";
import { createNotification } from "@/services/notificationService";
import type { AIProviderName } from "./types";

export async function triageNewEmails(userId: string, provider?: AIProviderName) {
  const untriaged = await prisma.emailMessage.findMany({
    where: { userId, aiSummary: null },
    orderBy: { receivedAt: "desc" },
    take: 10,
  });

  let triaged = 0;

  for (const email of untriaged) {
    try {
      const [importance, summary] = await Promise.all([
        classifyEmailImportance(email, provider),
        summarizeEmail(email, provider),
      ]);

      const isImportant = importance.output.toLowerCase().startsWith("important: yes");

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          aiSummary: summary.output,
          isImportant: isImportant || email.isImportant,
          isPriority: isImportant || email.isPriority,
        },
      });

      if (isImportant) {
        await createNotification(userId, {
          type: "important_email",
          title: `Important email from ${email.fromName}`,
          message: `Subject: ${email.subject}\n${summary.output}`,
          link: "/emails",
        });
      }

      const needsFollowUp = /\b(action required|please respond|awaiting your|deadline|by end of|asap|urgent)\b/i.test(
        `${email.subject} ${email.body}`,
      );

      if (needsFollowUp) {
        const existingFollowUp = await prisma.followUp.findFirst({
          where: { userId, emailId: email.id },
        });

        if (!existingFollowUp) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 2);

          await prisma.followUp.create({
            data: {
              userId,
              personName: email.fromName,
              context: `Re: ${email.subject}`,
              status: "PENDING",
              emailId: email.id,
              contactId: email.contactId ?? undefined,
              dueDate,
              nextAction: `Reply to email about: ${email.subject}`,
            },
          });

          await prisma.emailMessage.update({
            where: { id: email.id },
            data: { label: "follow_up_needed" },
          });
        }
      }

      triaged++;
    } catch {
      // Skip emails that fail triage, will retry on next run
    }
  }

  return { triaged };
}

export async function scoreNewTasks(userId: string, provider?: AIProviderName) {
  const unscored = await prisma.task.findMany({
    where: { userId, aiScore: null, status: { not: "DONE" } },
    take: 10,
  });

  let scored = 0;

  for (const task of unscored) {
    try {
      const result = await scoreTaskPriority(task, provider);
      const scoreMatch = result.output.match(/Score:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

      if (score != null) {
        await prisma.task.update({
          where: { id: task.id },
          data: { aiScore: score },
        });

        if (score >= 80) {
          await createNotification(userId, {
            type: "task_due",
            title: `High-priority task: ${task.title}`,
            message: result.output,
            link: "/tasks",
          });
        }
      }

      scored++;
    } catch {
      // Skip, retry on next run
    }
  }

  return { scored };
}
