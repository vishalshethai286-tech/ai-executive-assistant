/**
 * Central registry of all third-party connections the assistant can surface
 * under Settings → Connections. Each entry describes how to determine whether
 * the integration is configured (env vars present) and what category/auth
 * style it uses. Providers without env-based config (e.g. WhatsApp, Slack)
 * are connected by the user supplying a token/webhook, stored in
 * IntegrationAccount.metadata.
 *
 * `helpSteps` + `helpUrl` power the "How to connect" guide shown on each
 * connection card.
 */

import { isGoogleConfigured } from "@/lib/auth/auth";
import { isGmailConfigured } from "@/lib/integrations/gmail";
import { isGoogleCalendarConfigured } from "@/lib/integrations/googleCalendar";

export type ConnectionAuthType = "oauth" | "token";

export type ConnectionCategory = "Email" | "Calendar" | "Messaging" | "Productivity" | "Finance" | "Knowledge" | "AI";

export interface ConnectionDefinition {
  provider: string;
  label: string;
  category: ConnectionCategory;
  description: string;
  authType: ConnectionAuthType;
  /** For token-based connections, the fields the user must fill in. */
  fields?: { key: string; label: string; placeholder?: string; secret?: boolean }[];
  /** Whether the underlying credentials/env config are present. */
  configured: () => boolean;
  /** Ordered, plain-language steps for obtaining credentials / completing the connection. */
  helpSteps: string[];
  /** Link to the provider's relevant docs/console. */
  helpUrl?: string;
}

export const connectionRegistry: ConnectionDefinition[] = [
  // ---- Email ----
  {
    provider: "google_gmail",
    label: "Gmail",
    category: "Email",
    description: "Sync your inbox for AI triage, summaries, and reply drafting.",
    authType: "oauth",
    configured: () => isGmailConfigured() && isGoogleConfigured,
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpSteps: [
      "Create a project in Google Cloud Console and enable the Gmail API.",
      "Create an OAuth 2.0 Client ID (type: Web application).",
      "Add your app's domain to Authorized redirect URIs (e.g. https://yourapp.com/api/auth/callback/google).",
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as environment variables on your deployment.",
      "Sign in with Google from the login page — Gmail will appear as Connected here automatically.",
    ],
  },
  {
    provider: "microsoft_outlook",
    label: "Outlook Mail",
    category: "Email",
    description: "Sync Outlook/Microsoft 365 mail for inbox triage and drafting.",
    authType: "oauth",
    configured: () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    helpUrl: "https://portal.azure.com/",
    helpSteps: [
      "Register an app in Azure Portal under Azure Active Directory → App registrations.",
      "Add the Mail.Read and Mail.Send delegated Microsoft Graph permissions.",
      "Create a client secret under Certificates & secrets.",
      "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET as environment variables on your deployment.",
      "Sign in with Microsoft to authorize access — Outlook Mail will show as Connected.",
    ],
  },

  {
    provider: "smtp_email",
    label: "SMTP Email (Send)",
    category: "Email",
    description: "Send emails directly from the app using any SMTP server (Gmail, Outlook, custom).",
    authType: "token",
    fields: [
      { key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "port", label: "SMTP Port", placeholder: "587" },
      { key: "user", label: "Email / Username", placeholder: "you@example.com" },
      { key: "pass", label: "Password / App Password", placeholder: "App password", secret: true },
      { key: "from", label: "From Address (optional)", placeholder: "you@example.com" },
    ],
    configured: () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    helpUrl: "https://support.google.com/accounts/answer/185833",
    helpSteps: [
      "For Gmail: go to Google Account → Security → 2-Step Verification → App passwords, then generate an App password.",
      "For Outlook: use smtp-mail.outlook.com as host, port 587, and your Microsoft account password.",
      "For custom SMTP: get the host, port, username, and password from your email provider.",
      "Enter the SMTP details below, or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM as environment variables.",
      "Once connected, a Send button will appear when you draft replies in the Email Assistant.",
    ],
  },

  // ---- Calendar ----
  {
    provider: "google_calendar",
    label: "Google Calendar",
    category: "Calendar",
    description: "Two-way sync for scheduling, conflict detection, and meeting prep.",
    authType: "oauth",
    configured: () => isGoogleCalendarConfigured() && isGoogleConfigured,
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpSteps: [
      "In the same Google Cloud project used for Gmail, enable the Google Calendar API.",
      "Add the Calendar scope (https://www.googleapis.com/auth/calendar) to your OAuth consent screen.",
      "Reuse your GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables.",
      "Sign in with Google — calendar access is requested as part of the same consent flow.",
    ],
  },
  {
    provider: "microsoft_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    description: "Sync Microsoft 365 calendar events and availability.",
    authType: "oauth",
    configured: () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    helpUrl: "https://portal.azure.com/",
    helpSteps: [
      "In your Azure app registration, add the Calendars.Read and Calendars.ReadWrite Microsoft Graph permissions.",
      "Reuse your MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET environment variables.",
      "Sign in with Microsoft and grant calendar access when prompted.",
    ],
  },
  {
    provider: "calendly",
    label: "Calendly",
    category: "Calendar",
    description: "Automatically import meetings booked through your Calendly links.",
    authType: "token",
    fields: [{ key: "apiToken", label: "Personal Access Token", secret: true }],
    configured: () => true,
    helpUrl: "https://calendly.com/integrations/api_webhooks",
    helpSteps: [
      "Log in to Calendly and go to Integrations → API & Webhooks.",
      "Click \"Get a token now\" to generate a Personal Access Token.",
      "Copy the token and paste it into the field below, then click Connect.",
      "Booked events will start appearing on your Calendar going forward.",
    ],
  },

  // ---- Messaging ----
  {
    provider: "slack",
    label: "Slack",
    category: "Messaging",
    description: "Surface DMs and mentions that need follow-up alongside your inbox.",
    authType: "token",
    fields: [{ key: "botToken", label: "Bot User OAuth Token", placeholder: "xoxb-...", secret: true }],
    configured: () => true,
    helpUrl: "https://api.slack.com/apps",
    helpSteps: [
      "Go to api.slack.com/apps and click \"Create New App\" → From scratch.",
      "Under OAuth & Permissions, add the channels:history, im:history, and chat:write scopes.",
      "Click \"Install to Workspace\" and approve the permissions.",
      "Copy the \"Bot User OAuth Token\" (starts with xoxb-) and paste it below.",
      "Under Event Subscriptions, enable events and set Request URL to: https://your-app.vercel.app/api/webhooks/slack",
      "Subscribe to bot events: message.im, message.channels, message.groups.",
    ],
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
    helpUrl: "https://developers.facebook.com/apps/",
    helpSteps: [
      "Create a Meta Developer app at developers.facebook.com and add the WhatsApp product.",
      "From the WhatsApp → API Setup page, copy your Phone Number ID.",
      "Generate a temporary or permanent access token from the same page.",
      "Paste both values below and click Connect.",
      "Set your webhook URL in Meta Developer Console to: https://your-app.vercel.app/api/webhooks/whatsapp",
      "Set WHATSAPP_VERIFY_TOKEN env var (default: ai-exec-assistant) to match your webhook verify token.",
    ],
  },
  {
    provider: "telegram",
    label: "Telegram",
    category: "Messaging",
    description: "Chat with your assistant and receive alerts via a Telegram bot.",
    authType: "token",
    fields: [{ key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF...", secret: true }],
    configured: () => true,
    helpUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot",
    helpSteps: [
      "Open Telegram and message @BotFather.",
      "Send /newbot and follow the prompts to name your bot.",
      "BotFather will reply with a token like 123456:ABC-DEF... — copy it.",
      "Paste the token below and click Connect, then message your bot to start receiving alerts.",
      "Set your Telegram webhook by opening: https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhooks/telegram",
    ],
  },
  {
    provider: "microsoft_teams",
    label: "Microsoft Teams",
    category: "Messaging",
    description: "Surface Teams chats and channel mentions that need follow-up.",
    authType: "token",
    fields: [{ key: "webhookUrl", label: "Incoming Webhook URL", secret: true }],
    configured: () => true,
    helpUrl: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
    helpSteps: [
      "In Teams, go to the channel you want to connect → ⋯ → Connectors (or Workflows).",
      "Add an \"Incoming Webhook\" connector and give it a name.",
      "Copy the generated webhook URL.",
      "Paste it below and click Connect.",
    ],
  },
  {
    provider: "discord",
    label: "Discord",
    category: "Messaging",
    description: "Get assistant alerts and respond to mentions in a Discord server.",
    authType: "token",
    fields: [{ key: "botToken", label: "Bot Token", secret: true }],
    configured: () => true,
    helpUrl: "https://discord.com/developers/applications",
    helpSteps: [
      "Go to the Discord Developer Portal and click \"New Application\".",
      "Under Bot, click \"Add Bot\" and copy the bot token.",
      "Enable the \"Message Content\" privileged gateway intent.",
      "Invite the bot to your server using the OAuth2 URL generator (bot scope), then paste the token below.",
    ],
  },
  {
    provider: "linkedin",
    label: "LinkedIn",
    category: "Messaging",
    description: "Track connection requests and messages for relationship intelligence.",
    authType: "oauth",
    configured: () => Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    helpUrl: "https://www.linkedin.com/developers/apps",
    helpSteps: [
      "Create an app at the LinkedIn Developer Portal and verify it with a company page.",
      "Request access to the Sign In with LinkedIn and Messaging API products (subject to LinkedIn review).",
      "Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET as environment variables on your deployment.",
      "Connect from here to start the OAuth authorization flow.",
    ],
  },
  {
    provider: "twilio_sms",
    label: "SMS (Twilio)",
    category: "Messaging",
    description: "Send reminders and follow-ups as text messages via Twilio.",
    authType: "token",
    fields: [
      { key: "accountSid", label: "Account SID" },
      { key: "authToken", label: "Auth Token", secret: true },
      { key: "fromNumber", label: "From Phone Number", placeholder: "+15551234567" },
    ],
    configured: () => true,
    helpUrl: "https://console.twilio.com/",
    helpSteps: [
      "Sign up at twilio.com and verify your account.",
      "From the Console dashboard, copy your Account SID and Auth Token.",
      "Buy or use a trial phone number under Phone Numbers → Manage → Active Numbers.",
      "Enter all three values below and click Connect.",
    ],
  },

  // ---- Productivity ----
  {
    provider: "zoom",
    label: "Zoom",
    category: "Productivity",
    description: "Pull meeting details and recordings into meeting prep and notes.",
    authType: "token",
    fields: [{ key: "apiKey", label: "API Key / JWT", secret: true }],
    configured: () => true,
    helpUrl: "https://marketplace.zoom.us/",
    helpSteps: [
      "Go to the Zoom App Marketplace and create a Server-to-Server OAuth app.",
      "Add the meeting:read and recording:read scopes.",
      "Generate the app's credentials and copy the resulting token.",
      "Paste it below and click Connect.",
    ],
  },
  {
    provider: "notion",
    label: "Notion",
    category: "Productivity",
    description: "Sync notes and tasks with a connected Notion workspace.",
    authType: "token",
    fields: [{ key: "integrationToken", label: "Internal Integration Token", secret: true }],
    configured: () => true,
    helpUrl: "https://www.notion.so/my-integrations",
    helpSteps: [
      "Go to notion.so/my-integrations and click \"New integration\".",
      "Name it, select your workspace, and create it to get an Internal Integration Token (starts with ntn_ or secret_).",
      "Open the Notion page/database you want to sync, click ⋯ → Connections, and add your integration.",
      "Paste the token below and click Connect.",
    ],
  },
  {
    provider: "linear",
    label: "Linear",
    category: "Productivity",
    description: "Pull assigned issues into your Task board.",
    authType: "token",
    fields: [{ key: "apiKey", label: "Personal API Key", secret: true }],
    configured: () => true,
    helpUrl: "https://linear.app/settings/api",
    helpSteps: [
      "In Linear, go to Settings → Account → Security & access → Personal API keys.",
      "Click \"New API key\", give it a label, and copy the generated key.",
      "Paste it below and click Connect — assigned issues will sync into Tasks.",
    ],
  },
  {
    provider: "jira",
    label: "Jira",
    category: "Productivity",
    description: "Bring assigned Jira issues into your Task board.",
    authType: "token",
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yourteam.atlassian.net" },
      { key: "email", label: "Account Email" },
      { key: "apiToken", label: "API Token", secret: true },
    ],
    configured: () => true,
    helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    helpSteps: [
      "Go to id.atlassian.com → Security → Create and manage API tokens.",
      "Click \"Create API token\", name it, and copy the value.",
      "Enter your Jira site URL, the email address of your Atlassian account, and the token below.",
      "Click Connect to start syncing assigned issues as tasks.",
    ],
  },
  {
    provider: "asana",
    label: "Asana",
    category: "Productivity",
    description: "Sync assigned Asana tasks into your Task board.",
    authType: "token",
    fields: [{ key: "personalAccessToken", label: "Personal Access Token", secret: true }],
    configured: () => true,
    helpUrl: "https://app.asana.com/0/my-apps",
    helpSteps: [
      "In Asana, go to your profile settings → Apps → Manage Developer Apps.",
      "Click \"Create new token\", name it, and copy the generated token.",
      "Paste it below and click Connect.",
    ],
  },
  {
    provider: "trello",
    label: "Trello",
    category: "Productivity",
    description: "Sync Trello cards assigned to you into your Task board.",
    authType: "token",
    fields: [
      { key: "apiKey", label: "API Key" },
      { key: "token", label: "Token", secret: true },
    ],
    configured: () => true,
    helpUrl: "https://trello.com/power-ups/admin",
    helpSteps: [
      "Go to trello.com/app-key while logged in to get your API Key.",
      "Use the \"Token\" link on that same page to generate a personal token and approve access.",
      "Enter both the API Key and Token below, then click Connect.",
    ],
  },
  {
    provider: "github",
    label: "GitHub",
    category: "Productivity",
    description: "Surface assigned issues, PR reviews, and CI failures as tasks.",
    authType: "token",
    fields: [{ key: "personalAccessToken", label: "Personal Access Token", placeholder: "ghp_...", secret: true }],
    configured: () => true,
    helpUrl: "https://github.com/settings/tokens",
    helpSteps: [
      "Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.",
      "Generate a new token with read access to Issues, Pull requests, and Actions.",
      "Copy the token (starts with ghp_ or github_pat_) and paste it below.",
      "Click Connect to start surfacing assigned issues and review requests.",
    ],
  },
  {
    provider: "google_drive",
    label: "Google Drive",
    category: "Productivity",
    description: "Surface recently shared documents relevant to upcoming meetings.",
    authType: "oauth",
    configured: () => isGoogleConfigured,
    helpUrl: "https://console.cloud.google.com/apis/credentials",
    helpSteps: [
      "In your Google Cloud project, enable the Google Drive API.",
      "Add the drive.readonly scope to your OAuth consent screen.",
      "Reuse your existing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.",
      "Sign in with Google and grant Drive access when prompted.",
    ],
  },
  {
    provider: "dropbox",
    label: "Dropbox",
    category: "Productivity",
    description: "Link Dropbox files referenced in notes and meeting prep.",
    authType: "token",
    fields: [{ key: "accessToken", label: "Access Token", secret: true }],
    configured: () => true,
    helpUrl: "https://www.dropbox.com/developers/apps",
    helpSteps: [
      "Go to the Dropbox App Console and create a new app (Scoped access, Full Dropbox or App folder).",
      "Under Permissions, enable files.metadata.read and files.content.read, then submit.",
      "Under Settings, click \"Generate access token\".",
      "Paste the token below and click Connect.",
    ],
  },
  {
    provider: "onedrive",
    label: "OneDrive",
    category: "Productivity",
    description: "Link OneDrive/SharePoint files referenced in notes and meeting prep.",
    authType: "oauth",
    configured: () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    helpUrl: "https://portal.azure.com/",
    helpSteps: [
      "In your Azure app registration, add the Files.Read.All Microsoft Graph permission.",
      "Reuse your MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET environment variables.",
      "Sign in with Microsoft and grant file access when prompted.",
    ],
  },

  // ---- Finance ----
  {
    provider: "stripe",
    label: "Stripe",
    category: "Finance",
    description: "Track payments, overdue invoices, and churned subscriptions as tasks.",
    authType: "token",
    fields: [{ key: "secretKey", label: "Secret Key", placeholder: "sk_live_... or sk_test_...", secret: true }],
    configured: () => true,
    helpUrl: "https://dashboard.stripe.com/apikeys",
    helpSteps: [
      "Log in to the Stripe Dashboard and go to Developers → API keys.",
      "Copy your Secret key (use a restricted key with read-only access for safety).",
      "Paste it below and click Connect.",
      "Tip: start with a test-mode key to verify the integration before using your live key.",
    ],
  },
  {
    provider: "quickbooks",
    label: "QuickBooks",
    category: "Finance",
    description: "Track invoice status and expenses for follow-ups and reminders.",
    authType: "oauth",
    configured: () => Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
    helpUrl: "https://developer.intuit.com/app/developer/myapps",
    helpSteps: [
      "Create an app at the Intuit Developer Portal and select the Accounting scope.",
      "Copy the Client ID and Client Secret from the app's Keys & OAuth page.",
      "Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET as environment variables on your deployment.",
      "Connect from here to authorize access to your QuickBooks company.",
    ],
  },
  {
    provider: "xero",
    label: "Xero",
    category: "Finance",
    description: "Track invoice status and expenses for follow-ups and reminders.",
    authType: "oauth",
    configured: () => Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET),
    helpUrl: "https://developer.xero.com/app/manage",
    helpSteps: [
      "Create an app at the Xero Developer Portal with the accounting.transactions.read scope.",
      "Copy the Client ID and generate a Client Secret.",
      "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET as environment variables on your deployment.",
      "Connect from here to authorize access to your Xero organization.",
    ],
  },

  // ---- Knowledge / AI ----
  {
    provider: "confluence",
    label: "Confluence",
    category: "Knowledge",
    description: "Sync Confluence pages relevant to upcoming meetings into Notes.",
    authType: "token",
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yourteam.atlassian.net" },
      { key: "email", label: "Account Email" },
      { key: "apiToken", label: "API Token", secret: true },
    ],
    configured: () => true,
    helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    helpSteps: [
      "Go to id.atlassian.com → Security → Create and manage API tokens.",
      "Click \"Create API token\", name it, and copy the value.",
      "Enter your Confluence site URL, account email, and the token below.",
      "Click Connect to start syncing relevant pages.",
    ],
  },
  {
    provider: "obsidian",
    label: "Obsidian (via sync folder)",
    category: "Knowledge",
    description: "Pull notes from an Obsidian vault synced via cloud storage.",
    authType: "token",
    fields: [{ key: "syncFolderUrl", label: "Synced Vault Folder URL (Drive/Dropbox)", secret: true }],
    configured: () => true,
    helpSteps: [
      "Sync your Obsidian vault folder to Google Drive, Dropbox, or OneDrive using your usual sync setup.",
      "Connect that provider above first so the assistant can read files.",
      "Paste the shared folder link for your vault below and click Connect.",
      "Notes from the vault will appear as read-only entries in your Notes module.",
    ],
  },
  {
    provider: "meeting_transcription",
    label: "Meeting Transcription (Otter/Fireflies/Read.ai)",
    category: "Knowledge",
    description: "Auto-import meeting transcripts into Meeting Notes for AI summarization.",
    authType: "token",
    fields: [{ key: "apiKey", label: "API Key", secret: true }],
    configured: () => true,
    helpUrl: "https://fireflies.ai/integrations",
    helpSteps: [
      "Open your transcription tool's settings (Otter.ai, Fireflies.ai, or Read.ai) and find the Developer/API section.",
      "Generate an API key for your account.",
      "Paste it below and click Connect.",
      "New transcripts will be imported as Meeting Notes after each call.",
    ],
  },
];

export function getConnectionDefinition(provider: string) {
  return connectionRegistry.find((c) => c.provider === provider);
}
