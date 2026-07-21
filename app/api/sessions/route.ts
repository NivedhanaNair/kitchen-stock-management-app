import { NextRequest, NextResponse } from "next/server";
import { currentUserId, requireHouseholdId } from "@/lib/session";
import { createSession, getLocation, listSessions } from "@/lib/store";

export async function GET() {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listSessions(householdId));
}

/** location_id may be omitted/null to start a session that sweeps all locations. */
export async function POST(request: NextRequest) {
  const householdId = await requireHouseholdId();
  if (!householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (body.location_id != null) {
    if (typeof body.location_id !== "string" || !(await getLocation(body.location_id, householdId))) {
      return NextResponse.json(
        { error: "location_id must reference an existing location" },
        { status: 400 }
      );
    }
  }

  const userId = await currentUserId();

  const session = await createSession(householdId, {
    location_id: body.location_id ?? null,
    notes: body.notes ?? null,
    created_by: userId,
  });

  return NextResponse.json(session, { status: 201 });
}
