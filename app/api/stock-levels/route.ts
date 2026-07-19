import { NextResponse } from "next/server";
import { computeStockLevels } from "@/lib/store";

/** Latest counted quantity per item/location plus the effective reorder threshold. Not part of the core CRUD resources — this is a derived read used by the Dashboard/Alerts views. */
export async function GET() {
  return NextResponse.json(computeStockLevels());
}
