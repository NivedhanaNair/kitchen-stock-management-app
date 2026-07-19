import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listCategories());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = createCategory(body.name);
  return NextResponse.json(category, { status: 201 });
}
