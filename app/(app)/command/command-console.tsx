"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles } from "lucide-react";
import { runCommand } from "./actions";

interface HistoryItem {
  id: string;
  rawCommand: string;
  parsedIntent: string | null;
  resultSummary: string | null;
  createdAt: string;
}

interface Exchange {
  command: string;
  intent?: string;
  message: string;
  ok: boolean;
}

export function CommandConsole({ examples, history }: { examples: string[]; history: HistoryItem[] }) {
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, startTransition] = useTransition();

  function send(command: string) {
    if (!command.trim()) return;
    startTransition(async () => {
      const result = await runCommand(command);
      setExchanges((prev) => [
        ...prev,
        result.ok
          ? { command, intent: result.intent, message: result.message, ok: true }
          : { command, message: result.error, ok: false },
      ]);
      setInput("");
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command…"
          disabled={pending}
        />
        <Button type="submit" disabled={pending}>
          <Send className="h-4 w-4" />
          Send
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => send(ex)}
            disabled={pending}
            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {exchanges.length > 0 && (
        <div className="space-y-3">
          {exchanges.map((ex, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">You</span>
                {ex.command}
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="space-y-1">
                  {ex.intent && ex.intent !== "unknown" && (
                    <Badge variant="outline" className="mb-1">
                      {ex.intent.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{ex.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent commands</p>
          <ul className="space-y-1.5">
            {history.slice(0, 8).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-accent">
                <span className="truncate">{h.rawCommand}</span>
                {h.parsedIntent && (
                  <Badge variant="secondary" className="shrink-0">
                    {h.parsedIntent.replace(/_/g, " ")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
