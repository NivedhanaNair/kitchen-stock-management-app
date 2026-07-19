import { NextRequest, NextResponse } from "next/server";
import { createSession, getLocation, listSessions } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listSessions());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.location_id !== "string" || !getLocation(body.location_id)) {
    return NextResponse.json(
      { error: "location_id must reference an existing location" },
      { status: 400 }
    );
  }

  const session = createSession({
    location_id: body.location_id,
    notes: body.notes ?? null,
  });

  return NextResponse.json(session, { status: 201 });
}
