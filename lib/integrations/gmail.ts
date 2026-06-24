import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface GmailSyncResult {
  synced: number;
  source: "gmail" | "mock";
  errors?: string[];
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
}

async function getGoogleTokens(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return null;
  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  };
}

async function refreshAndStoreToken(userId: string, oauth2Client: ReturnType<typeof getOAuth2Client>) {
  const { credentials } = await oauth2Client.refreshAccessToken();
  if (credentials.access_token) {
    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : undefined,
        refresh_token: credentials.refresh_token ?? undefined,
      },
    });
  }
  return credentials;
}

export async function syncGmailInbox(userId: string, maxResults = 20): Promise<GmailSyncResult> {
  if (!isGmailConfigured()) {
    return { synced: 0, source: "mock" };
  }

  const tokens = await getGoogleTokens(userId);
  if (!tokens) {
    return { synced: 0, source: "mock", errors: ["No Google account linked. Sign in with Google first."] };
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
    try {
      await refreshAndStoreToken(userId, oauth2Client);
    } catch {
      return { synced: 0, source: "gmail", errors: ["Token refresh failed. Re-sign in with Google."] };
    }
  }

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const errors: string[] = [];
  let synced = 0;

  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: "in:inbox",
    });

    const messageIds = listRes.data.messages ?? [];

    for (const msg of messageIds) {
      try {
        const existing = await prisma.emailMessage.findFirst({
          where: { userId, externalId: msg.id! },
        });
        if (existing) continue;

        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });

        const headers = detail.data.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

        const fromRaw = getHeader("From");
        const fromMatch = fromRaw.match(/^(?:"?(.+?)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
        const fromName = fromMatch?.[1]?.trim() || fromMatch?.[2] || fromRaw;
        const fromEmail = fromMatch?.[2] || fromRaw;

        const subject = getHeader("Subject") || "(no subject)";
        const dateStr = getHeader("Date");
        const receivedAt = dateStr ? new Date(dateStr) : new Date();

        const body = extractBody(detail.data.payload);
        const snippet = detail.data.snippet || body.slice(0, 200);

        const labelIds = detail.data.labelIds ?? [];
        const isUnread = labelIds.includes("UNREAD");
        const isImportant = labelIds.includes("IMPORTANT");

        const contact = await prisma.contact.findFirst({
          where: { userId, email: { contains: fromEmail, mode: "insensitive" } },
        });

        await prisma.emailMessage.create({
          data: {
            userId,
            externalId: msg.id!,
            fromName,
            fromEmail,
            subject,
            snippet,
            body,
            receivedAt,
            isUnread,
            isImportant,
            contactId: contact?.id ?? null,
          },
        });
        synced++;
      } catch (err) {
        errors.push(`Failed to sync message ${msg.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    await prisma.integrationAccount.upsert({
      where: { userId_provider: { userId, provider: "google_gmail" } },
      update: { status: "connected", lastSyncedAt: new Date() },
      create: { userId, provider: "google_gmail", status: "connected", lastSyncedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gmail API error";
    errors.push(message);
    await prisma.integrationAccount.upsert({
      where: { userId_provider: { userId, provider: "google_gmail" } },
      update: { status: "error" },
      create: { userId, provider: "google_gmail", status: "error" },
    });
  }

  return { synced, source: "gmail", errors: errors.length > 0 ? errors : undefined };
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}
