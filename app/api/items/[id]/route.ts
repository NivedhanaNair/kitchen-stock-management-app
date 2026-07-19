import { NextRequest, NextResponse } from "next/server";
import { deleteItem, getItem, updateItem } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }

  const item = updateItem(id, {
    name: body.name,
    category: body.category,
    unit: body.unit,
    preferred_brand: body.preferred_brand,
    notes: body.notes,
    is_active: body.is_active,
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = deleteItem(id);
  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
