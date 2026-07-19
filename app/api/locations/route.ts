import { NextRequest, NextResponse } from "next/server";
import { createLocation, listLocations } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listLocations());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const location = createLocation({
    name: body.name,
    is_active: body.is_active,
  });

  return NextResponse.json(location, { status: 201 });
}
