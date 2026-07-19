import { NextRequest, NextResponse } from "next/server";
import { createSession, getLocation, listSessions } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listSessions());
}

/** location_id may be omitted/null to start a session that sweeps all locations. */
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.location_id != null) {
    if (typeof body.location_id !== "string" || !(await getLocation(body.location_id))) {
      return NextResponse.json(
        { error: "location_id must reference an existing location" },
        { status: 400 }
      );
    }
  }

  const session = await createSession({
    location_id: body.location_id ?? null,
    notes: body.notes ?? null,
  });

  return NextResponse.json(session, { status: 201 });
}
