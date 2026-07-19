import { NextRequest, NextResponse } from "next/server";
import { deleteCategory } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteCategory(id);
  if (!deleted) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
