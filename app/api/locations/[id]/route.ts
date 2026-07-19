import { NextRequest, NextResponse } from "next/server";
import { deleteLocation, getLocation, updateLocation } from "@/lib/store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const location = getLocation(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json(location);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }

  const location = updateLocation(id, {
    name: body.name,
    is_active: body.is_active,
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(location);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = deleteLocation(id);
  if (!deleted) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
