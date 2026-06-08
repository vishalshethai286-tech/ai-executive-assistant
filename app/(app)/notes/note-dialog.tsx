"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NoteInput } from "@/lib/validators";

const empty: NoteInput = { title: "", content: "", contactId: null, taskId: null, followUpId: null };

export function NoteDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  initial,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NoteInput) => void;
  pending: boolean;
  initial?: Partial<NoteInput> | null;
  contacts: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<NoteInput>(empty);

  useEffect(() => {
    if (open) setValues({ ...empty, ...initial });
  }, [open, initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" required rows={8} value={values.content} onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))} />
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
            <Button type="submit" disabled={pending}>{initial ? "Save changes" : "Add note"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
