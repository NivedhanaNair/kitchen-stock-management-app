import { NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { computeStockLevels } from "@/lib/store";

/** Latest counted quantity per item/location plus the effective reorder threshold. Not part of the core CRUD resources — this is a derived read used by the Dashboard/Alerts views. */
export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await computeStockLevels(householdId));
}
