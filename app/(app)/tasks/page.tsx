import { requireUserId } from "@/lib/auth/session";
import { listTasks, getOverdueTasks, getTodayTasks, getWeeklyTasks } from "@/services/taskService";
import { listContacts } from "@/services/contactService";
import { TaskBoard } from "./task-board";

export default async function TasksPage() {
  const userId = await requireUserId();
  const [all, overdue, today, weekly, contacts] = await Promise.all([
    listTasks(userId),
    getOverdueTasks(userId),
    getTodayTasks(userId),
    getWeeklyTasks(userId),
    listContacts(userId),
  ]);

  const serialize = (tasks: typeof all) =>
    tasks.map((t: (typeof tasks)[number]) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      category: t.category,
      dueDate: t.dueDate?.toISOString() ?? null,
      aiScore: t.aiScore,
      aiBreakdown: t.aiBreakdown,
      contactId: t.contactId,
      contactName: t.contact?.name ?? null,
    }));

  return (
    <TaskBoard
      all={serialize(all)}
      overdue={serialize(overdue)}
      today={serialize(today)}
      weekly={serialize(weekly)}
      contacts={contacts.map((c: (typeof contacts)[number]) => ({ id: c.id, name: c.name }))}
    />
  );
}
