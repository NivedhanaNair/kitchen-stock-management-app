import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import {
  deleteItemLocation,
  getItem,
  getLocation,
  listItemLocations,
  upsertItemLocation,
} from "@/lib/store";

export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listItemLocations(householdId));
}

export async function POST(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (typeof body.item_id !== "string" || !(await getItem(body.item_id, householdId))) {
    return NextResponse.json({ error: "item_id must reference an existing item" }, { status: 400 });
  }
  if (typeof body.location_id !== "string" || !(await getLocation(body.location_id, householdId))) {
    return NextResponse.json(
      { error: "location_id must reference an existing location" },
      { status: 400 }
    );
  }
  if (typeof body.reorder_threshold !== "number" || Number.isNaN(body.reorder_threshold)) {
    return NextResponse.json({ error: "reorder_threshold must be a number" }, { status: 400 });
  }

  const itemLocation = await upsertItemLocation(householdId, {
    item_id: body.item_id,
    location_id: body.location_id,
    reorder_threshold: body.reorder_threshold,
  });

  return NextResponse.json(itemLocation, { status: 201 });
}

/** Unsets a threshold for an item/location pair. Query params: item_id, location_id. */
export async function DELETE(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = request.nextUrl.searchParams.get("item_id");
  const locationId = request.nextUrl.searchParams.get("location_id");

  if (!itemId || !locationId) {
    return NextResponse.json(
      { error: "item_id and location_id query params are required" },
      { status: 400 }
    );
  }

  const deleted = await deleteItemLocation(householdId, itemId, locationId);
  if (!deleted) {
    return NextResponse.json({ error: "No threshold set for that pair" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
