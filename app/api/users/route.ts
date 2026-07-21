import { NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { listUsers } from "@/lib/store";

/** Names of your own household's members — used to show who logged a stock count. Never leaks another household's members. */
export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listUsers(householdId));
}
