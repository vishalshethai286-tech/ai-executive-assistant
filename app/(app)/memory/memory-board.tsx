"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BrainCircuit, Plus, Trash2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { MemoryDialog } from "./memory-dialog";
import { createMemoryItemAction, deleteMemoryItemAction, toggleSensitiveAction } from "./actions";
import { MemoryItemInput } from "@/lib/validators";
import { toast } from "sonner";

export interface MemoryItem {
  id: string;
  type: string;
  label: string;
  content: string;
  isSensitive: boolean;
  source: string | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  preference: "Preference",
  person: "Person",
  commitment: "Commitment",
  writing_style: "Writing style",
  instruction: "Instruction",
  context: "Context",
};

export function MemoryBoard({ items }: { items: MemoryItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, MemoryItem[]>();
    for (const item of items) {
      if (!map.has(item.type)) map.set(item.type, []);
      map.get(item.type)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  function handleCreate(values: MemoryItemInput) {
    startTransition(async () => {
      try {
        await createMemoryItemAction(values);
        toast.success("Memory item saved");
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Couldn't save the memory item");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMemoryItemAction(id);
      toast.success("Memory item deleted");
      router.refresh();
    });
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleSensitive(id: string, current: boolean) {
    startTransition(async () => {
      await toggleSensitiveAction(id, !current);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Memory</h1>
          <p className="text-sm text-muted-foreground">What your assistant remembers about your preferences, people, and working style.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New memory item
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 pt-5 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            Sensitive items are masked by default and are excluded when building prompts for AI features. You can reveal,
            edit, or delete any memory at any time — nothing here is shared without your action.
          </p>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <EmptyState icon={BrainCircuit} title="No memory yet" description="Add what you'd like your assistant to remember." action={<Button size="sm" onClick={() => setDialogOpen(true)}>Add memory item</Button>} />
      ) : (
        grouped.map(([type, typeItems]) => (
          <div key={type} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{typeLabels[type] ?? type}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {typeItems.map((item) => {
                const masked = item.isSensitive && !revealed.has(item.id);
                return (
                  <Card key={item.id}>
                    <CardContent className="space-y-2 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(item.createdAt).toLocaleDateString()}
                            {item.source && ` · from ${item.source}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.isSensitive && (
                            <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> Sensitive</Badge>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => toggleReveal(item.id)} title={masked ? "Reveal" : "Hide"}>
                            {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={pending} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{masked ? "•••• Hidden — click the eye icon to reveal." : item.content}</p>
                      <div className="border-t border-border pt-2">
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleToggleSensitive(item.id, item.isSensitive)} disabled={pending}>
                          {item.isSensitive ? "Mark as not sensitive" : "Mark as sensitive"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <MemoryDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} pending={pending} />
    </div>
  );
}
