"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FollowUpItem } from "./follow-up-board";

export interface FollowUpFormValues {
  personName: string;
  company?: string | null;
  context: string;
  lastContact?: Date | null;
  dueDate?: Date | null;
  nextAction?: string | null;
  status: "PENDING" | "WAITING" | "COMPLETED" | "IGNORED";
  contactId?: string | null;
}

const empty: FollowUpFormValues = {
  personName: "",
  company: "",
  context: "",
  lastContact: null,
  dueDate: null,
  nextAction: "",
  status: "PENDING",
  contactId: null,
};

export function FollowUpDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  initial,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FollowUpFormValues) => void;
  pending: boolean;
  initial: FollowUpItem | null;
  contacts: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<FollowUpFormValues>(empty);

  useEffect(() => {
    if (initial) {
      setValues({
        personName: initial.personName,
        company: initial.company,
        context: initial.context,
        lastContact: initial.lastContact ? new Date(initial.lastContact) : null,
        dueDate: initial.dueDate ? new Date(initial.dueDate) : null,
        nextAction: initial.nextAction,
        status: initial.status as never,
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
          <DialogTitle>{initial ? "Edit follow-up" : "New follow-up"}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="personName">Person</Label>
              <Input id="personName" required value={values.personName} onChange={(e) => setValues((v) => ({ ...v, personName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={values.company ?? ""} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="context">Context</Label>
            <Textarea id="context" required value={values.context} onChange={(e) => setValues((v) => ({ ...v, context: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nextAction">Next action</Label>
            <Input id="nextAction" value={values.nextAction ?? ""} onChange={(e) => setValues((v) => ({ ...v, nextAction: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lastContact">Last contact</Label>
              <Input
                id="lastContact"
                type="date"
                value={values.lastContact ? values.lastContact.toISOString().slice(0, 10) : ""}
                onChange={(e) => setValues((v) => ({ ...v, lastContact: e.target.value ? new Date(e.target.value) : null }))}
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(val) => setValues((v) => ({ ...v, status: val as never }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PENDING", "WAITING", "COMPLETED", "IGNORED"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{initial ? "Save changes" : "Create follow-up"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
