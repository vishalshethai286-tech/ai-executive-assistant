"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getConnectionDefinition } from "@/lib/integrations/registry";
import { syncProvider, syncAllConnected } from "@/lib/integrations/syncAll";

/** Connects a token-based integration (Slack, WhatsApp, Zoom, Notion, ...) using user-supplied credentials. */
export async function connectIntegrationAction(provider: string, fields: Record<string, string>) {
  const userId = await requireUserId();
  const definition = getConnectionDefinition(provider);
  if (!definition) throw new Error("Unknown integration");

  if (definition.authType === "token") {
    const missing = (definition.fields ?? []).filter((f) => !fields[f.key]?.trim());
    if (missing.length > 0) {
      throw new Error(`Missing required field(s): ${missing.map((f) => f.label).join(", ")}`);
    }
  }

  await prisma.integrationAccount.upsert({
    where: { userId_provider: { userId, provider } },
    update: { status: "connected", metadata: fields, lastSyncedAt: new Date() },
    create: { userId, provider, status: "connected", metadata: fields },
  });

  revalidatePath("/connections");
  revalidatePath("/settings");
}

export async function disconnectIntegrationAction(provider: string) {
  const userId = await requireUserId();
  await prisma.integrationAccount.upsert({
    where: { userId_provider: { userId, provider } },
    update: { status: "disconnected", externalId: null, metadata: Prisma.JsonNull, lastSyncedAt: null },
    create: { userId, provider, status: "disconnected" },
  });

  revalidatePath("/connections");
  revalidatePath("/settings");
}

export async function syncIntegrationAction(provider: string) {
  const userId = await requireUserId();
  const result = await syncProvider(userId, provider);
  revalidatePath("/connections");
  revalidatePath("/emails");
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  revalidatePath("/notes");
  revalidatePath("/notifications");
  return result;
}

export async function syncAllAction() {
  const userId = await requireUserId();
  const results = await syncAllConnected(userId);
  revalidatePath("/connections");
  revalidatePath("/emails");
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  revalidatePath("/notes");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return results;
}
