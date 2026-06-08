import { requireUserId } from "@/lib/auth/session";
import { listEmails, EmailFilter } from "@/services/emailService";
import { EmailInbox } from "./email-inbox";

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const userId = await requireUserId();
  const { filter, q } = await searchParams;
  const activeFilter = (filter as EmailFilter) || "all";

  const emails = await listEmails(userId, activeFilter, q);

  return (
    <EmailInbox
      emails={emails.map((e: (typeof emails)[number]) => ({
        id: e.id,
        fromName: e.fromName,
        fromEmail: e.fromEmail,
        subject: e.subject,
        snippet: e.snippet,
        body: e.body,
        receivedAt: e.receivedAt.toISOString(),
        isUnread: e.isUnread,
        isImportant: e.isImportant,
        isPriority: e.isPriority,
        label: e.label,
        aiSummary: e.aiSummary,
        contactName: e.contact?.name ?? null,
      }))}
      activeFilter={activeFilter}
      query={q ?? ""}
    />
  );
}
