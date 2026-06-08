import { requireUserId } from "@/lib/auth/session";
import { listMemoryItems } from "@/services/memoryService";
import { MemoryBoard } from "./memory-board";

export default async function MemoryPage() {
  const userId = await requireUserId();
  const items = await listMemoryItems(userId);

  return (
    <MemoryBoard
      items={items.map((m: (typeof items)[number]) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        content: m.content,
        isSensitive: m.isSensitive,
        source: m.source,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
