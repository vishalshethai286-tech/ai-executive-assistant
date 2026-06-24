import { prisma } from "@/lib/db/prisma";

async function getTelegramToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "telegram", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).botToken ?? null;
}

export async function sendTelegramMessage(userId: string, chatId: string, text: string) {
  const token = await getTelegramToken(userId);
  if (!token) throw new Error("Telegram not connected");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  if (!res.ok) throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getTelegramUpdates(userId: string, limit = 10) {
  const token = await getTelegramToken(userId);
  if (!token) return { ok: false, result: [] };

  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "telegram", status: "connected" },
  });
  const lastOffset = ((account?.metadata as Record<string, any>)?.lastUpdateOffset as number) ?? 0;

  const res = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?offset=${lastOffset + 1}&limit=${limit}&timeout=0`,
  );
  if (!res.ok) return { ok: false, result: [] };

  const data = await res.json();
  const updates = data.result ?? [];

  if (updates.length > 0) {
    const maxOffset = Math.max(...updates.map((u: any) => u.update_id));
    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "telegram" } },
      data: {
        metadata: { ...(account?.metadata as object ?? {}), lastUpdateOffset: maxOffset },
        lastSyncedAt: new Date(),
      },
    });

    for (const update of updates) {
      const msg = update.message;
      if (!msg?.text) continue;

      await prisma.notification.create({
        data: {
          userId,
          type: "important_email",
          title: `Telegram from ${msg.from?.first_name ?? "Unknown"}`,
          message: msg.text.slice(0, 500),
          link: "/notifications",
        },
      });
    }
  }

  return data;
}
