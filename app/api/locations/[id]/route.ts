import { NextRequest, NextResponse } from "next/server";
import { requireHouseholdId } from "@/lib/session";
import { deleteLocation, getLocation, updateLocation } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await getLocation(id, householdId);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json(location);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }

  const location = await updateLocation(id, householdId, {
    name: body.name,
    is_active: body.is_active,
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(location);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteLocation(id, householdId);
  if (!deleted) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
