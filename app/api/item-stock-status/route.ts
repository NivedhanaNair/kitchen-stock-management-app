import { NextResponse } from "next/server";
import { computeItemStockStatuses } from "@/lib/store";

/**
 * Per-item low-stock status. Defaults to checking total stock (summed across all
 * locations) against the item's default_reorder_threshold; items with per-location
 * thresholds set are checked per-location instead. Used by Dashboard/Shopping List/Items.
 */
export async function GET() {
  return NextResponse.json(await computeItemStockStatuses());
}
