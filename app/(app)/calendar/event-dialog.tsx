"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface EventFormValues {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
  contactId?: string | null;
}

const empty = {
  title: "",
  description: "",
  location: "",
  start: "",
  end: "",
  attendees: "",
};

export function EventDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EventFormValues) => void;
  pending: boolean;
  contacts: { id: string; name: string }[];
}) {
  const [values, setValues] = useState(empty);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.start || !values.end) return;
    onSubmit({
      title: values.title,
      description: values.description || null,
      location: values.location || null,
      startsAt: new Date(values.start),
      endsAt: new Date(values.end),
      attendees: values.attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    });
    setValues(empty);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Starts</Label>
              <Input id="start" type="datetime-local" required value={values.start} onChange={(e) => setValues((v) => ({ ...v, start: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Ends</Label>
              <Input id="end" type="datetime-local" required value={values.end} onChange={(e) => setValues((v) => ({ ...v, end: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={values.location} onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees">Attendees (comma separated)</Label>
            <Input id="attendees" value={values.attendees} onChange={(e) => setValues((v) => ({ ...v, attendees: e.target.value }))} placeholder="jane@company.com, sam@company.com" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Create event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
