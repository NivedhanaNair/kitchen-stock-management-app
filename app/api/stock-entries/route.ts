import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createStockEntry,
  getItem,
  getLocation,
  getSession,
  listStockEntries,
} from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("stock_take_session_id");
  const entries = await listStockEntries();
  if (sessionId) {
    return NextResponse.json(entries.filter((e) => e.stock_take_session_id === sessionId));
  }
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.item_id !== "string" || !(await getItem(body.item_id))) {
    return NextResponse.json({ error: "item_id must reference an existing item" }, { status: 400 });
  }
  if (typeof body.location_id !== "string" || !(await getLocation(body.location_id))) {
    return NextResponse.json(
      { error: "location_id must reference an existing location" },
      { status: 400 }
    );
  }
  if (typeof body.quantity !== "number" || Number.isNaN(body.quantity) || body.quantity < 0) {
    return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 });
  }
  if (typeof body.unit !== "string" || body.unit.trim() === "") {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }
  if (body.stock_take_session_id && !(await getSession(body.stock_take_session_id))) {
    return NextResponse.json({ error: "stock_take_session_id does not exist" }, { status: 400 });
  }

  const session = await auth();

  const entry = await createStockEntry({
    item_id: body.item_id,
    location_id: body.location_id,
    quantity: body.quantity,
    unit: body.unit,
    counted_at: body.counted_at,
    stock_take_session_id: body.stock_take_session_id ?? null,
    created_by: session?.user?.id ?? null,
  });

  return NextResponse.json(entry, { status: 201 });
}