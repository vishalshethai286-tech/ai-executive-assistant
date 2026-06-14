import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mockProvider } from "@/lib/ai/providers/mock";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { SettingsBoard } from "./settings-board";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  return (
    <SettingsBoard
      profile={{
        name: user.name ?? "",
        email: user.email ?? "",
        timezone: user.timezone,
        aiTone: user.aiTone as never,
        aiProvider: user.aiProvider as never,
      }}
      providers={[
        { value: "mock", label: "Mock (always available)", configured: mockProvider.isConfigured() },
        { value: "openai", label: "OpenAI", configured: openaiProvider.isConfigured() },
        { value: "anthropic", label: "Anthropic", configured: anthropicProvider.isConfigured() },
      ]}
    />
  );
}
