import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createMessage } from "@/services/messageService";
import { createNotification } from "@/services/notificationService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const msg = body.message;

    if (!msg?.text || !msg?.from) {
      return NextResponse.json({ ok: true });
    }

    const accounts = await prisma.integrationAccount.findMany({
      where: { provider: "telegram", status: "connected" },
      select: { userId: true, metadata: true },
    });

    for (const account of accounts) {
      const senderName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Unknown";
      const senderId = String(msg.chat.id);

      await createMessage(account.userId, {
        channel: "telegram",
        externalId: `tg_${msg.message_id}_${msg.chat.id}`,
        direction: "inbound",
        senderName,
        senderId,
        body: msg.text,
        metadata: {
          chatType: msg.chat.type,
          username: msg.from.username,
          messageId: msg.message_id,
        },
      });

      await createNotification(account.userId, {
        type: "important_email",
        title: `Telegram from ${senderName}`,
        message: msg.text.slice(0, 300),
        link: "/messages",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
