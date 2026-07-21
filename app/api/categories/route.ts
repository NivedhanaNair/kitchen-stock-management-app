import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { createCategory, listCategories } from "@/lib/store";

export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listCategories(householdId));
}

export async function POST(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = await createCategory(householdId, body.name);
  return NextResponse.json(category, { status: 201 });
}
