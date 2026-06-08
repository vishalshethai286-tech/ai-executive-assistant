"use server";

import { requireUserId } from "@/lib/auth/session";
import { executeCommand } from "@/services/commandService";
import { commandSchema } from "@/lib/validators";
import { prisma } from "@/lib/db/prisma";

export async function runCommand(rawCommand: string) {
  const parsed = commandSchema.safeParse({ command: rawCommand });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid command" };

  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });

  try {
    const response = await executeCommand(userId, parsed.data.command, (user?.aiProvider as never) ?? "mock");
    return { ok: true as const, ...response };
  } catch {
    return { ok: false as const, error: "Something went wrong processing that command." };
  }
}

/** Used by the topbar quick-command input. */
export async function runQuickCommand(rawCommand: string) {
  const result = await runCommand(rawCommand);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, message: result.message };
}

export async function listCommandHistory() {
  const userId = await requireUserId();
  return prisma.commandLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}
