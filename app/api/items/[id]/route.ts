import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { deleteItem, getItem, updateItem } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await getItem(id, householdId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
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

  const item = await updateItem(id, householdId, {
    name: body.name,
    category: body.category,
    unit: body.unit,
    preferred_brand: body.preferred_brand,
    notes: body.notes,
    is_active: body.is_active,
    default_reorder_threshold: body.default_reorder_threshold,
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteItem(id, householdId);
  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
