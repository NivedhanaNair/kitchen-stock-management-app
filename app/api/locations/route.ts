import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { createLocation, listLocations } from "@/lib/store";

export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listLocations(householdId));
}

export async function POST(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const location = await createLocation(householdId, {
    name: body.name,
    is_active: body.is_active,
  });

  return NextResponse.json(location, { status: 201 });
}
