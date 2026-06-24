import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createMessage } from "@/services/messageService";
import { createNotification } from "@/services/notificationService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "ai-exec-assistant";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const entries = body.entry ?? [];
    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        const messages = value?.messages ?? [];
        const contacts = value?.contacts ?? [];
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) continue;

        let account = await prisma.integrationAccount.findFirst({
          where: {
            provider: "whatsapp",
            status: "connected",
            metadata: { path: ["phoneNumberId"], equals: phoneNumberId },
          },
          select: { userId: true },
        });

        if (!account) {
          account = await prisma.integrationAccount.findFirst({
            where: { provider: "whatsapp", status: "connected" },
            select: { userId: true },
          });
          if (!account) continue;
        }

        for (const msg of messages) {
          if (msg.type !== "text") continue;

          const waContact = contacts.find((c: any) => c.wa_id === msg.from);
          const senderName = waContact?.profile?.name ?? msg.from;

          await createMessage(account.userId, {
            channel: "whatsapp",
            externalId: `wa_${msg.id}`,
            direction: "inbound",
            senderName,
            senderId: msg.from,
            body: msg.text?.body ?? "",
            metadata: { timestamp: msg.timestamp, phoneNumberId },
          });

          await createNotification(account.userId, {
            type: "important_email",
            title: `WhatsApp from ${senderName}`,
            message: (msg.text?.body ?? "").slice(0, 300),
            link: "/messages",
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
