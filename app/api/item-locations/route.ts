import { NextRequest, NextResponse } from "next/server";
import { getItem, getLocation, listItemLocations, upsertItemLocation } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listItemLocations());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.item_id !== "string" || !getItem(body.item_id)) {
    return NextResponse.json({ error: "item_id must reference an existing item" }, { status: 400 });
  }
  if (typeof body.location_id !== "string" || !getLocation(body.location_id)) {
    return NextResponse.json(
      { error: "location_id must reference an existing location" },
      { status: 400 }
    );
  }
  if (typeof body.reorder_threshold !== "number" || Number.isNaN(body.reorder_threshold)) {
    return NextResponse.json({ error: "reorder_threshold must be a number" }, { status: 400 });
  }

  const itemLocation = upsertItemLocation({
    item_id: body.item_id,
    location_id: body.location_id,
    reorder_threshold: body.reorder_threshold,
  });

  return NextResponse.json(itemLocation, { status: 201 });
}
