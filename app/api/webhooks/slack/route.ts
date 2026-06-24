import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createMessage } from "@/services/messageService";
import { createNotification } from "@/services/notificationService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    if (body.type !== "event_callback") {
      return NextResponse.json({ ok: true });
    }

    const event = body.event;
    if (!event || event.type !== "message" || event.subtype || event.bot_id) {
      return NextResponse.json({ ok: true });
    }

    const accounts = await prisma.integrationAccount.findMany({
      where: { provider: "slack", status: "connected" },
      select: { userId: true, metadata: true },
    });

    for (const account of accounts) {
      const senderId = event.user ?? "unknown";
      let senderName = senderId;

      const meta = account.metadata as Record<string, string> | null;
      if (meta?.botToken) {
        try {
          const userRes = await fetch(`https://slack.com/api/users.info?user=${senderId}`, {
            headers: { Authorization: `Bearer ${meta.botToken}` },
          });
          const userData = await userRes.json();
          senderName = userData.user?.real_name || userData.user?.name || senderId;
        } catch { /* use ID as fallback */ }
      }

      await createMessage(account.userId, {
        channel: "slack",
        externalId: `slack_${event.channel}_${event.ts}`,
        direction: "inbound",
        senderName,
        senderId,
        body: event.text ?? "",
        metadata: {
          channelId: event.channel,
          channelType: event.channel_type,
          ts: event.ts,
          threadTs: event.thread_ts,
        },
      });

      await createNotification(account.userId, {
        type: "important_email",
        title: `Slack message from ${senderName}`,
        message: (event.text ?? "").slice(0, 300),
        link: "/messages",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Slack webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
