import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isGoogleConfigured } from "@/lib/auth/auth";
import { isGmailConfigured } from "@/lib/integrations/gmail";
import { isGoogleCalendarConfigured } from "@/lib/integrations/googleCalendar";
import { mockProvider } from "@/lib/ai/providers/mock";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { SettingsBoard } from "./settings-board";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [user, integrations] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.integrationAccount.findMany({ where: { userId } }),
  ]);

  const integrationStatus = (provider: string) => integrations.find((i) => i.provider === provider)?.status ?? "disconnected";

  return (
    <SettingsBoard
      profile={{
        name: user.name ?? "",
        email: user.email ?? "",
        timezone: user.timezone,
        aiTone: user.aiTone as never,
        aiProvider: user.aiProvider as never,
      }}
      integrations={[
        { provider: "google_gmail", label: "Gmail", status: integrationStatus("google_gmail"), available: isGmailConfigured() && isGoogleConfigured },
        { provider: "google_calendar", label: "Google Calendar", status: integrationStatus("google_calendar"), available: isGoogleCalendarConfigured() && isGoogleConfigured },
      ]}
      providers={[
        { value: "mock", label: "Mock (always available)", configured: mockProvider.isConfigured() },
        { value: "openai", label: "OpenAI", configured: openaiProvider.isConfigured() },
        { value: "anthropic", label: "Anthropic", configured: anthropicProvider.isConfigured() },
      ]}
    />
  );
}
