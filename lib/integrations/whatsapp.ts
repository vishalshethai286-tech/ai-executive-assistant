import { prisma } from "@/lib/db/prisma";

async function getWhatsAppCredentials(userId: string) {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "whatsapp", status: "connected" },
  });
  if (!account?.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.phoneNumberId || !meta.accessToken) return null;
  return meta;
}

export async function sendWhatsAppMessage(userId: string, to: string, body: string) {
  const creds = await getWhatsAppCredentials(userId);
  if (!creds) throw new Error("WhatsApp not connected");

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );

  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function verifyWhatsAppConnection(userId: string): Promise<{ ok: boolean; error?: string }> {
  const creds = await getWhatsAppCredentials(userId);
  if (!creds) return { ok: false, error: "WhatsApp not connected" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${creds.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      },
    );
    if (!res.ok) return { ok: false, error: `API ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
