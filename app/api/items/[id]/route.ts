import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem } from "@/lib/store";

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
  if (
    body.default_reorder_threshold !== undefined &&
    (typeof body.default_reorder_threshold !== "number" || Number.isNaN(body.default_reorder_threshold))
  ) {
    return NextResponse.json(
      { error: "default_reorder_threshold must be a number" },
      { status: 400 }
    );
  }

  const item = updateItem(id, {
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
