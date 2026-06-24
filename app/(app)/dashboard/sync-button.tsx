"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncAndTriageAction } from "./sync-action";
import { toast } from "sonner";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncAndTriageAction();
        const parts: string[] = [];
        if (result.synced > 0) parts.push(`${result.synced} items synced`);
        if (result.triaged > 0) parts.push(`${result.triaged} emails triaged`);
        if (result.scored > 0) parts.push(`${result.scored} tasks scored`);
        if (result.notifications > 0) parts.push(`${result.notifications} alerts created`);
        toast.success(parts.length > 0 ? parts.join(", ") : "Everything is up to date");
        router.refresh();
      } catch {
        toast.error("Sync failed");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={pending}>
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Syncing…" : "Sync & Triage"}
    </Button>
  );
}
