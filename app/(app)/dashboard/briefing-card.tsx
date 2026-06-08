"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateBriefing } from "./actions";
import { BriefingInputs } from "@/lib/ai/aiService";
import { toast } from "sonner";

export function BriefingCard(props: BriefingInputs) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generateBriefing(props);
        setBriefing(result.output);
        setConfidence(result.confidence);
      } catch {
        toast.error("Couldn't generate the briefing. Try again in a moment.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Daily Briefing
          </CardTitle>
          <CardDescription>A chief-of-staff style summary of your day</CardDescription>
        </div>
        <Button onClick={handleGenerate} disabled={pending} size="sm">
          <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          {briefing ? "Regenerate" : "Generate Briefing"}
        </Button>
      </CardHeader>
      <CardContent>
        {briefing ? (
          <div className="space-y-2">
            {confidence != null && (
              <Badge variant="outline" className="mb-1">
                AI confidence: {Math.round(confidence * 100)}%
              </Badge>
            )}
            <div className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{briefing}</div>
            <p className="text-xs text-muted-foreground">
              AI-generated — review before acting on it. You can regenerate anytime.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Get a focused rundown of meetings, important emails, tasks, and follow-ups due today.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
