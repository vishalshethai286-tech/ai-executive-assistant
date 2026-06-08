"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MeetingNoteInput } from "@/lib/validators";

const empty = {
  title: "",
  attendees: "",
  discussionSummary: "",
  decisions: "",
  actionItems: "",
  followUps: "",
  contactId: null as string | null,
};

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function MeetingNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MeetingNoteInput) => void;
  pending: boolean;
  contacts: { id: string; name: string }[];
}) {
  const [values, setValues] = useState(empty);

  useEffect(() => {
    if (open) setValues(empty);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title: values.title,
      attendees: values.attendees.split(",").map((a) => a.trim()).filter(Boolean),
      discussionSummary: values.discussionSummary || null,
      decisions: toLines(values.decisions),
      actionItems: toLines(values.actionItems),
      followUps: toLines(values.followUps),
      contactId: values.contactId,
      eventId: null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New meeting note</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="mtitle">Title</Label>
            <Input id="mtitle" required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees">Attendees (comma separated)</Label>
            <Input id="attendees" value={values.attendees} onChange={(e) => setValues((v) => ({ ...v, attendees: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Discussion summary</Label>
            <Textarea id="summary" rows={4} value={values.discussionSummary} onChange={(e) => setValues((v) => ({ ...v, discussionSummary: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="decisions">Decisions (one per line)</Label>
              <Textarea id="decisions" rows={4} value={values.decisions} onChange={(e) => setValues((v) => ({ ...v, decisions: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actionItems">Action items (one per line)</Label>
              <Textarea id="actionItems" rows={4} value={values.actionItems} onChange={(e) => setValues((v) => ({ ...v, actionItems: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followUps">Follow-ups (one per line)</Label>
              <Textarea id="followUps" rows={4} value={values.followUps} onChange={(e) => setValues((v) => ({ ...v, followUps: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Linked contact</Label>
            <Select value={values.contactId ?? "none"} onValueChange={(val) => setValues((v) => ({ ...v, contactId: val === "none" ? null : val }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Add meeting note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
