import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getSmtpFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

async function getSmtpFromConnection(userId: string): Promise<SmtpConfig | null> {
  const account = await prisma.integrationAccount.findFirst({
    where: { userId, provider: "smtp_email", status: "connected" },
  });
  if (!account || !account.metadata) return null;
  const meta = account.metadata as Record<string, string>;
  if (!meta.host || !meta.user || !meta.pass) return null;
  return {
    host: meta.host,
    port: parseInt(meta.port || "587", 10),
    user: meta.user,
    pass: meta.pass,
    from: meta.from || meta.user,
  };
}

export async function getSmtpConfig(userId: string): Promise<SmtpConfig | null> {
  const fromConnection = await getSmtpFromConnection(userId);
  if (fromConnection) return fromConnection;
  return getSmtpFromEnv();
}

export async function isEmailSendingConfigured(userId: string): Promise<boolean> {
  const config = await getSmtpConfig(userId);
  return config !== null;
}

export async function sendEmail(userId: string, input: SendEmailInput) {
  const config = await getSmtpConfig(userId);
  if (!config) {
    throw new Error("Email sending is not configured. Add SMTP credentials in Connections or set SMTP_HOST/SMTP_USER/SMTP_PASS environment variables.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const result = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  return { messageId: result.messageId, accepted: result.accepted };
}
