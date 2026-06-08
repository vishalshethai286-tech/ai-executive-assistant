"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MemoryItemInput } from "@/lib/validators";

const empty: MemoryItemInput = { type: "preference", label: "", content: "", isSensitive: false };

const types: { value: MemoryItemInput["type"]; label: string }[] = [
  { value: "preference", label: "Preference" },
  { value: "person", label: "Person" },
  { value: "commitment", label: "Commitment" },
  { value: "writing_style", label: "Writing style" },
  { value: "instruction", label: "Instruction" },
  { value: "context", label: "Context" },
];

export function MemoryDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MemoryItemInput) => void;
  pending: boolean;
}) {
  const [values, setValues] = useState<MemoryItemInput>(empty);

  useEffect(() => {
    if (open) setValues(empty);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New memory item</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={values.type} onValueChange={(val) => setValues((v) => ({ ...v, type: val as MemoryItemInput["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" required value={values.label} onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" required rows={4} value={values.content} onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Mark as sensitive</p>
              <p className="text-xs text-muted-foreground">Sensitive items are masked by default and excluded from AI prompts.</p>
            </div>
            <Switch checked={values.isSensitive} onCheckedChange={(checked) => setValues((v) => ({ ...v, isSensitive: checked }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Save memory</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
