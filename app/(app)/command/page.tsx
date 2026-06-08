import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CommandConsole } from "./command-console";
import { listCommandHistory } from "./actions";

const examples = [
  "Summarize my day",
  "Draft a reply to John saying I will review tomorrow",
  "Create a task to follow up with Sarah next Monday",
  "What are my urgent items today?",
  "Prepare me for my 3 PM meeting",
  "Show all overdue follow-ups",
];

export default async function CommandCenterPage() {
  const history = await listCommandHistory();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Type what you need in plain language — the assistant will work out the intent and route it to the right module.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Try a command</CardTitle>
          <CardDescription>Examples: {examples.slice(0, 3).join(" · ")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CommandConsole examples={examples} history={history.map((h) => ({
            id: h.id,
            rawCommand: h.rawCommand,
            parsedIntent: h.parsedIntent,
            resultSummary: h.resultSummary,
            createdAt: h.createdAt.toISOString(),
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}
