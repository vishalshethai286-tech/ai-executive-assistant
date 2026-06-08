"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { profileSchema, ProfileInput } from "@/lib/validators";
import { prisma } from "@/lib/db/prisma";

export async function updateProfileAction(input: ProfileInput) {
  const userId = await requireUserId();
  const parsed = profileSchema.parse(input);
  await prisma.user.update({ where: { id: userId }, data: parsed });
  revalidatePath("/settings");
}

export async function disconnectIntegrationAction(provider: string) {
  const userId = await requireUserId();
  await prisma.integrationAccount.upsert({
    where: { userId_provider: { userId, provider } },
    update: { status: "disconnected", externalId: null, lastSyncedAt: null },
    create: { userId, provider, status: "disconnected" },
  });
  revalidatePath("/settings");
}
