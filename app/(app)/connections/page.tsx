import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { connectionRegistry } from "@/lib/integrations/registry";
import { ConnectionsBoard } from "./connections-board";

export default async function ConnectionsPage() {
  const userId = await requireUserId();
  const integrations = await prisma.integrationAccount.findMany({ where: { userId } });

  const items = connectionRegistry.map((def) => {
    const account = integrations.find((i: (typeof integrations)[number]) => i.provider === def.provider);
    return {
      provider: def.provider,
      label: def.label,
      category: def.category,
      description: def.description,
      authType: def.authType,
      fields: def.fields ?? [],
      configured: def.configured(),
      status: account?.status ?? "disconnected",
      lastSyncedAt: account?.lastSyncedAt ? account.lastSyncedAt.toISOString() : null,
    };
  });

  return <ConnectionsBoard items={items} />;
}
