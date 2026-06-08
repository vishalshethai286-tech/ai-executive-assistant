"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Sparkles, Repeat, Trash2, Pencil } from "lucide-react";
import { followUpStatusBadgeVariant } from "@/components/tasks/badges";
import { FollowUpDialog, FollowUpFormValues } from "./follow-up-dialog";
import {
  createFollowUpAction,
  updateFollowUpAction,
  deleteFollowUpAction,
  generateFollowUpMessageAction,
} from "./actions";
import { toast } from "sonner";

export interface FollowUpItem {
  id: string;
  personName: string;
  company: string | null;
  context: string;
  lastContact: string | null;
  dueDate: string | null;
  nextAction: string | null;
  status: string;
  aiMessage: string | null;
  contactId: string | null;
  contactName: string | null;
}

export function FollowUpBoard({
  all,
  overdue,
  dueToday,
  contacts,
}: {
  all: FollowUpItem[];
  overdue: FollowUpItem[];
  dueToday: FollowUpItem[];
  contacts: { id: string; name: string }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpItem | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(item: FollowUpItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  function handleSubmit(values: FollowUpFormValues) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateFollowUpAction(editing.id, values);
          toast.success("Follow-up updated");
        } else {
          await createFollowUpAction(values);
          toast.success("Follow-up created");
        }
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save the follow-up");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFollowUpAction(id);
      toast.success("Follow-up removed");
      router.refresh();
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateFollowUpAction(id, { status: status as never });
      router.refresh();
    });
  }

  function handleGenerateMessage(id: string) {
    startTransition(async () => {
      try {
        await generateFollowUpMessageAction(id);
        toast.success("Drafted a follow-up message — review before sending");
        router.refresh();
      } catch {
        toast.error("Couldn't draft a message");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Follow-Up Tracker</h1>
          <p className="text-sm text-muted-foreground">Never let a commitment slip through the cracks.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New follow-up
        </Button>
      </div>

      <Tabs defaultValue="dueToday">
        <TabsList>
          <TabsTrigger value="dueToday">Due today ({dueToday.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "dueToday", items: dueToday, empty: "Nothing due today." },
          { value: "overdue", items: overdue, empty: "No overdue follow-ups." },
          { value: "all", items: all, empty: "No follow-ups yet — add your first one." },
        ].map(({ value, items, empty }) => (
          <TabsContent key={value} value={value}>
            {items.length === 0 ? (
              <EmptyState icon={Repeat} title={empty} action={<Button size="sm" onClick={openCreate}>Add a follow-up</Button>} />
            ) : (
              <div className="space-y-3">
                {items.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="space-y-3 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {f.personName} {f.company && <span className="font-normal text-muted-foreground">· {f.company}</span>}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.context}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={followUpStatusBadgeVariant(f.status)}>{f.status}</Badge>
                            {f.dueDate && <span>Due {new Date(f.dueDate).toLocaleDateString()}</span>}
                            {f.lastContact && <span>· Last contact {new Date(f.lastContact).toLocaleDateString()}</span>}
                            {f.nextAction && <span>· Next: {f.nextAction}</span>}
                          </div>
                          {f.aiMessage && (
                            <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs leading-relaxed">
                              <p className="mb-1 font-medium text-muted-foreground">AI-drafted message (edit before sending):</p>
                              {f.aiMessage}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)} disabled={pending} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} disabled={pending} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <select
                          className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                          value={f.status}
                          onChange={(e) => handleStatusChange(f.id, e.target.value)}
                          disabled={pending}
                        >
                          {["PENDING", "WAITING", "COMPLETED", "IGNORED"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <Button variant="outline" size="sm" onClick={() => handleGenerateMessage(f.id)} disabled={pending}>
                          <Sparkles className="h-3.5 w-3.5" /> Draft follow-up message
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

      <FollowUpDialog
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
