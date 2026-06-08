"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(200),
  name: z.string().trim().max(200).optional(),
});

/**
 * Demo-friendly "register or login" — creates the account on first sign-in so
 * the user doesn't need a separate registration step. Real deployments should
 * gate this behind a proper signup flow.
 */
export async function ensureUserAccount(input: { email: string; password: string; name?: string }) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email and a password (6+ characters)." };

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (!existing.password) return { ok: false as const, error: "This account uses Google sign-in." };
    const valid = await bcrypt.compare(password, existing.password);
    if (!valid) return { ok: false as const, error: "Incorrect password." };
    return { ok: true as const };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hashed, name: name || email.split("@")[0] },
  });
  return { ok: true as const };
}
