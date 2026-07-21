import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { createItem, listItems } from "@/lib/store";

export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listItems(householdId));
}

export async function POST(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof body.category !== "string" || body.category.trim() === "") {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (typeof body.unit !== "string" || body.unit.trim() === "") {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }
  if (
    body.default_reorder_threshold != null &&
    (typeof body.default_reorder_threshold !== "number" || Number.isNaN(body.default_reorder_threshold))
  ) {
    return NextResponse.json(
      { error: "default_reorder_threshold must be a number" },
      { status: 400 }
    );
  }

  const item = await createItem(householdId, {
    name: body.name,
    category: body.category,
    unit: body.unit,
    preferred_brand: body.preferred_brand ?? null,
    notes: body.notes ?? null,
    is_active: body.is_active,
    default_reorder_threshold: body.default_reorder_threshold ?? null,
  });

  return NextResponse.json(item, { status: 201 });
}
