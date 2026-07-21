import { NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { computeItemStockStatuses } from "@/lib/store";

/**
 * Per-item low-stock status. Defaults to checking total stock (summed across all
 * locations) against the item's default_reorder_threshold; items with per-location
 * thresholds set are checked per-location instead. Used by Dashboard/Shopping List/Items.
 */
export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await computeItemStockStatuses(householdId));
}
