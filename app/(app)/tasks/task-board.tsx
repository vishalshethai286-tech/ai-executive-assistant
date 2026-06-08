"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Sparkles, ListChecks, Trash2, Pencil, Wand2 } from "lucide-react";
import { priorityBadgeVariant, statusBadgeVariant } from "@/components/tasks/badges";
import { TaskDialog, TaskFormValues } from "./task-dialog";
import { createTaskAction, updateTaskAction, deleteTaskAction, scoreTaskAction, breakdownTaskAction } from "./actions";
import { toast } from "sonner";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string;
  dueDate: string | null;
  aiScore: number | null;
  aiBreakdown: string[];
  contactId: string | null;
  contactName: string | null;
}

export function TaskBoard({
  all,
  overdue,
  today,
  weekly,
  contacts,
}: {
  all: TaskItem[];
  overdue: TaskItem[];
  today: TaskItem[];
  weekly: TaskItem[];
  contacts: { id: string; name: string }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskItem) {
    setEditing(task);
    setDialogOpen(true);
  }

  function handleSubmit(values: TaskFormValues) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateTaskAction(editing.id, values);
          toast.success("Task updated");
        } else {
          await createTaskAction(values);
          toast.success("Task created");
        }
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save the task");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTaskAction(id);
      toast.success("Task deleted");
      router.refresh();
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateTaskAction(id, { status: status as never });
      router.refresh();
    });
  }

  function handleScore(id: string) {
    startTransition(async () => {
      try {
        const res = await scoreTaskAction(id);
        toast.success(`AI priority score: ${res.score}`, { description: res.explanation.replace(/^Score:\s*\d+\s*—\s*/, "") });
        router.refresh();
      } catch {
        toast.error("Couldn't score this task");
      }
    });
  }

  function handleBreakdown(id: string) {
    startTransition(async () => {
      try {
        await breakdownTaskAction(id);
        toast.success("AI generated a task breakdown");
        router.refresh();
      } catch {
        toast.error("Couldn't break down this task");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Plan, prioritize, and let AI help you break work down.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="weekly">This week ({weekly.length})</TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "today", items: today, empty: "No tasks due today." },
          { value: "overdue", items: overdue, empty: "Nothing overdue — great work." },
          { value: "weekly", items: weekly, empty: "No tasks scheduled this week." },
          { value: "all", items: all, empty: "No tasks yet — create your first one." },
        ].map(({ value, items, empty }) => (
          <TabsContent key={value} value={value}>
            {items.length === 0 ? (
              <EmptyState icon={ListChecks} title={empty} action={<Button size="sm" onClick={openCreate}>Create a task</Button>} />
            ) : (
              <div className="space-y-3">
                {items.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{task.title}</p>
                            {task.aiScore != null && (
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" /> {task.aiScore}
                              </Badge>
                            )}
                          </div>
                          {task.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                            <Badge variant={statusBadgeVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
                            <Badge variant="secondary">{task.category.replace("_", " ")}</Badge>
                            {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                            {task.contactName && <span>· {task.contactName}</span>}
                          </div>
                          {task.aiBreakdown.length > 0 && (
                            <ul className="mt-2 space-y-1 rounded-md bg-muted/50 p-2 text-xs">
                              {task.aiBreakdown.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" /> {s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(task)} disabled={pending} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)} disabled={pending} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <select
                          className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          disabled={pending}
                        >
                          {["TODO", "IN_PROGRESS", "WAITING", "DONE"].map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <Button variant="outline" size="sm" onClick={() => handleScore(task.id)} disabled={pending}>
                          <Sparkles className="h-3.5 w-3.5" /> AI priority score
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleBreakdown(task.id)} disabled={pending}>
                          <Wand2 className="h-3.5 w-3.5" /> AI breakdown
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        pending={pending}
        initial={editing}
        contacts={contacts}
      />
    </div>
  );
}
