"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { taskSchema, TaskInput } from "@/lib/validators";
import * as taskService from "@/services/taskService";
import { scoreTaskPriority, extractActionItemsList } from "@/lib/ai/aiService";
import { logAIActivity } from "@/services/aiLogService";
import { prisma } from "@/lib/db/prisma";

export async function createTaskAction(input: TaskInput) {
  const userId = await requireUserId();
  const parsed = taskSchema.parse(input);
  const task = await taskService.createTask(userId, parsed);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return task;
}

export async function updateTaskAction(id: string, input: Partial<TaskInput>) {
  const userId = await requireUserId();
  const task = await taskService.updateTask(userId, id, input);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return task;
}

export async function deleteTaskAction(id: string) {
  const userId = await requireUserId();
  await taskService.deleteTask(userId, id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function scoreTaskAction(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirstOrThrow({ where: { id, userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const start = Date.now();

  const result = await scoreTaskPriority(task, (user?.aiProvider as never) ?? "mock");
  const score = Number(result.output.match(/Score:\s*(\d+)/i)?.[1] ?? 50);

  await Promise.all([
    taskService.updateTask(userId, id, { aiScore: score } as never),
    logAIActivity({
      userId,
      function: "scoreTaskPriority",
      provider: result.provider,
      inputSummary: `task=${task.title}`,
      outputSummary: result.output,
      confidence: result.confidence,
      durationMs: Date.now() - start,
    }),
  ]);

  revalidatePath("/tasks");
  return { score, explanation: result.output };
}

export async function breakdownTaskAction(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirstOrThrow({ where: { id, userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const start = Date.now();

  const subtasks = await extractActionItemsList(
    `${task.title}\n${task.description ?? ""}`,
    (user?.aiProvider as never) ?? "mock"
  );

  await Promise.all([
    prisma.task.update({ where: { id, userId }, data: { aiBreakdown: subtasks } }),
    logAIActivity({
      userId,
      function: "scoreTaskPriority:breakdown",
      provider: "mock",
      inputSummary: `task=${task.title}`,
      outputSummary: subtasks.join(" | "),
    }),
  ]);

  revalidatePath("/tasks");
  return subtasks;
}
