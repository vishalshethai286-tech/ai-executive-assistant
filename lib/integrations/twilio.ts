import { prisma } from "@/lib/db/prisma";

async function getTwilioCredentials(userId: string) {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "twilio_sms", status: "connected" },
  });
  if (!account?.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.accountSid || !meta.authToken || !meta.fromNumber) return null;
  return meta;
}

export async function sendSMS(userId: string, to: string, body: string) {
  const creds = await getTwilioCredentials(userId);
  if (!creds) throw new Error("Twilio SMS not connected");

  const authHeader = "Basic " + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: creds.fromNumber,
        Body: body,
      }),
    },
  );

  if (!res.ok) throw new Error(`Twilio API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function verifyTwilioConnection(userId: string): Promise<{ ok: boolean; error?: string }> {
  const creds = await getTwilioCredentials(userId);
  if (!creds) return { ok: false, error: "Twilio not connected" };

  try {
    const authHeader = "Basic " + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`,
      { headers: { Authorization: authHeader } },
    );
    if (!res.ok) return { ok: false, error: `API ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
