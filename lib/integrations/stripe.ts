import { prisma } from "@/lib/db/prisma";

export interface StripeSyncResult {
  synced: number;
  errors?: string[];
}

async function getStripeKey(userId: string): Promise<string | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "stripe", status: "connected" },
  });
  if (!account?.metadata) return null;
  return (account.metadata as Record<string, string>).secretKey ?? null;
}

async function stripeFetch(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Stripe API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function syncStripeData(userId: string): Promise<StripeSyncResult> {
  const key = await getStripeKey(userId);
  if (!key) return { synced: 0, errors: ["Stripe not connected"] };

  const errors: string[] = [];
  let synced = 0;

  try {
    const invoices = await stripeFetch("/invoices?status=open&limit=20", key);

    for (const inv of invoices.data ?? []) {
      const externalId = `stripe_invoice_${inv.id}`;
      const existing = await prisma.task.findFirst({
        where: { userId, description: { contains: externalId } },
      });
      if (existing) continue;

      const amount = (inv.amount_due / 100).toFixed(2);
      const currency = (inv.currency ?? "usd").toUpperCase();
      const customerEmail = inv.customer_email ?? "Unknown customer";

      await prisma.task.create({
        data: {
          userId,
          title: `[Stripe] Open invoice $${amount} ${currency} — ${customerEmail}`,
          description: `${externalId}\nInvoice: ${inv.hosted_invoice_url ?? inv.id}\nCustomer: ${customerEmail}\nDue: ${inv.due_date ? new Date(inv.due_date * 1000).toLocaleDateString() : "No due date"}`,
          priority: inv.due_date && inv.due_date * 1000 < Date.now() ? "HIGH" : "MEDIUM",
          status: "TODO",
          category: "FINANCE",
          dueDate: inv.due_date ? new Date(inv.due_date * 1000) : null,
        },
      });
      synced++;
    }

    const charges = await stripeFetch("/charges?limit=10", key);
    for (const charge of charges.data ?? []) {
      if (charge.status === "failed" || charge.disputed) {
        const externalId = `stripe_charge_${charge.id}`;
        const existing = await prisma.notification.findFirst({
          where: { userId, message: { contains: externalId } },
        });
        if (existing) continue;

        await prisma.notification.create({
          data: {
            userId,
            type: "important_email",
            title: charge.disputed ? "Stripe: Payment Disputed" : "Stripe: Payment Failed",
            message: `${externalId}\n$${(charge.amount / 100).toFixed(2)} ${(charge.currency ?? "usd").toUpperCase()} from ${charge.billing_details?.email ?? "Unknown"}`,
            link: "/tasks",
          },
        });
        synced++;
      }
    }

    await prisma.integrationAccount.update({
      where: { userId_provider: { userId, provider: "stripe" } },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Stripe API error");
  }

  return { synced, errors: errors.length > 0 ? errors : undefined };
}
