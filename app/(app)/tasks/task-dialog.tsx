"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TaskItem } from "./task-board";

export interface TaskFormValues {
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "WAITING" | "DONE";
  category: "WORK" | "PERSONAL" | "FOLLOW_UP" | "MEETING" | "FINANCE" | "ADMIN";
  dueDate?: Date | null;
  contactId?: string | null;
}

const empty: TaskFormValues = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  category: "WORK",
  dueDate: null,
  contactId: null,
};

export function TaskDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  initial,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskFormValues) => void;
  pending: boolean;
  initial: TaskItem | null;
  contacts: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<TaskFormValues>(empty);

  useEffect(() => {
    if (initial) {
      setValues({
        title: initial.title,
        description: initial.description,
        priority: initial.priority as never,
        status: initial.status as never,
        category: initial.category as never,
        dueDate: initial.dueDate ? new Date(initial.dueDate) : null,
        contactId: initial.contactId,
      });
    } else {
      setValues(empty);
    }
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={values.description ?? ""} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={values.priority} onValueChange={(val) => setValues((v) => ({ ...v, priority: val as never }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(val) => setValues((v) => ({ ...v, status: val as never }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["TODO", "IN_PROGRESS", "WAITING", "DONE"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={values.category} onValueChange={(val) => setValues((v) => ({ ...v, category: val as never }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["WORK", "PERSONAL", "FOLLOW_UP", "MEETING", "FINANCE", "ADMIN"].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                type="date"
                value={values.dueDate ? values.dueDate.toISOString().slice(0, 10) : ""}
                onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value ? new Date(e.target.value) : null }))}
              />
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Related contact</Label>
              <Select
                value={values.contactId ?? "__none"}
                onValueChange={(val) => setValues((v) => ({ ...v, contactId: val === "__none" ? null : val }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{initial ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
