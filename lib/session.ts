import { auth } from "@/auth";

/** The caller's household id, or null if somehow unauthenticated (middleware should already
 *  have blocked that, but every data-isolation boundary checks again defensively). */
export async function requireHouseholdId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.householdId ?? null;
}

/** The caller's user id, for attribution (created_by). Null if unauthenticated. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
