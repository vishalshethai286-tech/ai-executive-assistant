/**
 * Central registry of all third-party connections the assistant can surface
 * under Settings → Connections. Each entry describes how to determine whether
 * the integration is configured (env vars present) and what category/auth
 * style it uses. Providers without env-based config (e.g. WhatsApp, Slack)
 * are connected by the user supplying a token/webhook, stored in
 * IntegrationAccount.metadata.
 */

import { isGoogleConfigured } from "@/lib/auth/auth";
import { isGmailConfigured } from "@/lib/integrations/gmail";
import { isGoogleCalendarConfigured } from "@/lib/integrations/googleCalendar";

export type ConnectionAuthType = "oauth" | "token";

export interface ConnectionDefinition {
  provider: string;
  label: string;
  category: "Email" | "Calendar" | "Messaging" | "Productivity" | "AI";
  description: string;
  authType: ConnectionAuthType;
  /** For token-based connections, the fields the user must fill in. */
  fields?: { key: string; label: string; placeholder?: string; secret?: boolean }[];
  /** Whether the underlying credentials/env config are present. */
  configured: () => boolean;
}

export const connectionRegistry: ConnectionDefinition[] = [
  {
    provider: "google_gmail",
    label: "Gmail",
    category: "Email",
    description: "Sync your inbox for AI triage, summaries, and reply drafting.",
    authType: "oauth",
    configured: () => isGmailConfigured() && isGoogleConfigured,
  },
  {
    provider: "google_calendar",
    label: "Google Calendar",
    category: "Calendar",
    description: "Two-way sync for scheduling, conflict detection, and meeting prep.",
    authType: "oauth",
    configured: () => isGoogleCalendarConfigured() && isGoogleConfigured,
  },
  {
    provider: "microsoft_outlook",
    label: "Outlook Mail",
    category: "Email",
    description: "Sync Outlook/Microsoft 365 mail for inbox triage and drafting.",
    authType: "oauth",
    configured: () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  },
  {
    provider: "microsoft_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    description: "Sync Microsoft 365 calendar events and availability.",
    authType: "oauth",
    configured: () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
  },
  {
    provider: "slack",
    label: "Slack",
    category: "Messaging",
    description: "Surface DMs and mentions that need follow-up alongside your inbox.",
    authType: "token",
    fields: [{ key: "botToken", label: "Bot User OAuth Token", placeholder: "xoxb-...", secret: true }],
    configured: () => true,
  },
  {
    provider: "whatsapp",
    label: "WhatsApp Business",
    category: "Messaging",
    description: "Receive and respond to WhatsApp messages from key contacts.",
    authType: "token",
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID" },
      { key: "accessToken", label: "Access Token", secret: true },
    ],
    configured: () => true,
  },
  {
    provider: "zoom",
    label: "Zoom",
    category: "Productivity",
    description: "Pull meeting details and recordings into meeting prep and notes.",
    authType: "token",
    fields: [{ key: "apiKey", label: "API Key / JWT", secret: true }],
    configured: () => true,
  },
  {
    provider: "notion",
    label: "Notion",
    category: "Productivity",
    description: "Sync notes and tasks with a connected Notion workspace.",
    authType: "token",
    fields: [{ key: "integrationToken", label: "Internal Integration Token", secret: true }],
    configured: () => true,
  },
];

export function getConnectionDefinition(provider: string) {
  return connectionRegistry.find((c) => c.provider === provider);
}
