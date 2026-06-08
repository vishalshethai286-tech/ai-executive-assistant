/**
 * Gmail integration service. Falls back to reading mock data from the database
 * (seeded EmailMessage rows) when no Gmail credentials are configured. Real
 * integration can be added by implementing fetchInboxFromGmail using googleapis
 * with the user's stored OAuth tokens (see IntegrationAccount).
 */

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface GmailSyncResult {
  synced: number;
  source: "gmail" | "mock";
}

/** Placeholder for real sync; currently a no-op that reports the mock source. */
export async function syncGmailInbox(_userId: string): Promise<GmailSyncResult> {
  if (!isGmailConfigured()) {
    return { synced: 0, source: "mock" };
  }
  // TODO: implement real sync using googleapis + stored OAuth tokens.
  return { synced: 0, source: "gmail" };
}
