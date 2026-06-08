"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ContactInput } from "@/lib/validators";

const empty: ContactInput = {
  name: "",
  email: "",
  company: "",
  role: "",
  phone: "",
  notes: "",
};

export function ContactDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactInput) => void;
  pending: boolean;
  initial?: Partial<ContactInput> | null;
}) {
  const [values, setValues] = useState<ContactInput>(empty);

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
          <DialogTitle>{initial ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={values.email ?? ""} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={values.phone ?? ""} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={values.company ?? ""} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={values.role ?? ""} onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Relationship notes</Label>
            <Textarea id="notes" rows={4} value={values.notes ?? ""} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{initial ? "Save changes" : "Add contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
