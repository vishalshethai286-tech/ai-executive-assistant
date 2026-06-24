import { syncGmailInbox } from "./gmail";
import { syncGoogleCalendar } from "./googleCalendar";
import { syncSlackMessages } from "./slack";
import { syncGitHubIssues } from "./github";
import { syncLinearIssues } from "./linear";
import { syncJiraIssues } from "./jira";
import { syncNotionPages } from "./notion";
import { syncCalendlyEvents } from "./calendly";
import { syncStripeData } from "./stripe";
import { syncTrelloCards } from "./trello";
import { syncAsanaTasks } from "./asana";
import { syncConfluencePages } from "./confluence";
import { prisma } from "@/lib/db/prisma";

export interface SyncResult {
  provider: string;
  synced: number;
  errors?: string[];
}

export async function syncProvider(userId: string, provider: string): Promise<SyncResult> {
  switch (provider) {
    case "google_gmail": {
      const r = await syncGmailInbox(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "google_calendar": {
      const r = await syncGoogleCalendar(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "slack": {
      const r = await syncSlackMessages(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "github": {
      const r = await syncGitHubIssues(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "linear": {
      const r = await syncLinearIssues(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "jira": {
      const r = await syncJiraIssues(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "notion": {
      const r = await syncNotionPages(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "calendly": {
      const r = await syncCalendlyEvents(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "stripe": {
      const r = await syncStripeData(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "trello": {
      const r = await syncTrelloCards(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "asana": {
      const r = await syncAsanaTasks(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    case "confluence": {
      const r = await syncConfluencePages(userId);
      return { provider, synced: r.synced, errors: r.errors };
    }
    default:
      return { provider, synced: 0, errors: [`No sync implementation for ${provider}`] };
  }
}

export async function syncAllConnected(userId: string): Promise<SyncResult[]> {
  const connected = await prisma.integrationAccount.findMany({
    where: { userId, status: "connected" },
  });

  const results: SyncResult[] = [];
  for (const account of connected) {
    try {
      const result = await syncProvider(userId, account.provider);
      results.push(result);
    } catch (err) {
      results.push({
        provider: account.provider,
        synced: 0,
        errors: [err instanceof Error ? err.message : "Unknown sync error"],
      });
    }
  }

  return results;
}
