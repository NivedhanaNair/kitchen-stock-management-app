import { NextRequest, NextResponse } from "next/server";
import { createItem, listItems } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listItems());
}

export async function POST(request: NextRequest) {
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
    typeof body.default_reorder_threshold !== "number" ||
    Number.isNaN(body.default_reorder_threshold)
  ) {
    return NextResponse.json(
      { error: "default_reorder_threshold must be a number" },
      { status: 400 }
    );
  }

  const item = createItem({
    name: body.name,
    category: body.category,
    unit: body.unit,
    preferred_brand: body.preferred_brand ?? null,
    notes: body.notes ?? null,
    is_active: body.is_active,
    default_reorder_threshold: body.default_reorder_threshold,
  });

  return NextResponse.json(item, { status: 201 });
}
