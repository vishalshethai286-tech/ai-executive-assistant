import { auth } from "./auth";

/** Returns the current user's id, throwing if unauthenticated (use in server actions/pages behind the (app) layout). */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
