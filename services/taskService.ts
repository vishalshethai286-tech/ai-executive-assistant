import { prisma } from "@/lib/db/prisma";
import { TaskInput } from "@/lib/validators";
import { Prisma, TaskStatus } from "@prisma/client";

export function listTasks(userId: string, where: Prisma.TaskWhereInput = {}) {
  return prisma.task.findMany({
    where: { userId, ...where },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { contact: true },
  });
}

export function getOverdueTasks(userId: string) {
  return listTasks(userId, {
    dueDate: { lt: startOfToday() },
    status: { not: TaskStatus.DONE },
  });
}

export function getTodayTasks(userId: string) {
  return listTasks(userId, {
    dueDate: { gte: startOfToday(), lt: endOfToday() },
  });
}

export function getWeeklyTasks(userId: string) {
  const start = startOfToday();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return listTasks(userId, { dueDate: { gte: start, lt: end } });
}

export function createTask(userId: string, data: TaskInput) {
  return prisma.task.create({
    data: { ...data, userId },
  });
}

export function updateTask(userId: string, id: string, data: Partial<TaskInput>) {
  return prisma.task.update({
    where: { id, userId },
    data,
  });
}

export function deleteTask(userId: string, id: string) {
  return prisma.task.delete({ where: { id, userId } });
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}
