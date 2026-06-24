import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db/prisma";

export interface SlackSyncResult {
  synced: number;
  errors?: string[];
}

async function getSlackToken(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "slack", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).botToken ?? null;
}

export async function syncSlackMessages(userId: string, limit = 20): Promise<SlackSyncResult> {
  const token = await getSlackToken(userId);
  if (!token) return { synced: 0, errors: ["Slack not connected"] };

  const client = new WebClient(token);
  const errors: string[] = [];
  let synced = 0;

  try {
    const conversationsRes = await client.conversations.list({
      types: "im,mpim",
      limit: 10,
    });

    for (const channel of conversationsRes.channels ?? []) {
      if (!channel.id) continue;

      try {
        const historyRes = await client.conversations.history({
          channel: channel.id,
          limit,
        });

        for (const msg of historyRes.messages ?? []) {
          if (!msg.ts || msg.subtype) continue;

          const externalId = `slack_${channel.id}_${msg.ts}`;
          const existing = await prisma.emailMessage.findFirst({
            where: { userId, externalId },
          });
          if (existing) continue;

          let userName = "Slack User";
          if (msg.user) {
            try {
              const userInfo = await client.users.info({ user: msg.user });
              userName = userInfo.user?.real_name || userInfo.user?.name || "Slack User";
            } catch { /* use default */ }
          }

          await prisma.notification.create({
            data: {
              userId,
              type: "important_email",
              title: `Slack DM from ${userName}`,
              message: (msg.text ?? "").slice(0, 500),
              link: "/notifications",
            },
          });
          synced++;
        }
      } catch (err) {
        errors.push(`Channel ${channel.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "slack" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Slack API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}

export async function sendSlackMessage(userId: string, channel: string, text: string) {
  const token = await getSlackToken(userId);
  if (!token) throw new Error("Slack not connected");

  const client = new WebClient(token);
  const result = await client.chat.postMessage({ channel, text });
  return { ok: result.ok, ts: result.ts };
}
